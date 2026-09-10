/*
  # Add checkout_pending Status to Saved Quotes

  1. Modified Tables
    - `saved_quotes`
      - Update status check constraint to include 'checkout_pending' as a valid value

  2. Purpose
    - When a customer adds to cart without first saving their quote, an auto-created
      row is inserted with status 'checkout_pending'.
    - This status prevents email automations from targeting the row (automations only
      target quote_ready / completed / in_progress statuses).
    - Once the Shopify order webhook fires, status transitions to 'purchased' and the
      customer's name/email is backfilled from the shipping address.

  3. Notes
    - Existing quotes are not affected
    - Email automations naturally ignore these rows because:
      (a) customer_email is NULL at creation time (automation query excludes null emails)
      (b) No automation trigger_config targets 'checkout_pending' status
*/

ALTER TABLE saved_quotes DROP CONSTRAINT IF EXISTS saved_quotes_status_check;
ALTER TABLE saved_quotes ADD CONSTRAINT saved_quotes_status_check
  CHECK (status = ANY (ARRAY[
    'in_progress'::text,
    'quote_ready'::text,
    'completed'::text,
    'expired'::text,
    'purchased'::text,
    'checkout_pending'::text
  ]));
