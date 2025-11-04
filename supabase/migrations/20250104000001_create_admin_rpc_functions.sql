-- Migration: Create Admin RPC Functions
-- Description: Creates PostgreSQL functions for admin operations
-- These functions bypass RLS when called with service role key

-- Function 1: Update member data
CREATE OR REPLACE FUNCTION admin_update_member(
  p_wom_id INTEGER,
  p_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_update_query TEXT;
  v_set_clauses TEXT[] := ARRAY[]::TEXT[];
  v_key TEXT;
  v_value TEXT;
BEGIN
  -- Build SET clauses from JSONB input
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_updates)
  LOOP
    -- Prevent updating sensitive fields
    IF v_key NOT IN ('id', 'created_at') THEN
      v_set_clauses := array_append(v_set_clauses, format('%I = %L', v_key, v_value));
    END IF;
  END LOOP;

  -- If no valid fields to update, return error
  IF array_length(v_set_clauses, 1) IS NULL THEN
    RETURN jsonb_build_object('error', 'No valid fields to update');
  END IF;

  -- Update the member
  v_update_query := format(
    'UPDATE members SET %s, updated_at = NOW() WHERE wom_id = %L RETURNING *',
    array_to_string(v_set_clauses, ', '),
    p_wom_id
  );

  EXECUTE v_update_query INTO v_result;

  -- If no rows affected, member not found
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Member not found');
  END IF;

  RETURN v_result;
END;
$$;

-- Function 2: Delete member
CREATE OR REPLACE FUNCTION admin_delete_member(
  p_wom_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_member JSONB;
BEGIN
  -- Delete the member and return the deleted record
  DELETE FROM members
  WHERE wom_id = p_wom_id
  RETURNING to_jsonb(members.*) INTO v_deleted_member;

  -- If no rows affected, member not found
  IF v_deleted_member IS NULL THEN
    RETURN jsonb_build_object('error', 'Member not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', v_deleted_member
  );
END;
$$;

-- Function 3: Toggle member visibility
CREATE OR REPLACE FUNCTION admin_toggle_member_visibility(
  p_wom_id INTEGER,
  p_hidden BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Update the hidden field
  UPDATE members
  SET hidden = p_hidden,
      updated_at = NOW()
  WHERE wom_id = p_wom_id
  RETURNING to_jsonb(members.*) INTO v_result;

  -- If no rows affected, member not found
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Member not found');
  END IF;

  RETURN v_result;
END;
$$;

-- Function 4: Toggle user admin status
CREATE OR REPLACE FUNCTION admin_toggle_user_admin(
  p_user_id UUID,
  p_is_admin BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Update the is_admin field
  UPDATE users
  SET is_admin = p_is_admin
  WHERE id = p_user_id
  RETURNING to_jsonb(users.*) INTO v_result;

  -- If no rows affected, user not found
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  RETURN v_result;
END;
$$;

-- Grant execute permissions to authenticated users
-- Note: RLS on the functions themselves should be handled by your security policies
GRANT EXECUTE ON FUNCTION admin_update_member(INTEGER, JSONB) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION admin_delete_member(INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION admin_toggle_member_visibility(INTEGER, BOOLEAN) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION admin_toggle_user_admin(UUID, BOOLEAN) TO authenticated, anon, service_role;

-- Add comments for documentation
COMMENT ON FUNCTION admin_update_member IS 'Updates member data with admin privileges. Bypasses RLS when called with service role key.';
COMMENT ON FUNCTION admin_delete_member IS 'Deletes a member from the database. Bypasses RLS when called with service role key.';
COMMENT ON FUNCTION admin_toggle_member_visibility IS 'Toggles member visibility (hidden field). Bypasses RLS when called with service role key.';
COMMENT ON FUNCTION admin_toggle_user_admin IS 'Toggles user admin status. Bypasses RLS when called with service role key.';
