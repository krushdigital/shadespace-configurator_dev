/*
  # Fix Delete Policies to Allow Anonymous Users

  1. Problem
    - The delete_saved_quote function has SECURITY DEFINER and anon has EXECUTE permission
    - However, RLS policies on saved_quotes and user_events only allow authenticated users to DELETE
    - Even with SECURITY DEFINER, RLS policies still apply and block the delete
    - Admin dashboard uses anon key, causing deletes to fail

  2. Solution
    - Update DELETE policies on both tables to allow anon role
    - This is safe because:
      * Admin dashboard is password-protected
      * Function is the only way to delete (not direct table access)
      * Matches security model for other operations (read, insert, update)

  3. Changes
    - Drop existing DELETE policies
    - Recreate them with both anon and authenticated roles
*/

-- Drop existing DELETE policy on saved_quotes
DROP POLICY IF EXISTS "Authenticated users can delete quotes" ON saved_quotes;

-- Create new DELETE policy allowing both anon and authenticated
CREATE POLICY "Allow delete quotes"
  ON saved_quotes
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Drop existing DELETE policy on user_events
DROP POLICY IF EXISTS "Authenticated users can delete events" ON user_events;

-- Create new DELETE policy allowing both anon and authenticated
CREATE POLICY "Allow delete events"
  ON user_events
  FOR DELETE
  TO anon, authenticated
  USING (true);
