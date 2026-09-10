/*
  # Fix delete_saved_quote function

  1. Problem
    - Function references `screenshot_3d` table which does not exist
    - This causes all admin quote deletions to fail

  2. Changes
    - Recreate `delete_saved_quote` without the `screenshot_3d` reference
    - Keep SECURITY DEFINER and search_path settings
    - Keep jsonb return type with success/error info

  3. Security
    - SECURITY DEFINER preserved so function bypasses RLS internally
    - search_path locked to 'public', 'pg_temp'
    - EXECUTE granted to anon and authenticated
*/

CREATE OR REPLACE FUNCTION public.delete_saved_quote(p_quote_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_events_deleted integer;
BEGIN
  DELETE FROM user_events
  WHERE quote_id = p_quote_id;

  GET DIAGNOSTICS v_events_deleted = ROW_COUNT;

  DELETE FROM saved_quotes
  WHERE id = p_quote_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quote not found',
      'events_deleted', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'events_deleted', v_events_deleted
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_saved_quote(uuid) TO anon, authenticated;
