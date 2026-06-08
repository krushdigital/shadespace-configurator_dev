/*
  Fix quote_threads.created_at timestamps.
  
  The backfill migration used now() for thread created_at instead of
  copying from the primary quote's created_at. This caused ALL threads
  to appear as created on 2026-06-08, breaking date-range filtering
  in analytics.
*/
UPDATE quote_threads qt
SET created_at = sq.created_at
FROM saved_quotes sq
WHERE sq.id = qt.primary_quote_id;
