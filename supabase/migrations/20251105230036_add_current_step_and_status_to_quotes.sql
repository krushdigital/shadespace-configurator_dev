/*
  # Add current_step and improve status tracking for saved quotes

  1. Changes
    - Add `current_step` column to track which step user was on when saving
    - Add `total_steps` column to track total steps in configuration
    - Add new status values: 'in_progress', 'quote_ready'
    - Update existing status column to support more granular tracking
  
  2. Purpose
    - Enable users to resume exactly where they left off
    - Distinguish between incomplete configurations and complete quotes
    - Provide better progress tracking and user experience
  
  3. Migration Notes
    - Safe to run on existing data
    - Existing quotes will have NULL current_step (can be inferred from status)
    - Status 'saved' maps to either 'in_progress' or 'quote_ready' based on completion
*/

-- Add current_step column to track user's position in configurator
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'current_step'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN current_step INTEGER DEFAULT NULL;
  END IF;
END $$;

-- Add total_steps column to track how many steps the configuration has
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'total_steps'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN total_steps INTEGER DEFAULT 7;
  END IF;
END $$;

-- Add comment to explain the columns
COMMENT ON COLUMN saved_quotes.current_step IS 'The step index (0-6) where user was when saving. NULL means unknown/legacy data.';
COMMENT ON COLUMN saved_quotes.total_steps IS 'Total number of steps in the configuration flow. Typically 7 (or 6 if step skipped).';

-- Update status column to support new values (if using a check constraint)
-- Note: We keep backward compatibility with existing 'saved', 'completed', 'expired' values
-- New values: 'in_progress' (incomplete config), 'quote_ready' (complete but not purchased)
DO $$
BEGIN
  -- Check if the constraint exists and update it
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'saved_quotes' AND constraint_name LIKE '%status%'
  ) THEN
    -- Drop old constraint if it exists
    ALTER TABLE saved_quotes DROP CONSTRAINT IF EXISTS saved_quotes_status_check;
  END IF;
  
  -- Add new constraint with expanded status values
  ALTER TABLE saved_quotes ADD CONSTRAINT saved_quotes_status_check 
    CHECK (status IN ('saved', 'in_progress', 'quote_ready', 'completed', 'expired'));
END $$;

-- Create index on current_step for potential filtering/reporting
CREATE INDEX IF NOT EXISTS idx_saved_quotes_current_step ON saved_quotes(current_step);

-- Create index on status for efficient status-based queries
CREATE INDEX IF NOT EXISTS idx_saved_quotes_status ON saved_quotes(status);
