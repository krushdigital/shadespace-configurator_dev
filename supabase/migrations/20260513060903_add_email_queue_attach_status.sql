/*
  # Add attach_status column to email_queue

  1. Changes
    - Adds `attach_status` text column to `email_queue` to record diagnostic
      information about PDF attachment outcome on successful sends, separating
      it from the `error` column which is reserved for actual delivery errors.

  2. Notes
    - Nullable; only populated when send-email evaluates the auto-PDF path.
    - Read-only for clients; written by the send-email edge function.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_queue' AND column_name = 'attach_status'
  ) THEN
    ALTER TABLE email_queue ADD COLUMN attach_status text;
  END IF;
END $$;
