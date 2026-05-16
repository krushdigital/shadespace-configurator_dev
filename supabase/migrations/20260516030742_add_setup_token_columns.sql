/*
  # Add password setup token columns to admin_users

  1. Changes
    - `setup_token` (text) - one-time token for password setup
    - `setup_token_expires_at` (timestamptz) - expiry for the token (72h from invite)

  2. Notes
    - Used by team_member role to set their password on first visit
    - Token is cleared once password is set
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'setup_token'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN setup_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'setup_token_expires_at'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN setup_token_expires_at timestamptz;
  END IF;
END $$;
