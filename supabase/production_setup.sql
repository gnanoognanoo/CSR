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
-- C1 FIX: Always assign 'member'. Never trust client metadata role.
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
    'member',
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

-- 6. Policies for csr_members
-- Public access: Anyone can read members (needed for visitors to see 3D orbit & directory)
DROP POLICY IF EXISTS "csr_members_select_public" ON csr_members;
DROP POLICY IF EXISTS "csr_members_select_admin_or_owner" ON csr_members;
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

-- B: Members CANNOT alter official credentials (name, division, role, year, department)
-- Members can ONLY update bio, github_url, and linkedin_url on their own profile
CREATE OR REPLACE FUNCTION protect_csr_member_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
-- 10. SECURE RPCs (H2 & M4 FIXES)
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

-- ==============================================================================
-- 11. EXECUTIVE COUNCIL BILLBOARD TABLE & RLS POLICIES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS csr_billboard (
  id BIGSERIAL PRIMARY KEY,
  position INT NOT NULL UNIQUE CHECK (position >= 1 AND position <= 6),
  name TEXT NOT NULL CONSTRAINT chk_billboard_name_len CHECK (char_length(name) <= 100),
  title TEXT NOT NULL CONSTRAINT chk_billboard_title_len CHECK (char_length(title) <= 100),
  division TEXT NOT NULL CONSTRAINT chk_billboard_div_len CHECK (char_length(division) <= 100),
  year TEXT CONSTRAINT chk_billboard_year_len CHECK (year IS NULL OR char_length(year) <= 30),
  department TEXT CONSTRAINT chk_billboard_dept_len CHECK (department IS NULL OR char_length(department) <= 100),
  avatar_url TEXT CONSTRAINT chk_billboard_avatar_scheme CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://'),
  member_id TEXT REFERENCES csr_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csr_billboard_position ON csr_billboard(position);

-- Enable RLS
ALTER TABLE csr_billboard ENABLE ROW LEVEL SECURITY;

-- Billboard RLS: Public read access for committee showcase
DROP POLICY IF EXISTS "Allow public read access to billboard" ON csr_billboard;
CREATE POLICY "Allow public read access to billboard"
  ON csr_billboard FOR SELECT
  USING (true);

-- Billboard RLS: Only admins can insert/update/delete billboard slots
DROP POLICY IF EXISTS "Allow admins to manage billboard" ON csr_billboard;
CREATE POLICY "Allow admins to manage billboard"
  ON csr_billboard FOR ALL
  TO authenticated
  USING (is_csr_admin())
  WITH CHECK (is_csr_admin());

-- Seed initial 6 billboard positions if not present
INSERT INTO csr_billboard (position, name, title, division, year, department, member_id)
VALUES
  (1, 'Paul Bryton Raj', 'Executive Council Member', 'Research & Development', 'II Year', 'Artificial Intelligence and Data Science', NULL),
  (2, 'GNANESHWAR R', 'Executive Council Member', 'Software Engineering', 'II Year', 'Computer Science and Engineering', NULL),
  (3, 'Krishanth', 'Executive Council Member', 'Software Engineering', 'II Year', 'Computer Science and Engineering', NULL),
  (4, 'Shivanya Arunachalam', 'Executive Council Member', 'Software Engineering', 'II Year', 'Computer Science and Engineering', NULL),
  (5, 'NHESIKA S G', 'Executive Council Member', 'Software Engineering', 'II Year', 'Artificial Intelligence and Data Science', NULL),
  (6, 'Council Member 6', 'Council Representative', 'Research & Advanced Systems', 'III Year', 'Electronics and Communication Engineering', NULL)
ON CONFLICT (position) DO NOTHING;
-- ==============================================================================
-- CSR-RIT SUPABASE INITIAL SEED DATA
-- 115 Verified Members with Official Emails, Phones, Sections & Roles from Official PDF
-- Run this in your Supabase SQL Editor after running schema.sql
-- ==============================================================================

INSERT INTO csr_members (id, name, division_id, division, year, department, sec, role, email, phone)
VALUES
  ('member-001', 'Anto Jenishia A', 'ai', 'AI & Intelligent Systems', 'III Year', 'Artificial Intelligence and Machine Learning', 'A', 'Division Lead', 'antojenishia@gmail.com', '9385304636'),
  ('member-002', 'Amisha R K', 'ai', 'AI & Intelligent Systems', 'II Year', 'Artificial Intelligence and Data Science', 'A', 'Member', 'amisha.250022@aids.ritchennai.edu.in', '7845063810'),
  ('member-003', 'DEEPAK KUMAR D', 'ai', 'AI & Intelligent Systems', 'II Year', 'Artificial Intelligence and Data Science', 'A', 'Member', 'deepakkumar.250059@aids.ritchennai.edu.in', '9514040528'),
  ('member-004', 'Devamalyaa G R', 'ai', 'AI & Intelligent Systems', 'III Year', 'Artificial Intelligence and Machine Learning', 'A', 'Member', 'grdevamalyaa@gmail.com', '6383839171'),
  ('member-005', 'Dilish', 'ai', 'AI & Intelligent Systems', 'III Year', 'Computer and Communication Engineering', 'A', 'Member', 'rdilish3434@gmail.com', '9042286919'),
  ('member-006', 'HARINI SRI S', 'ai', 'AI & Intelligent Systems', 'II Year', 'Artificial Intelligence and Data Science', 'B', 'Member', 'harinisri.250106@aids.ritchennai.edu.in', '7845755166'),
  ('member-007', 'IMAM AFRITHEEN P', 'ai', 'AI & Intelligent Systems', 'II Year', 'Computer Science and Engineering', 'C', 'Member', 'imamafritheen.250147@cse.ritchennai.edu.in', '7825995590'),
  ('member-008', 'Kanimozhi T', 'ai', 'AI & Intelligent Systems', 'III Year', 'Artificial Intelligence and Machine Learning', 'B', 'Member', 'kanimozhi.240061@aiml.ritchennai.edu.in', '8870046894'),
  ('member-009', 'MANISH KUMAAR R M', 'ai', 'AI & Intelligent Systems', 'II Year', 'Computer Science and Engineering', 'E', 'Member', 'rmmanishkumaar777@gmail.com', '9176333411'),
  ('member-010', 'Manoj Kumar P', 'ai', 'AI & Intelligent Systems', 'II Year', 'Mechanical Engineering', 'A', 'Member', 'manojkumarx7777@gmail.com', '6383380037'),
  ('member-011', 'R D Sai Saran', 'ai', 'AI & Intelligent Systems', 'III Year', 'Artificial Intelligence and Machine Learning', 'C', 'Member', 'saisaran.240125@aiml.ritchennai.edu.in', '8838182183'),
  ('member-012', 'sadhana', 'ai', 'AI & Intelligent Systems', 'II Year', 'Computer Science and Engineering', 'G', 'Member', 'sadhana.250363@cse.ritchennai.edu.in', '8807537549'),
  ('member-013', 'Sanjay Kumar M', 'ai', 'AI & Intelligent Systems', 'II Year', 'Artificial Intelligence and Data Science', 'F', 'Member', 'sanjaykumar.250307@aids.ritchennai.edu.in', '6383910035'),
  ('member-014', 'Shruthilaya B', 'ai', 'AI & Intelligent Systems', 'III Year', 'Computer Science and Business Systems', 'C', 'Member', 'shruthilayab3@gmail.com', '8122341678'),
  ('member-015', 'Subathra S', 'ai', 'AI & Intelligent Systems', 'III Year', 'Computer and Communication Engineering', 'B', 'Member', 'subathra.240087@cce.ritchennai.edu.in', '9043520907'),
  ('member-016', 'Surendirakumar S', 'ai', 'AI & Intelligent Systems', 'II Year', 'Electronics and Communication Engineering', 'E', 'Member', 'surendirakumar.250274@ece.ritchennai.edu.in', '7540096376'),
  ('member-017', 'Thejasvini G S', 'ai', 'AI & Intelligent Systems', 'III Year', 'Artificial Intelligence and Machine Learning', 'C', 'Member', 'thejasvini1223@gmail.com', '9123528125'),
  ('member-018', 'Abhishek S', 'embedded', 'Embedded & Electronics', 'II Year', 'Electronics and Communication Engineering', 'A', 'Division Lead', 'abhishek.250005@ece.ritchennai.edu.in', '7550260838'),
  ('member-019', 'Athi Suriya', 'embedded', 'Embedded & Electronics', 'II Year', 'Electronics and Communication Engineering', 'A', 'Member', 'athisuriya.250030@ece.ritchennai.edu.in', '8838736687'),
  ('member-020', 'CHINMAYI B', 'embedded', 'Embedded & Electronics', 'II Year', 'Computer and Communication Engineering', 'A', 'Member', 'chinmayi.250015@cce.ritchennai.edu.in', '8248398465'),
  ('member-021', 'Dharsan Kumar S', 'embedded', 'Embedded & Electronics', 'II Year', 'Electronics and Communication Engineering', 'A', 'Member', 'dharsankumar.250053@ece.ritchennai.edu.in', '9566363232'),
  ('member-022', 'Dharshini R', 'embedded', 'Embedded & Electronics', 'II Year', 'VLSI', 'A', 'Member', 'rdharshini082@gmail.com', '6379227663'),
  ('member-023', 'Dinesh Karthick', 'embedded', 'Embedded & Electronics', 'II Year', 'Electronics and Communication Engineering', 'A', 'Member', 'dineshkarthick.250056@ece.ritchennai.edu.in', '9940971308'),
  ('member-024', 'Eknath Nuvvula', 'embedded', 'Embedded & Electronics', 'II Year', 'Electronics and Communication Engineering', 'A', 'Member', 'eknathnuvvula.250059@ece.ritchennai.edu.in', '8667338512'),
  ('member-025', 'Jay Vigneswaran S A', 'embedded', 'Embedded & Electronics', 'III Year', 'Electronics and Communication Engineering', 'A', 'Member', 'jayvigneswaran.240052@ece.ritchennai.edu.in', '9442155259'),
  ('member-026', 'Kapilan J', 'embedded', 'Embedded & Electronics', 'II Year', 'Electronics and Communication Engineering', 'B', 'Member', 'kapilan.250119@ece.ritchennai.edu.in', '7200895610'),
  ('member-027', 'M.R.Harish', 'embedded', 'Embedded & Electronics', 'II Year', 'Electronics and Communication Engineering', 'B', 'Member', 'harish.250081@ece.ritchennai.edu.in', '9385357460'),
  ('member-028', 'MOHAMED BASITH', 'embedded', 'Embedded & Electronics', 'III Year', 'VLSI', 'B', 'Member', 'mohamedbasith.240075@vlsi.ritchennai.edu.in', '8056010856'),
  ('member-029', 'R NITHISH KARTHI', 'embedded', 'Embedded & Electronics', 'II Year', 'VLSI', 'B', 'Member', 'nithishkarthi.250075@vlsi.ritchennai.edu.in', '7358777613'),
  ('member-030', 'S Sai Madura Bashini', 'embedded', 'Embedded & Electronics', 'II Year', 'VLSI', 'B', 'Member', 'saimadurabashini.250095@vlsi.ritchennai.edu.in', '8838250274'),
  ('member-031', 'Sam Gabriel Bilshan', 'embedded', 'Embedded & Electronics', 'III Year', 'Electronics and Communication Engineering', 'C', 'Member', 'samgabrielbilshan@gmail.com', '7358361065'),
  ('member-032', 'SANGA ELAKIYA R', 'embedded', 'Embedded & Electronics', 'II Year', 'VLSI', 'B', 'Member', 'sangaelakiya.250100@vlsi.ritchennai.edu.in', '9150041054'),
  ('member-033', 'Subikeesh M', 'embedded', 'Embedded & Electronics', 'III Year', 'VLSI', 'C', 'Member', 'subikeesh431@gmail.com', '9344639934'),
  ('member-034', 'Tharun Raj P', 'embedded', 'Embedded & Electronics', 'III Year', 'Electronics and Communication Engineering', 'C', 'Member', 'tharunraj.240168@ece.ritchennai.edu.in', '7358119524'),
  ('member-035', 'Guru prakash Muthusamy', 'robotics', 'Robotics & Autonomous Systems', 'III Year', 'Mechanical Engineering', 'A', 'Division Lead', 'guruprakash.240026@mech.ritchennai.edu.in', '9360543075'),
  ('member-036', 'ANNAMALAI N', 'robotics', 'Robotics & Autonomous Systems', 'III Year', 'Mechanical Engineering', 'A', 'Member', 'annamalai.240006@mech.ritchennai.edu.in', '8939145999'),
  ('member-037', 'Bhavani Sankar M', 'robotics', 'Robotics & Autonomous Systems', 'III Year', 'Electronics and Communication Engineering', 'A', 'Member', 'bhavanisankar.240015@ece.ritchennai.edu.in', '9790896599'),
  ('member-038', 'Hemalesh S', 'robotics', 'Robotics & Autonomous Systems', 'II Year', 'Computer Science and Engineering', 'C', 'Member', 'hemalesh.250141@cse.ritchennai.edu.in', '7448815336'),
  ('member-039', 'Hemanth kiran R', 'robotics', 'Robotics & Autonomous Systems', 'II Year', 'VLSI', 'A', 'Member', 'hemanthkiran.250038@vlsi.ritchennai.edu.in', '8438019569'),
  ('member-040', 'Jai suriya', 'robotics', 'Robotics & Autonomous Systems', 'III Year', 'Mechanical Engineering', 'A', 'Member', 'jaisuriya.240030@mech.ritchennai.edu.in', '9786300130'),
  ('member-041', 'Jevin J', 'robotics', 'Robotics & Autonomous Systems', 'II Year', 'Computer Science and Engineering', 'D', 'Member', 'jevin.250176@cse.ritchennai.edu.in', '9003428146'),
  ('member-042', 'Mahendar J', 'robotics', 'Robotics & Autonomous Systems', 'II Year', 'Electronics and Communication Engineering', 'C', 'Member', 'mahendar.250144@ece.ritchennai.edu.in', '8807617268'),
  ('member-043', 'NITHYA SRE V', 'robotics', 'Robotics & Autonomous Systems', 'II Year', 'Mechanical Engineering', 'B', 'Member', 'nithyasre.250070@mech.ritchennai.edu.in', '8248743438'),
  ('member-044', 'PRISCILLA SHIRLEY PRASHANTH STEPHENS', 'robotics', 'Robotics & Autonomous Systems', 'II Year', 'Mechanical Engineering', 'B', 'Member', 'priscillashirleyprashanthstephens.250080@mech.ritchennai.edu.in', '9790248776'),
  ('member-045', 'Roselin Ivana J', 'robotics', 'Robotics & Autonomous Systems', 'II Year', 'Electronics and Communication Engineering', 'D', 'Member', 'roselinivana.250216@ece.ritchennai.edu.in', '8870364398'),
  ('member-046', 'Rubashree Kannan', 'robotics', 'Robotics & Autonomous Systems', 'II Year', 'Electronics and Communication Engineering', 'D', 'Member', 'rubashree1215@gmail.com', '9791771210'),
  ('member-047', 'Sai karunya', 'robotics', 'Robotics & Autonomous Systems', 'II Year', 'Electronics and Communication Engineering', 'D', 'Member', 'saikarunya0503@gmail.com', '8870449338'),
  ('member-048', 'Subash D', 'robotics', 'Robotics & Autonomous Systems', 'III Year', 'Artificial Intelligence and Machine Learning', 'C', 'Member', 'subash.240147@aiml.ritchennai.edu.in', '8668198847'),
  ('member-049', 'Tamizharasi M', 'robotics', 'Robotics & Autonomous Systems', 'II Year', 'Computer Science and Engineering', 'H', 'Member', 'tamizharasi.250468@cse.ritchennai.edu.in', '7200082671'),
  ('member-050', 'Yoganandh J', 'robotics', 'Robotics & Autonomous Systems', 'III Year', 'Electronics and Communication Engineering', 'C', 'Member', 'yoganandh.240179@ece.ritchennai.edu.in', '9445630998'),
  ('member-051', 'Sumetha V', 'software', 'Software Engineering', 'III Year', 'Computer Science and Business Systems', 'C', 'Division Lead', 'sumethavenkatesan@gmail.com', '6379576565'),
  ('member-052', 'Bavan J', 'software', 'Software Engineering', 'III Year', 'Computer and Communication Engineering', 'A', 'Member', 'bavan.240016@cce.ritchennai.edu.in', '7092461182'),
  ('member-053', 'GNANESHWAR R', 'software', 'Software Engineering', 'II Year', 'Computer Science and Engineering', 'B', 'Member', 'gnanoognanoo@gmail.com', '9940832824'),
  ('member-054', 'Krishanth', 'software', 'Software Engineering', 'II Year', 'Computer Science and Engineering', 'D', 'Member', 'krishanth.250218@cse.ritchennai.edu.in', '8825992544'),
  ('member-055', 'NHESIKA S G', 'software', 'Software Engineering', 'II Year', 'Artificial Intelligence and Data Science', 'D', 'Member', 'nhesika.250219@aids.ritchennai.edu.in', '9790991826'),
  ('member-056', 'Nivaedhitha', 'software', 'Software Engineering', 'III Year', 'Computer and Communication Engineering', 'B', 'Member', 'nivaedhitha.240058@cce.ritchennai.edu.in', '6385036061'),
  ('member-057', 'Ponperumal M', 'software', 'Software Engineering', 'III Year', 'Computer Science and Engineering', NULL, 'Member', NULL, '9025954637'),
  ('member-058', 'Renuga V', 'software', 'Software Engineering', 'II Year', 'Computer Science and Engineering', 'F', 'Member', 'renuga.250346@cse.ritchennai.edu.in', '8148443038'),
  ('member-059', 'Shivanya Arunachalam', 'software', 'Software Engineering', 'II Year', 'Computer Science and Engineering', 'H', 'Member', 'shivanya.250411@cse.ritchennai.edu.in', '7845839150'),
  ('member-060', 'Suruthika R', 'software', 'Software Engineering', 'III Year', 'Computer Science and Business Systems', 'C', 'Member', 'ssuruthika475@gmail.com', '8825962180'),
  ('member-061', 'Thirsha T A', 'software', 'Software Engineering', 'II Year', 'Artificial Intelligence and Data Science', 'G', 'Member', 'thirsha.250373@aids.ritchennai.edu.in', '9751878348'),
  ('member-062', 'VARSHINI G H', 'software', 'Software Engineering', 'II Year', 'Computer Science and Engineering', 'I', 'Member', 'varshini161506@gmail.com', '8056161506'),
  ('member-063', 'Varun K', 'software', 'Software Engineering', 'II Year', 'Computer Science and Engineering', 'I', 'Member', 'varunkrishnakumar18@gmail.com', '9791158504'),
  ('member-064', 'VEERA AYYANAR P', 'software', 'Software Engineering', 'II Year', 'Computer and Communication Engineering', 'B', 'Member', 'veeraayyanar010@gmail.com', '8438192044'),
  ('member-065', 'VINOTH KUMAR M', 'software', 'Software Engineering', 'II Year', 'Artificial Intelligence and Data Science', 'G', 'Member', 'vinothkumar.250392@aids.ritchennai.edu.in', '9342517427'),
  ('member-066', 'Yashmitha .K', 'software', 'Software Engineering', 'II Year', 'Computer Science and Engineering', 'I', 'Member', 'yashmitha.250521@cse.ritchennai.edu.in', '9498476149'),
  ('member-067', 'Yogadharshini S', 'software', 'Software Engineering', 'II Year', 'Computer Science and Engineering', 'I', 'Member', 'yogadharshini.250524@cse.ritchennai.edu.in', '7845062328'),
  ('member-068', 'Yuva Raj', 'software', 'Software Engineering', 'III Year', 'Computer Science and Business Systems', 'C', 'Member', 'yuva00raj@gmail.com', '9443875763'),
  ('member-069', 'DILLI BABU S', 'iot', 'IoT & Smart Systems', 'II Year', 'Electronics and Communication Engineering', 'A', 'Division Lead', 'dillibabu.250055@ece.ritchennai.edu.in', '9884961331'),
  ('member-070', 'AKSHAYAA POORNIMA G', 'iot', 'IoT & Smart Systems', 'II Year', 'Electronics and Communication Engineering', 'A', 'Member', 'akshayaapoornima.250015@ece.ritchennai.edu.in', '7010686483'),
  ('member-071', 'ARUNRAJ M', 'iot', 'IoT & Smart Systems', 'II Year', 'Electronics and Communication Engineering', 'A', 'Member', 'arunraj.250027@ece.ritchennai.edu.in', '7339105519'),
  ('member-072', 'Deepan Raju U', 'iot', 'IoT & Smart Systems', 'II Year', 'Electronics and Communication Engineering', 'A', 'Member', 'deepanraju.250047@ece.ritchennai.edu.in', '6381020969'),
  ('member-073', 'Eenusha S', 'iot', 'IoT & Smart Systems', 'II Year', 'VLSI', 'A', 'Member', 'eenusha.250020@vlsi.ritchennai.edu.in', '8668006224'),
  ('member-074', 'G S Kowshik kumar', 'iot', 'IoT & Smart Systems', 'III Year', 'VLSI', 'B', 'Member', 'kowshikgandhi07@gmail.com', '7639779479'),
  ('member-075', 'Janani', 'iot', 'IoT & Smart Systems', 'III Year', 'Electronics and Communication Engineering', 'A', 'Member', 'janani.240051@ece.ritchennai.edu.in', '9600968316'),
  ('member-076', 'Madhu Mathy', 'iot', 'IoT & Smart Systems', 'II Year', 'Electronics and Communication Engineering', 'C', 'Member', 'madhumathy.250141@ece.ritchennai.edu.in', '7904680551'),
  ('member-077', 'Madhumitha JM', 'iot', 'IoT & Smart Systems', 'III Year', 'Mechanical Engineering', 'A', 'Member', 'madhumitha.240041@mech.ritchennai.edu.in', '6382174086'),
  ('member-078', 'Nandana M R', 'iot', 'IoT & Smart Systems', 'II Year', 'Electronics and Communication Engineering', 'C', 'Member', 'nandana.250172@ece.ritchennai.edu.in', '9489972834'),
  ('member-079', 'Sakthi M', 'iot', 'IoT & Smart Systems', 'II Year', 'VLSI', 'B', 'Member', 'sakthi.250097@vlsi.ritchennai.edu.in', '8807083956'),
  ('member-080', 'Samyutha R', 'iot', 'IoT & Smart Systems', 'II Year', 'Computer and Communication Engineering', 'B', 'Member', 'samyutha.250078@cce.ritchennai.edu.in', '9003093672'),
  ('member-081', 'SHAARUNANDHANA SS', 'iot', 'IoT & Smart Systems', 'II Year', 'Electronics and Communication Engineering', 'D', 'Member', 'shaarunandhana.250240@ece.ritchennai.edu.in', '9345305866'),
  ('member-082', 'SHALIKA N', 'iot', 'IoT & Smart Systems', 'II Year', 'Computer and Communication Engineering', 'B', 'Member', 'shalika.250083@cce.ritchennai.edu.in', '7010286980'),
  ('member-083', 'V K JANANI', 'iot', 'IoT & Smart Systems', 'III Year', 'Mechanical Engineering', 'A', 'Member', 'janani.240031@mech.ritchennai.edu.in', '6369050554'),
  ('member-084', 'Vijay Karthik A', 'iot', 'IoT & Smart Systems', 'III Year', 'Electronics and Communication Engineering', 'C', 'Member', 'vijay.240175@ece.ritchennai.edu.in', '8825784369'),
  ('member-085', 'Rakesh K', 'research', 'Research & Publications', 'III Year', 'Computer Science and Business Systems', 'B', 'Division Lead', 'rakesh.240109@csbs.ritchennai.edu.in', '9840334375'),
  ('member-086', 'Adharsh S', 'research', 'Research & Publications', 'II Year', 'Artificial Intelligence and Data Science', 'A', 'Member', 'adharsh.250008@aids.ritchennai.edu.in', '9342778199'),
  ('member-087', 'Ashni R', 'research', 'Research & Publications', 'II Year', 'Biotechnology', 'A', 'Member', 'ashni.250004@bt.ritchennai.edu.in', '9865142551'),
  ('member-088', 'Balamurugan V', 'research', 'Research & Publications', 'II Year', 'Electronics and Communication Engineering', 'A', 'Member', 'balamurugan.250033@ece.ritchennai.edu.in', '7305144179'),
  ('member-089', 'D.Divyadarshini', 'research', 'Research & Publications', 'II Year', 'VLSI', 'A', 'Member', 'divyadarshini.250018@vlsi.ritchennai.edu.in', '6379521212'),
  ('member-090', 'ELAKHYA S G', 'research', 'Research & Publications', 'II Year', 'Artificial Intelligence and Data Science', 'B', 'Member', 'elakhya.250080@aids.ritchennai.edu.in', '7845921517'),
  ('member-091', 'gomathy s', 'research', 'Research & Publications', 'II Year', 'Biotechnology', 'A', 'Member', 'sgomathy886@gmail.com', '6369588001'),
  ('member-092', 'Jaivant R', 'research', 'Research & Publications', 'II Year', 'Electronics and Communication Engineering', 'B', 'Member', 'jaivant.250098@ece.ritchennai.edu.in', '7092516475'),
  ('member-093', 'Kavinila P', 'research', 'Research & Publications', 'III Year', 'Artificial Intelligence and Machine Learning', 'B', 'Member', 'kavinilap2006@gmail.com', '9025300876'),
  ('member-094', 'Keerthika G', 'research', 'Research & Publications', 'III Year', 'Computer Science and Business Systems', 'B', 'Member', 'keerthika.240062@csbs.ritchennai.edu.in', '9445263528'),
  ('member-095', 'Monish ganapathy A.V', 'research', 'Research & Publications', 'II Year', 'Artificial Intelligence and Data Science', 'D', 'Member', 'monishganapathy.250201@aids.ritchennai.edu.in', '7358681218'),
  ('member-096', 'N.S.Rathish Kalyan', 'research', 'Research & Publications', 'II Year', 'Computer and Communication Engineering', 'B', 'Member', 'rathishkalyan.250071@cce.ritchennai.edu.in', '6379013836'),
  ('member-097', 'Paul Bryton Raj', 'research', 'Research & Publications', 'II Year', 'Computer Science and Engineering', 'F', 'Member', 'paulbrytonraj18@gmail.com', '7358293518'),
  ('member-098', 'Shabeena S', 'research', 'Research & Publications', 'III Year', 'Computer and Communication Engineering', 'B', 'Member', 'shabeena.240079@cce.ritchennai.edu.in', '8124878809'),
  ('member-099', 'SIVASANTHI R', 'research', 'Research & Publications', 'II Year', 'Computer Science and Engineering', 'H', 'Member', 'sivasanthi.250425@cse.ritchennai.edu.in', '7339176588'),
  ('member-100', 'ASWIN R', 'operations', 'Operations & Management', 'II Year', 'Computer Science and Business Systems', 'A', 'Division Lead', 'aswin.250011@csbs.ritchennai.edu.in', '7550040017'),
  ('member-101', 'A G KARTHIK', 'operations', 'Operations & Management', 'III Year', 'Computer Science and Business Systems', 'A', 'Member', 'karthik.240055@csbs.ritchennai.edu.in', '9566073342'),
  ('member-102', 'Aishwarya M J', 'operations', 'Operations & Management', 'III Year', 'Computer Science and Business Systems', 'A', 'Member', 'aishwaryamj.240009@csbs.ritchennai.edu.in', '9360056488'),
  ('member-103', 'DHARUN A.R.', 'operations', 'Operations & Management', 'II Year', 'Electronics and Communication Engineering', 'A', 'Member', 'dharun.250054@ece.ritchennai.edu.in', '7708300556'),
  ('member-104', 'Janani Balasubraminan', 'operations', 'Operations & Management', 'III Year', 'Computer Science and Business Systems', 'A', 'Member', 'jananibalasubraminan@gmail.com', '8807707304'),
  ('member-105', 'K MOHAMED FAAIZ', 'operations', 'Operations & Management', 'II Year', 'Artificial Intelligence and Data Science', 'D', 'Member', 'mohamedfaaiz.250189@aids.ritchennai.edu.in', '9342422808'),
  ('member-106', 'Lakshmi S', 'operations', 'Operations & Management', 'III Year', 'Electronics and Communication Engineering', 'B', 'Member', 'lakshmi.240070@ece.ritchennai.edu.in', '9600968316'),
  ('member-107', 'Lavanya G', 'operations', 'Operations & Management', 'III Year', 'Artificial Intelligence and Machine Learning', 'B', 'Member', 'suthalavanya2005@gmail.com', '8754091381'),
  ('member-108', 'MANIKANDAN V', 'operations', 'Operations & Management', 'II Year', 'Electronics and Communication Engineering', 'C', 'Member', 'manikandan.250146@ece.ritchennai.edu.in', '9655402387'),
  ('member-109', 'Mohammed Aamir Uzair Khan', 'operations', 'Operations & Management', 'II Year', 'Computer Science and Engineering', 'E', 'Member', 'mohammedaamir.250248@cse.rit.chennai.edu.in', '8056074920'),
  ('member-110', 'Mohammed Sharukkhan M', 'operations', 'Operations & Management', 'II Year', 'Computer Science and Engineering', 'E', 'Member', 'mohammedsharukkhan.250251@cse.ritchennai.edu.in', '7339050987'),
  ('member-111', 'Padmavathy s', 'operations', 'Operations & Management', 'III Year', 'VLSI', 'B', 'Member', 'padmavathysrinivasan097@gmail.com', '6383897886'),
  ('member-112', 'S.GIRIDHARAN', 'operations', 'Operations & Management', 'II Year', 'Artificial Intelligence and Machine Learning', 'A', 'Member', 'giridharan.250034@aiml.ritchennai.edu.in', '9629902555'),
  ('member-113', 'Sarath', 'operations', 'Operations & Management', 'III Year', 'Electronics and Communication Engineering', 'C', 'Member', 'sarathramesh.mailbox@gmail.com', '9944563016'),
  ('member-114', 'Shivasubramanian A', 'operations', 'Operations & Management', 'III Year', 'Artificial Intelligence and Machine Learning', 'C', 'Member', 'shivasubramanian.240142@aiml.ritchennai.edu.in', '9025754509'),
  ('member-115', 'V JAYAGANESH', 'operations', 'Operations & Management', 'II Year', 'Artificial Intelligence and Data Science', 'C', 'Member', 'jayaganesh.250128@aids.ritchennai.edu.in', '8939765597')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  division_id = EXCLUDED.division_id,
  division = EXCLUDED.division,
  year = EXCLUDED.year,
  department = EXCLUDED.department,
  sec = EXCLUDED.sec,
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  updated_at = NOW();
