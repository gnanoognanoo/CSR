-- ==============================================================================
-- CSR-RIT SECURITY MIGRATION: C3 ONLY
-- Target Issue: C3 - Exposure of student emails and phone numbers
--
-- Problem:
--   1. The base table public.csr_members had a permissive SELECT policy
--      ("csr_members_select_public" USING (true)), allowing anonymous visitors
--      to read private student emails and phone numbers via PostgREST.
--   2. Public frontend services performed select('*') against the base table.
--
-- Fix:
--   1. Create public-safe view public.csr_members_public excluding email, phone, and user_id.
--   2. Grant SELECT on public.csr_members_public to anon and authenticated.
--   3. Replace permissive base-table SELECT policy with csr_members_select_admin_or_owner,
--      restricting base-table reads to authenticated admins, owners, and matching claim candidates.
--   4. Revoke direct SELECT on base table public.csr_members from the anon role.
--
-- Instructions: Run this script in the Supabase Dashboard SQL Editor.
-- ==============================================================================

-- 1. Create public-safe view projecting only approved directory metadata
CREATE OR REPLACE VIEW public.csr_members_public AS
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
FROM public.csr_members;

-- 2. Grant public read access to the safe view
GRANT SELECT ON public.csr_members_public TO anon, authenticated;

-- 3. Restrict base-table SELECT access on public.csr_members
DROP POLICY IF EXISTS "csr_members_select_public" ON public.csr_members;
DROP POLICY IF EXISTS "csr_members_select_admin_or_owner" ON public.csr_members;

CREATE POLICY "csr_members_select_admin_or_owner"
  ON public.csr_members FOR SELECT
  TO authenticated
  USING (
    is_csr_admin()
    OR user_id = auth.uid()
    OR (email IS NOT NULL AND LOWER(email) = LOWER(auth.jwt()->>'email'))
  );

-- 4. Ensure table-level privileges prevent anonymous access to base table
GRANT SELECT ON public.csr_members TO authenticated;
REVOKE SELECT ON public.csr_members FROM anon;
