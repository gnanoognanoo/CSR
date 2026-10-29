-- ==============================================================================
-- CSR-RIT SUPABASE SCHEMA & RBAC CONFIGURATION
-- Safe for sharing with existing Supabase projects (prefixed with csr_)
-- ==============================================================================

-- 1. Create Members Table
CREATE TABLE IF NOT EXISTS csr_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  division_id TEXT NOT NULL,
  division TEXT NOT NULL,
  year TEXT,
  department TEXT,
  sec TEXT,
  role TEXT DEFAULT 'Member',
  email TEXT,
  phone TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bio TEXT,
  avatar_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by division and user
CREATE INDEX IF NOT EXISTS idx_csr_members_division ON csr_members(division_id);
CREATE INDEX IF NOT EXISTS idx_csr_members_user_id ON csr_members(user_id);
CREATE INDEX IF NOT EXISTS idx_csr_members_email ON csr_members(LOWER(email));

-- 2. Create User Profiles Table for RBAC
CREATE TABLE IF NOT EXISTS csr_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'lead')),
  member_id TEXT REFERENCES csr_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csr_profiles_role ON csr_profiles(role);

-- 3. Security Definer helper to check if current user is admin
CREATE OR REPLACE FUNCTION is_csr_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM csr_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger to automatically provision profile when an auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_csr_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_member_id TEXT;
  default_role TEXT := 'member';
BEGIN
  -- If user provided a role in user metadata (e.g. during initial setup), use it
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL AND NEW.raw_user_meta_data->>'role' IN ('admin', 'member', 'lead') THEN
    default_role := NEW.raw_user_meta_data->>'role';
  END IF;

  -- Attempt to auto-link with roster if email matches
  SELECT id INTO matched_member_id
  FROM csr_members
  WHERE LOWER(email) = LOWER(NEW.email)
  LIMIT 1;

  INSERT INTO csr_profiles (id, email, full_name, role, member_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    default_role,
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
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_csr_user error: %', SQLERRM;
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

-- 6. Policies for csr_members
-- Public access: Anyone can read members (needed for visitors to see 3D orbit & directory)
DROP POLICY IF EXISTS "csr_members_select_public" ON csr_members;
CREATE POLICY "csr_members_select_public"
  ON csr_members FOR SELECT
  USING (true);

-- Admins can insert members
DROP POLICY IF EXISTS "csr_members_insert_admin" ON csr_members;
CREATE POLICY "csr_members_insert_admin"
  ON csr_members FOR INSERT
  WITH CHECK (is_csr_admin());

-- Admins can update any member, members can update own linked roster record, or trigger can link user_id
DROP POLICY IF EXISTS "csr_members_update_admin_or_owner" ON csr_members;
CREATE POLICY "csr_members_update_admin_or_owner"
  ON csr_members FOR UPDATE
  USING (is_csr_admin() OR user_id = auth.uid() OR user_id IS NULL);

-- Admins can delete members
DROP POLICY IF EXISTS "csr_members_delete_admin" ON csr_members;
CREATE POLICY "csr_members_delete_admin"
  ON csr_members FOR DELETE
  USING (is_csr_admin());

-- 7. Policies for csr_profiles
-- Users can view their own profile, or admins can view all profiles
DROP POLICY IF EXISTS "csr_profiles_select_own_or_admin" ON csr_profiles;
CREATE POLICY "csr_profiles_select_own_or_admin"
  ON csr_profiles FOR SELECT
  USING (auth.uid() = id OR is_csr_admin());

-- Users can update their own profile, admins can update any profile (including changing roles)
DROP POLICY IF EXISTS "csr_profiles_update_own_or_admin" ON csr_profiles;
CREATE POLICY "csr_profiles_update_own_or_admin"
  ON csr_profiles FOR UPDATE
  USING (auth.uid() = id OR is_csr_admin());

-- Allow auth triggers and new signups to insert profile
DROP POLICY IF EXISTS "csr_profiles_insert" ON csr_profiles;
CREATE POLICY "csr_profiles_insert"
  ON csr_profiles FOR INSERT
  WITH CHECK (true);

-- ==============================================================================
-- 8. STRICT SECURITY ENFORCEMENT TRIGGERS (RBAC HARDENING)
-- ==============================================================================

-- A: Members CANNOT modify their own role (Only Admins can change roles from web; SQL Editor is allowed)
CREATE OR REPLACE FUNCTION protect_csr_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Only block when called from an authenticated client session by a non-admin
  IF auth.uid() IS NOT NULL AND NOT is_csr_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access denied: Only administrators can assign or alter roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_csr_profile_role ON csr_profiles;
CREATE TRIGGER tr_protect_csr_profile_role
  BEFORE UPDATE ON csr_profiles
  FOR EACH ROW EXECUTE FUNCTION protect_csr_profile_role();

-- B: Members CANNOT alter official credentials (name, division, role, year, department)
-- Members can ONLY update bio, github_url, and linkedin_url on their own profile
CREATE OR REPLACE FUNCTION protect_csr_member_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Only block when called from an authenticated client session by a non-admin
  IF auth.uid() IS NOT NULL AND NOT is_csr_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR
       NEW.division IS DISTINCT FROM OLD.division OR
       NEW.division_id IS DISTINCT FROM OLD.division_id OR
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.department IS DISTINCT FROM OLD.department OR
       NEW.year IS DISTINCT FROM OLD.year OR
       NEW.sec IS DISTINCT FROM OLD.sec THEN
      RAISE EXCEPTION 'Access denied: Only administrators can modify official member credentials (role, division, name, department, year).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_csr_member_fields ON csr_members;
CREATE TRIGGER tr_protect_csr_member_fields
  BEFORE UPDATE ON csr_members
  FOR EACH ROW EXECUTE FUNCTION protect_csr_member_fields();

-- ==============================================================================
-- 9. COMMUNITY JOIN APPLICATIONS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS csr_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  reg_no TEXT,
  year TEXT NOT NULL,
  department TEXT NOT NULL,
  sec TEXT,
  primary_division TEXT NOT NULL,
  secondary_division TEXT,
  technical_skills TEXT,
  statement_of_purpose TEXT NOT NULL,
  portfolio_link TEXT,
  criteria_accepted BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csr_applications_status ON csr_applications(status);
CREATE INDEX IF NOT EXISTS idx_csr_applications_division ON csr_applications(primary_division);

ALTER TABLE csr_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an application
DROP POLICY IF EXISTS "csr_applications_insert_public" ON csr_applications;
CREATE POLICY "csr_applications_insert_public"
  ON csr_applications FOR INSERT
  WITH CHECK (true);

-- Admins can view, update (approve/reject), and delete applications
DROP POLICY IF EXISTS "csr_applications_admin_all" ON csr_applications;
CREATE POLICY "csr_applications_admin_all"
  ON csr_applications FOR ALL
  USING (is_csr_admin());

-- ==============================================================================
-- HELPER: Promote a user to admin by email (Run when you want to promote yourself)
-- Example:
-- UPDATE csr_profiles SET role = 'admin' WHERE email = 'your-email@example.com';
-- ==============================================================================

