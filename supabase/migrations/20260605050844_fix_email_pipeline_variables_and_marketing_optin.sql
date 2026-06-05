/*
  Fix email pipeline:
  1. Add first_name column to email_senders for {{sender_first_name}} substitution
  2. Change marketing_opt_in default to false so only explicit opt-ins get marketing emails
  3. Reset marketing_opt_in to false for quotes that were never explicitly saved by the user
     (old quotes that just got the default true value)
*/

-- 1. Add first_name to email_senders
ALTER TABLE email_senders ADD COLUMN IF NOT EXISTS first_name text;

-- Set existing sender's first name
UPDATE email_senders
SET first_name = 'Alex'
WHERE id = 'b405a9a6-e560-4b02-9396-5fb7bd785883' AND first_name IS NULL;

-- 2. Change marketing_opt_in default to false
ALTER TABLE saved_quotes ALTER COLUMN marketing_opt_in SET DEFAULT false;

-- 3. Reset marketing_opt_in for old quotes created before the email system existed (pre-2026-05-08)
-- These quotes never had a real opt-in - they just got the default true value
UPDATE saved_quotes
SET marketing_opt_in = false
WHERE created_at < '2026-05-08'
  AND marketing_opt_in = true;
