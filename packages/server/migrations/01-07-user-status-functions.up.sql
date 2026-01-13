-- ============================================
-- User Status Toggle Functions
-- ============================================
-- Functions to suspend and activate users by toggling is_act in both all_users and all_auth
-- These functions handle the foreign key constraint (all_users references all_auth on id, is_act)

-- First, make the foreign key constraint deferrable
-- Drop and recreate with DEFERRABLE INITIALLY DEFERRED
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'all_users_id_is_act_fkey'
    AND table_schema = 'pzero'
  ) THEN
    ALTER TABLE pzero.all_users DROP CONSTRAINT all_users_id_is_act_fkey;
  END IF;

  -- Recreate as deferrable
  ALTER TABLE pzero.all_users
    ADD CONSTRAINT all_users_id_is_act_fkey
    FOREIGN KEY (id, is_act) REFERENCES pzero.all_auth(id, is_act)
    DEFERRABLE INITIALLY DEFERRED;
END $$;

-- Suspend User Function
-- Sets is_act = false for both all_users and all_auth
CREATE OR REPLACE FUNCTION pzero.suspend_user(p_user_id text) RETURNS jsonb AS $$
DECLARE
  v_row_count integer;
BEGIN
  -- Update all_users first (dependent table)
  UPDATE pzero.all_users
  SET is_act = false
  WHERE id = p_user_id::uuid AND is_act = true;

  -- Update all_auth (referenced table)
  UPDATE pzero.all_auth
  SET is_act = false
  WHERE id = p_user_id::uuid AND is_act = true;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count > 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'User suspended successfully', 'user_id', p_user_id);
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'User not found or already suspended');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Activate User Function
-- Sets is_act = true for both all_auth and all_users
-- Order: all_auth first (referenced), then all_users (dependent)
CREATE OR REPLACE FUNCTION pzero.activate_user(p_user_id text) RETURNS jsonb AS $$
BEGIN
  -- Update all_auth first (referenced table)
  UPDATE pzero.all_auth
  SET is_act = true
  WHERE id = p_user_id::uuid AND is_act = false;

  -- Update all_users (dependent table)
  UPDATE pzero.all_users
  SET is_act = true
  WHERE id = p_user_id::uuid AND is_act = false;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'User activated successfully', 'user_id', p_user_id);
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'User not found or already active');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Toggle User Status Function
-- Toggles is_act between true and false for both all_users and all_auth
CREATE OR REPLACE FUNCTION pzero.toggle_user_status(p_user_id text) RETURNS jsonb AS $$
DECLARE
  v_current_status boolean;
BEGIN
  -- Get current status
  SELECT is_act INTO v_current_status
  FROM pzero.all_auth
  WHERE id = p_user_id::uuid;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;

  IF v_current_status = true THEN
    -- Suspend: all_users first, then all_auth
    UPDATE pzero.all_users SET is_act = false WHERE id = p_user_id::uuid;
    UPDATE pzero.all_auth SET is_act = false WHERE id = p_user_id::uuid;
    RETURN jsonb_build_object('success', true, 'message', 'User suspended successfully', 'user_id', p_user_id, 'is_act', false);
  ELSE
    -- Activate: all_auth first, then all_users
    UPDATE pzero.all_auth SET is_act = true WHERE id = p_user_id::uuid;
    UPDATE pzero.all_users SET is_act = true WHERE id = p_user_id::uuid;
    RETURN jsonb_build_object('success', true, 'message', 'User activated successfully', 'user_id', p_user_id, 'is_act', true);
  END IF;
END;
$$ LANGUAGE plpgsql;
