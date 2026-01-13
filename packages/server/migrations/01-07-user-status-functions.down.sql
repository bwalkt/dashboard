-- Drop user status toggle functions
DROP FUNCTION IF EXISTS pzero.suspend_user(text);
DROP FUNCTION IF EXISTS pzero.activate_user(text);
DROP FUNCTION IF EXISTS pzero.toggle_user_status(text);

-- Restore original FK constraint (non-deferrable)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'all_users_id_is_act_fkey'
    AND table_schema = 'pzero'
  ) THEN
    ALTER TABLE pzero.all_users DROP CONSTRAINT all_users_id_is_act_fkey;
  END IF;

  ALTER TABLE pzero.all_users
    ADD CONSTRAINT all_users_id_is_act_fkey
    FOREIGN KEY (id, is_act) REFERENCES pzero.all_auth(id, is_act);
END $$;
