/*
  # Add Progress Tracking Fields to saved_quotes

  1. Changes to saved_quotes table
    - Add `current_step` field (integer) to track which step user was on when they saved
    - Add `completion_percentage` field (integer) to show overall progress
    - Add `last_modified_step` field (integer) to track last edited step
    - Update `status` field to support new values: 'in_progress', 'quote_ready', 'completed', 'expired'

  2. Purpose
    - Enable users to save progress at any step, not just completed quotes
    - Allow system to resume users at the exact step they left off
    - Distinguish between "saving progress" (incomplete) and "saving quote" (complete)
    - Provide better UX with progress indicators and welcome back messages

  3. Notes
    - current_step: 0-5 (Step 1 = 0, Step 6/Review = 5)
    - completion_percentage: 0-100 calculated as (current_step + 1) / 6 * 100
    - in_progress: Steps 1-5 (incomplete configuration)
    - quote_ready: Step 6/Review (all steps complete, ready for purchase)
    - completed: Quote converted to cart/order
    - expired: Quote past 30-day expiration
*/

-- Add new fields to saved_quotes table
DO $$
BEGIN
  -- Add current_step field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'current_step'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN current_step integer DEFAULT 0;
  END IF;

  -- Add completion_percentage field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'completion_percentage'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN completion_percentage integer DEFAULT 0;
  END IF;

  -- Add last_modified_step field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'last_modified_step'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN last_modified_step integer DEFAULT 0;
  END IF;
END $$;

-- Update existing 'saved' status to 'in_progress' for backward compatibility
UPDATE saved_quotes 
SET status = 'in_progress' 
WHERE status = 'saved';

-- Drop existing status constraint
ALTER TABLE saved_quotes DROP CONSTRAINT IF EXISTS saved_quotes_status_check;

-- Add new status constraint with updated values
ALTER TABLE saved_quotes 
  ADD CONSTRAINT saved_quotes_status_check 
  CHECK (status IN ('in_progress', 'quote_ready', 'completed', 'expired'));

-- Create index on current_step for efficient queries
CREATE INDEX IF NOT EXISTS idx_saved_quotes_current_step ON saved_quotes(current_step);
