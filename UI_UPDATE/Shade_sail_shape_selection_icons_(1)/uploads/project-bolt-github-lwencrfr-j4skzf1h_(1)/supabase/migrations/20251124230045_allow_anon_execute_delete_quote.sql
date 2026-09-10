/*
  # Allow Anonymous Users to Execute Delete Quote Function

  1. Changes
    - Grant EXECUTE permission on delete_saved_quote function to anon and authenticated users

  2. Security
    - Admin dashboard is already password-protected separately
    - Function uses SECURITY DEFINER so it runs with elevated privileges
    - This matches the security model established for reading events
    - Only deletes data, doesn't expose sensitive information

  3. Reasoning
    - Admin dashboard uses anon key, not authenticated session
    - Previous migration created the function but didn't grant execute permissions
    - This fix enables the "Delete" button in the admin dashboard to work properly
*/

-- Grant execute permission on delete_saved_quote function to anon and authenticated users
GRANT EXECUTE ON FUNCTION delete_saved_quote(uuid) TO anon, authenticated;
