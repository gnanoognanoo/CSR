-- ==============================================================================
-- CSR-RIT SUPABASE SCHEMA & RBAC CONFIGURATION (HARDENED)
-- Verified against Repository Security Audit (C1, C2, C3, H1, H2, H3, M1, M2, M4)
-- ==============================================================================

-- 1. Create Members Table
CREATE TABLE IF NOT EXISTS csr_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL CONSTRAINT chk_member_name_len CHECK (char_length(name) <= 100),
  division_id TEXT NOT NULL CONSTRAINT chk_member_div_id_len CHECK (char_length(division_id) <= 50),
  division TEXT NOT NULL CONSTRAINT chk_member_div_len CHECK (char_length(division) <= 100),
  year TEXT CONSTRAINT chk_member_year_len CHECK (year IS NULL OR char_length(year) <= 30),
  department TEXT CONSTRAINT chk_member_dept_len CHECK (department IS NULL OR char_length(department) <= 100),
  sec TEXT CONSTRAINT chk_member_sec_len CHECK (sec IS NULL OR char_length(sec) <= 10),
  role TEXT DEFAULT 'Member' CONSTRAINT chk_member_role_len CHECK (char_length(role) <= 50),
  email TEXT CONSTRAINT chk_member_email_len CHECK (email IS NULL OR char_length(email) <= 150),
  phone TEXT CONSTRAINT chk_member_phone_len CHECK (phone IS NULL OR char_length(phone) <= 30),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bio TEXT CONSTRAINT chk_member_bio_len CHECK (bio IS NULL OR char_length(bio) <= 2000),
  avatar_url TEXT CONSTRAINT chk_member_avatar_scheme CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://'),
  github_url TEXT CONSTRAINT chk_member_github_scheme CHECK (github_url IS NULL OR github_url ~* '^https?://'),
  linkedin_url TEXT CONSTRAINT chk_member_linkedin_scheme CHECK (linkedin_url IS NULL OR linkedin_url ~* '^https?://'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by division, user, and email
CREATE INDEX IF NOT EXISTS idx_csr_members_division ON csr_members(division_id);
CREATE INDEX IF NOT EXISTS idx_csr_members_user_id ON csr_members(user_id);
CREATE INDEX IF NOT EXISTS idx_csr_members_email ON csr_members(LOWER(email));

-- 2. Create User Profiles Table for RBAC
CREATE TABLE IF NOT EXISTS csr_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL CONSTRAINT chk_profile_email_len CHECK (char_length(email) <= 150),
  full_name TEXT CONSTRAINT chk_profile_name_len CHECK (full_name IS NULL OR char_length(full_name) <= 100),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'lead')),
  member_id TEXT REFERENCES csr_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csr_profiles_role ON csr_profiles(role);

-- 3. Security Definer helper to check if current user is admin (M1: fixed search_path & STABLE)
CREATE OR REPLACE FUNCTION is_csr_admin()
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

-- 4. Trigger to automatically provision profile when an auth user signs up
-- Fix C1: Never trust user_metadata for role; always assign 'member'
-- Fix M2: Let exceptions bubble up rather than silently masking broken states
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
  WHERE LOWER(email) = LOWER(NEW.email) AND user_id IS NULL
  LIMIT 1;

  INSERT INTO csr_profiles (id, email, full_name, role, member_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'member', -- C1 FIX: Always 'member'. Admin must be promoted from SQL Editor or by existing admin
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

DROP TRIGGER IF EXISTS on_auth_user_created_csr ON auth.users;
CREATE TRIGGER on_auth_user_created_csr
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_csr_user();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE csr_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE csr_profiles ENABLE ROW LEVEL SECURITY;

-- 6. Policies for csr_members (C2 & C3 FIXES)

-- C3 FIX: Base table select restricted to admins or record owners to protect email & phone numbers
DROP POLICY IF EXISTS "csr_members_select_public" ON csr_members;
DROP POLICY IF EXISTS "csr_members_select_admin_or_owner" ON csr_members;
CREATE POLICY "csr_members_select_admin_or_owner"
  ON csr_members FOR SELECT
  USING (is_csr_admin() OR user_id = auth.uid());

-- Admins can insert members
DROP POLICY IF EXISTS "csr_members_insert_admin" ON csr_members;
CREATE POLICY "csr_members_insert_admin"
  ON csr_members FOR INSERT
  TO authenticated
  WITH CHECK (is_csr_admin());

-- C2 FIX: Drop `OR user_id IS NULL`, require authenticated, add WITH CHECK
DROP POLICY IF EXISTS "csr_members_update_admin_or_owner" ON csr_members;
CREATE POLICY "csr_members_update_admin_or_owner"
  ON csr_members FOR UPDATE
  TO authenticated
  USING (is_csr_admin() OR user_id = auth.uid())
  WITH CHECK (is_csr_admin() OR user_id = auth.uid());

-- Admins can delete members
DROP POLICY IF EXISTS "csr_members_delete_admin" ON csr_members;
CREATE POLICY "csr_members_delete_admin"
  ON csr_members FOR DELETE
  TO authenticated
  USING (is_csr_admin());

-- 7. Policies for csr_profiles (H1 FIX)

-- Users can view their own profile, or admins can view all profiles
DROP POLICY IF EXISTS "csr_profiles_select_own_or_admin" ON csr_profiles;
CREATE POLICY "csr_profiles_select_own_or_admin"
  ON csr_profiles FOR SELECT
  USING (auth.uid() = id OR is_csr_admin());

-- Users can update their own profile, admins can update any profile
DROP POLICY IF EXISTS "csr_profiles_update_own_or_admin" ON csr_profiles;
CREATE POLICY "csr_profiles_update_own_or_admin"
  ON csr_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_csr_admin());

-- H1 FIX: Restrict profile insert to authenticated user inserting own id with role='member'
DROP POLICY IF EXISTS "csr_profiles_insert" ON csr_profiles;
CREATE POLICY "csr_profiles_insert"
  ON csr_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid() AND role = 'member');

-- ==============================================================================
-- 8. STRICT SECURITY ENFORCEMENT TRIGGERS (RBAC HARDENING)
-- ==============================================================================

-- H1 FIX: Disallow inserting any role other than 'member' for non-admins
CREATE OR REPLACE FUNCTION protect_csr_profile_insert()
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

-- A: Members CANNOT modify their own role (Only Admins can change roles from web; SQL Editor is allowed)
CREATE OR REPLACE FUNCTION protect_csr_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Block non-admin from modifying role
  IF NOT is_csr_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access denied: Only administrators can assign or alter roles.';
    END IF;
    -- H2 FIX: Block non-admins from changing member_id directly (must use claim RPC)
    IF NEW.member_id IS DISTINCT FROM OLD.member_id THEN
      RAISE EXCEPTION 'Access denied: Profile claiming must be performed through verified matching.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_csr_profile_role ON csr_profiles;
CREATE TRIGGER tr_protect_csr_profile_role
  BEFORE UPDATE ON csr_profiles
  FOR EACH ROW EXECUTE FUNCTION protect_csr_profile_role();

-- B: Members CANNOT alter official credentials (name, division, role, year, department, email, phone, user_id)
-- Members can ONLY update bio, github_url, linkedin_url, avatar_url on their own profile
-- C2 FIX: Rejects non-admins unconditionally (including anon)
CREATE OR REPLACE FUNCTION protect_csr_member_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_csr_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR
       NEW.division IS DISTINCT FROM OLD.division OR
       NEW.division_id IS DISTINCT FROM OLD.division_id OR
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.department IS DISTINCT FROM OLD.department OR
       NEW.year IS DISTINCT FROM OLD.year OR
       NEW.sec IS DISTINCT FROM OLD.sec OR
       NEW.email IS DISTINCT FROM OLD.email OR
       NEW.phone IS DISTINCT FROM OLD.phone OR
       NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Access denied: Only administrators can modify official member credentials (role, division, name, department, year, email, phone, user_id).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_csr_member_fields ON csr_members;
CREATE TRIGGER tr_protect_csr_member_fields
  BEFORE UPDATE ON csr_members
  FOR EACH ROW EXECUTE FUNCTION protect_csr_member_fields();

-- ==============================================================================
-- 9. COMMUNITY JOIN APPLICATIONS TABLE (H3 FIX)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS csr_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL CONSTRAINT chk_app_name_len CHECK (char_length(full_name) <= 100),
  email TEXT NOT NULL CONSTRAINT chk_app_email_len CHECK (char_length(email) <= 150),
  phone TEXT NOT NULL CONSTRAINT chk_app_phone_len CHECK (char_length(phone) <= 30),
  reg_no TEXT CONSTRAINT chk_app_reg_len CHECK (reg_no IS NULL OR char_length(reg_no) <= 30),
  year TEXT NOT NULL CONSTRAINT chk_app_year_len CHECK (char_length(year) <= 30),
  department TEXT NOT NULL CONSTRAINT chk_app_dept_len CHECK (char_length(department) <= 100),
  sec TEXT CONSTRAINT chk_app_sec_len CHECK (sec IS NULL OR char_length(sec) <= 10),
  primary_division TEXT NOT NULL CONSTRAINT chk_app_prim_div_len CHECK (char_length(primary_division) <= 100),
  secondary_division TEXT CONSTRAINT chk_app_sec_div_len CHECK (secondary_division IS NULL OR char_length(secondary_division) <= 100),
  technical_skills TEXT CONSTRAINT chk_app_skills_len CHECK (technical_skills IS NULL OR char_length(technical_skills) <= 1000),
  statement_of_purpose TEXT NOT NULL CONSTRAINT chk_app_sop_len CHECK (char_length(statement_of_purpose) <= 5000),
  portfolio_link TEXT CONSTRAINT chk_app_portfolio_scheme CHECK (portfolio_link IS NULL OR (char_length(portfolio_link) <= 500 AND portfolio_link ~* '^https?://')),
  criteria_accepted BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csr_applications_status ON csr_applications(status);
CREATE INDEX IF NOT EXISTS idx_csr_applications_division ON csr_applications(primary_division);

ALTER TABLE csr_applications ENABLE ROW LEVEL SECURITY;

-- H3 FIX: Anyone can submit an application, but ONLY with status = 'pending'
DROP POLICY IF EXISTS "csr_applications_insert_public" ON csr_applications;
CREATE POLICY "csr_applications_insert_public"
  ON csr_applications FOR INSERT
  WITH CHECK (status = 'pending');

-- Admins can view, update (approve/reject), and delete applications
DROP POLICY IF EXISTS "csr_applications_admin_all" ON csr_applications;
CREATE POLICY "csr_applications_admin_all"
  ON csr_applications FOR ALL
  TO authenticated
  USING (is_csr_admin());

-- ==============================================================================
-- 10. PUBLIC SAFE VIEW (C3 FIX)
-- Strips sensitive personal contact info (email, phone, user_id) for visitors
-- ==============================================================================

CREATE OR REPLACE VIEW csr_members_public AS
SELECT
  id,
  name,
  division_id,
  division,
  year,
  department,
  sec,
  role,
  bio,
  avatar_url,
  github_url,
  linkedin_url,
  created_at,
  updated_at
FROM csr_members;

GRANT SELECT ON csr_members_public TO anon, authenticated;

-- ==============================================================================
-- 11. SECURE RPCs (H2 & M4 FIXES)
-- ==============================================================================

-- H2 FIX: Securely claim member profile by verifying email matches auth.users
CREATE OR REPLACE FUNCTION claim_member_profile(target_member_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_member csr_members%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  SELECT * INTO v_member FROM csr_members WHERE id = target_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member record not found.';
  END IF;

  IF v_member.user_id IS NOT NULL AND v_member.user_id <> v_user_id THEN
    RAISE EXCEPTION 'This member record has already been claimed by another account.';
  END IF;

  -- Verify email matches
  IF LOWER(v_member.email) <> LOWER(v_user_email) THEN
    RAISE EXCEPTION 'Verification failed: Your sign-in email (%) does not match the official roster record email.', v_user_email;
  END IF;

  -- Link user_id on csr_members
  UPDATE csr_members SET user_id = v_user_id, updated_at = NOW() WHERE id = target_member_id;

  -- Update csr_profiles member_id
  UPDATE csr_profiles SET member_id = target_member_id, updated_at = NOW() WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'member_id', target_member_id);
END;
$$;

-- M4 FIX: Atomic application approval in a single transaction
CREATE OR REPLACE FUNCTION approve_csr_application(app_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_app csr_applications%ROWTYPE;
  v_new_member_id TEXT;
  v_div_id TEXT;
BEGIN
  IF NOT is_csr_admin() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required.';
  END IF;

  SELECT * INTO v_app FROM csr_applications WHERE id = app_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.status <> 'pending' THEN
    RAISE EXCEPTION 'Application is already %', v_app.status;
  END IF;

  -- Determine division id from primary_division
  CASE LOWER(TRIM(v_app.primary_division))
    WHEN 'ai & intelligent systems', 'ai' THEN v_div_id := 'ai';
    WHEN 'embedded & electronics', 'embedded' THEN v_div_id := 'embedded';
    WHEN 'robotics & autonomous systems', 'robotics' THEN v_div_id := 'robotics';
    WHEN 'software engineering', 'software' THEN v_div_id := 'software';
    WHEN 'iot & smart systems', 'iot' THEN v_div_id := 'iot';
    WHEN 'research & publications', 'research' THEN v_div_id := 'research';
    WHEN 'operations & management', 'operations' THEN v_div_id := 'operations';
    ELSE v_div_id := 'software';
  END CASE;

  v_new_member_id := 'member-' || gen_random_uuid()::text;

  INSERT INTO csr_members (id, name, division_id, division, year, department, sec, role, email, phone, bio, github_url)
  VALUES (
    v_new_member_id,
    v_app.full_name,
    v_div_id,
    v_app.primary_division,
    v_app.year,
    v_app.department,
    v_app.sec,
    'Member',
    v_app.email,
    v_app.phone,
    v_app.statement_of_purpose,
    v_app.portfolio_link
  );

  UPDATE csr_applications
  SET status = 'approved', updated_at = NOW()
  WHERE id = app_id;

  RETURN jsonb_build_object('success', true, 'member_id', v_new_member_id);
END;
$$;
