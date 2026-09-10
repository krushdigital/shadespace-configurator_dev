/*
  # Add Quote Deletion Function

  1. New Functions
    - `delete_saved_quote` - Safely deletes a saved quote and its associated events
      - Takes quote_id as parameter
      - Deletes associated user_events first (foreign key constraint)
      - Then deletes the saved_quote record
      - Returns success boolean

  2. Security
    - Add RLS policy to allow authenticated users to delete quotes
    - Only admins should be able to delete quotes in production

  3. Important Notes
    - Deletes are cascading to maintain data integrity
    - Associated events are removed first to avoid foreign key violations
    - This is a hard delete, not a soft delete
    - Consider adding audit logging in production
*/

-- Add RLS policy for deleting quotes (authenticated users only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'saved_quotes'
    AND policyname = 'Authenticated users can delete quotes'
  ) THEN
    CREATE POLICY "Authenticated users can delete quotes"
      ON saved_quotes
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Add RLS policy for deleting events (authenticated users only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_events'
    AND policyname = 'Authenticated users can delete events'
  ) THEN
    CREATE POLICY "Authenticated users can delete events"
      ON user_events
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Function to delete a saved quote and its associated events
CREATE OR REPLACE FUNCTION delete_saved_quote(
  p_quote_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- First, delete associated events
  DELETE FROM user_events
  WHERE quote_id = p_quote_id;

  -- Then, delete the quote
  DELETE FROM saved_quotes
  WHERE id = p_quote_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Return true if a row was deleted, false otherwise
  RETURN deleted_count > 0;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION delete_saved_quote IS 'Safely deletes a saved quote and all its associated events';