/*
  # Add bidirectional sync between auth.users and admin_users

  1. New Trigger
    - `sync_admin_on_auth_delete`: When a user is deleted from auth.users,
      automatically removes the corresponding admin_users row
  2. Security
    - Function runs as SECURITY DEFINER to bypass RLS
    - Only fires on DELETE of auth.users
  3. Notes
    - This ensures that deleting a user from the Supabase Auth dashboard
      also removes their admin panel access
    - The reverse direction (admin panel delete -> auth.users) is already
      handled by the admin-delete Edge Function
*/

CREATE OR REPLACE FUNCTION sync_admin_on_auth_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM admin_users WHERE auth_user_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_on_auth_delete ON auth.users;
CREATE TRIGGER trg_sync_admin_on_auth_delete
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_on_auth_user_delete();
