-- ==============================================================================
-- CSR-RIT SECURITY AUDIT: "DO FIRST" - STEP 2 REMEDIATION
-- Scope: High (H1, H3) & Medium (M1) Database Fixes ONLY
-- Note: Critical items (C1, C2) are strictly reserved for Krishanth and omitted.
-- ==============================================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/avippchoatqvaohizbvu/sql/new
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- M1 FIX: Hardened search_path and STABLE classification on Security Definer helper
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_csr_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM csr_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- H1 FIX: Restrict profile INSERT to own user ID with role = 'member'
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "csr_profiles_insert" ON csr_profiles;
CREATE POLICY "csr_profiles_insert"
  ON csr_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid() AND role = 'member');

-- Disallow non-admins from inserting any role other than 'member'
CREATE OR REPLACE FUNCTION public.protect_csr_profile_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_csr_admin() AND NEW.role <> 'member' THEN
    NEW.role := 'member';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_csr_profile_insert ON csr_profiles;
CREATE TRIGGER tr_protect_csr_profile_insert
  BEFORE INSERT ON csr_profiles
  FOR EACH ROW EXECUTE FUNCTION protect_csr_profile_insert();

-- M1 FIX on protect_csr_profile_role
CREATE OR REPLACE FUNCTION public.protect_csr_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_csr_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access denied: Only administrators can alter user roles.';
    END IF;
    IF NEW.member_id IS DISTINCT FROM OLD.member_id THEN
      RAISE EXCEPTION 'Access denied: Member record linking must be performed through verified matching.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- M1 FIX on protect_csr_member_fields
CREATE OR REPLACE FUNCTION public.protect_csr_member_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_csr_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR
       NEW.division IS DISTINCT FROM OLD.division OR
       NEW.division_id IS DISTINCT FROM OLD.division_id OR
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.department IS DISTINCT FROM OLD.department OR
       NEW.year IS DISTINCT FROM OLD.year OR
       NEW.sec IS DISTINCT FROM OLD.sec THEN
      RAISE EXCEPTION 'Access denied: Only administrators can modify official member credentials.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- H3 FIX: Validate application inputs, lengths, URL schemes, and status = 'pending'
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "csr_applications_insert_public" ON csr_applications;
CREATE POLICY "csr_applications_insert_public"
  ON csr_applications FOR INSERT
  WITH CHECK (status = 'pending');

-- Ensure check constraints exist on application field lengths and portfolio URLs
DO $$
BEGIN
  -- Length constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_app_name_len') THEN
    ALTER TABLE csr_applications ADD CONSTRAINT chk_app_name_len CHECK (char_length(full_name) <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_app_email_len') THEN
    ALTER TABLE csr_applications ADD CONSTRAINT chk_app_email_len CHECK (char_length(email) <= 150);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_app_phone_len') THEN
    ALTER TABLE csr_applications ADD CONSTRAINT chk_app_phone_len CHECK (char_length(phone) <= 30);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_app_sop_len') THEN
    ALTER TABLE csr_applications ADD CONSTRAINT chk_app_sop_len CHECK (char_length(statement_of_purpose) <= 5000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_app_portfolio_scheme') THEN
    ALTER TABLE csr_applications ADD CONSTRAINT chk_app_portfolio_scheme CHECK (
      portfolio_link IS NULL OR (char_length(portfolio_link) <= 500 AND portfolio_link ~* '^https?://')
    );
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------------------------
-- AUDIT STEP 2 VERIFICATION:
-- Review csr_profiles for unexpected admins as required by the audit
-- ------------------------------------------------------------------------------
SELECT email, role, created_at
FROM csr_profiles
WHERE role = 'admin'
ORDER BY created_at ASC;

