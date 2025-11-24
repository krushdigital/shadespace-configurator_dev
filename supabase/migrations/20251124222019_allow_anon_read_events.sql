/*
  # Allow Anonymous Access to User Events

  1. Changes
    - Drop restrictive "Authenticated users can read all events" policy
    - Create new policy allowing both anon and authenticated users to read events

  2. Security
    - Events table contains non-sensitive analytics data
    - Admin dashboard has separate password protection
    - This matches the security model of other tables (saved_quotes)
    - Anon users can already INSERT events, now they can also READ them

  3. Reasoning
    - Admin dashboard uses anon key, not authenticated session
    - Previous policy blocked all event queries from admin dashboard
    - This fix enables the "User Events" tab to display data
*/

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Authenticated users can read all events" ON user_events;

-- Create new policy allowing both anonymous and authenticated users to read events
CREATE POLICY "Anyone can read events"
  ON user_events
  FOR SELECT
  TO anon, authenticated
  USING (true);
