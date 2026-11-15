-- ==============================================================================
-- CSR-RIT SECURITY MIGRATION: C1 ONLY
-- Target Issue: C1 - Admin privilege escalation during signup
--
-- Problem:
--   The signup trigger handle_new_csr_user() previously inspected user-controlled
--   raw_user_meta_data for the role and assigned that role to the new profile.
--   A malicious user could pass { data: { role: 'admin' } } during signup to obtain
--   immediate administrative privileges.
--
-- Fix:
--   Unconditionally hardcode the assigned role to 'member'. Never trust signup
--   metadata for authorization.
--
-- Instructions: Run this script in the Supabase Dashboard SQL Editor.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_csr_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  matched_member_id TEXT;
BEGIN
  -- Attempt to auto-link with roster if verified email matches
  SELECT id INTO matched_member_id
  FROM csr_members
  WHERE LOWER(email) = LOWER(NEW.email)
  LIMIT 1;

  INSERT INTO csr_profiles (id, email, full_name, role, member_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'member', -- C1 FIX: Always 'member'. Admin roles must be granted by existing admins or via SQL Editor.
    matched_member_id
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = NOW();

  -- Link user_id in roster if matched
  IF matched_member_id IS NOT NULL THEN
    UPDATE csr_members SET user_id = NEW.id WHERE id = matched_member_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created_csr ON auth.users;
CREATE TRIGGER on_auth_user_created_csr
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_csr_user();
