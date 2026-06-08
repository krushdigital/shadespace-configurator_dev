/*
# Backfill Existing Quotes into Threads

## Purpose
Assigns all existing saved_quotes to quote_threads based on grouping logic:
- Same email + same customer_reference = same thread
- Same email + no reference + same corner count + within 7 days = same thread
- Different conditions = separate threads
- Quotes with no email get solo threads

## Logic
1. Group quotes with customer_reference by (email, reference)
2. Group remaining quotes by (email, corner count, 7-day time windows)
3. Within each thread, mark the "best" quote as primary based on status rank and recency
4. Update thread-level cached fields

## Status Priority (for selecting primary)
purchased > quote_ready > completed > checkout_pending > in_progress > expired
*/

DO $$
DECLARE
  rec RECORD;
  thread_id uuid;
  primary_id uuid;
  primary_status text;
  primary_value numeric;
  primary_currency text;
  q_count integer;
BEGIN
  -- Step 1: Group quotes that have both email AND customer_reference
  FOR rec IN
    SELECT DISTINCT lower(customer_email) AS email, customer_reference
    FROM saved_quotes
    WHERE customer_email IS NOT NULL
      AND customer_reference IS NOT NULL
      AND quote_thread_id IS NULL
  LOOP
    thread_id := gen_random_uuid();

    INSERT INTO quote_threads (id, customer_email, customer_reference, created_at, updated_at)
    VALUES (thread_id, rec.email, rec.customer_reference, now(), now());

    UPDATE saved_quotes
    SET quote_thread_id = thread_id, is_thread_primary = false
    WHERE lower(customer_email) = rec.email
      AND customer_reference = rec.customer_reference
      AND quote_thread_id IS NULL;
  END LOOP;

  -- Step 2: Group remaining quotes (no customer_reference) by email + corners + 7-day window
  -- We iterate each email and group sequentially by time proximity and corner count
  FOR rec IN
    SELECT DISTINCT lower(customer_email) AS email
    FROM saved_quotes
    WHERE customer_email IS NOT NULL
      AND quote_thread_id IS NULL
  LOOP
    DECLARE
      q RECORD;
      current_thread_id uuid := NULL;
      last_created_at timestamptz := NULL;
      last_corners integer := NULL;
    BEGIN
      FOR q IN
        SELECT id, created_at, (config_data->>'corners')::integer AS corners
        FROM saved_quotes
        WHERE lower(customer_email) = rec.email
          AND quote_thread_id IS NULL
        ORDER BY created_at ASC
      LOOP
        -- Start new thread if: first quote, different corners, or > 7 day gap
        IF current_thread_id IS NULL
          OR q.corners IS DISTINCT FROM last_corners
          OR (q.created_at - last_created_at) > interval '7 days'
        THEN
          current_thread_id := gen_random_uuid();
          INSERT INTO quote_threads (id, customer_email, created_at, updated_at)
          VALUES (current_thread_id, rec.email, now(), now());
        END IF;

        UPDATE saved_quotes
        SET quote_thread_id = current_thread_id, is_thread_primary = false
        WHERE id = q.id;

        last_created_at := q.created_at;
        last_corners := q.corners;
      END LOOP;
    END;
  END LOOP;

  -- Step 3: Create solo threads for quotes with no email
  FOR rec IN
    SELECT id
    FROM saved_quotes
    WHERE customer_email IS NULL
      AND quote_thread_id IS NULL
  LOOP
    thread_id := gen_random_uuid();

    INSERT INTO quote_threads (id, customer_email, created_at, updated_at)
    VALUES (thread_id, '', now(), now());

    UPDATE saved_quotes
    SET quote_thread_id = thread_id, is_thread_primary = true
    WHERE id = rec.id;
  END LOOP;

  -- Step 4: Set primary quote in each thread (highest status rank, then most recent)
  FOR rec IN
    SELECT id FROM quote_threads
  LOOP
    SELECT sq.id, sq.status,
      COALESCE(sq.locked_total, (sq.calculations_data->>'totalPrice')::numeric) AS val,
      COALESCE(sq.locked_total_currency, sq.config_data->>'currency') AS curr
    INTO primary_id, primary_status, primary_value, primary_currency
    FROM saved_quotes sq
    WHERE sq.quote_thread_id = rec.id
    ORDER BY
      CASE sq.status
        WHEN 'purchased' THEN 1
        WHEN 'quote_ready' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'checkout_pending' THEN 4
        WHEN 'in_progress' THEN 5
        ELSE 6
      END ASC,
      sq.updated_at DESC NULLS LAST,
      sq.created_at DESC
    LIMIT 1;

    IF primary_id IS NOT NULL THEN
      UPDATE saved_quotes
      SET is_thread_primary = true
      WHERE id = primary_id;

      SELECT count(*) INTO q_count
      FROM saved_quotes WHERE quote_thread_id = rec.id;

      UPDATE quote_threads
      SET primary_quote_id = primary_id,
          status = primary_status,
          latest_value = primary_value,
          latest_currency = primary_currency,
          quote_count = q_count,
          updated_at = now()
      WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;
