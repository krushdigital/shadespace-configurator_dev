/*
  # Non-Expiring Quote Links with 30-Day Price Lock

  1. Changes to `saved_quotes`
    - Add `pricing_locked_until` (timestamptz) - date until which the saved pricing snapshot is used
    - Remove `expires_at` expiry behavior - set all existing quotes to NULL so links never expire
    - Populate `pricing_locked_until` for existing quotes based on their `created_at + 30 days`

  2. Behavior
    - Quote links now work forever (no expiry)
    - Pricing is locked for 30 days from creation (uses saved snapshot)
    - After 30 days, live pricing is used instead
    - `expires_at` column is kept for backward compatibility but set to NULL

  3. Important Notes
    - All existing quotes are retroactively made permanently accessible
    - Existing quotes get `pricing_locked_until` set to `created_at + 30 days`
    - New quotes will default `pricing_locked_until` to `now() + 30 days`
    - `expires_at` default is changed to NULL for new quotes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'pricing_locked_until'
  ) THEN
    ALTER TABLE public.saved_quotes
      ADD COLUMN pricing_locked_until timestamptz DEFAULT (now() + interval '30 days');
  END IF;
END $$;

UPDATE public.saved_quotes
SET pricing_locked_until = created_at + interval '30 days'
WHERE pricing_locked_until IS NULL OR pricing_locked_until = expires_at;

UPDATE public.saved_quotes
SET expires_at = NULL
WHERE expires_at IS NOT NULL;

ALTER TABLE public.saved_quotes
  ALTER COLUMN expires_at SET DEFAULT NULL;
