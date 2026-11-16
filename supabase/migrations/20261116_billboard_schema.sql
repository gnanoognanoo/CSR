-- ==============================================================================
-- MIGRATION: 20261116_billboard_schema.sql
-- Create Executive Council Billboard Table & Hardened RLS Policies
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
