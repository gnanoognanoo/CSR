-- ==============================================================================
-- CSR-RIT SECURITY MIGRATION: C2 ONLY
-- Target Issue: C2 - Unauthorized public roster modification
--
-- Problem:
--   The UPDATE policy on public.csr_members previously allowed rows where
--   "user_id IS NULL" without restricting the policy to authenticated users.
--   Consequently, unauthenticated (anonymous) visitors using the public anon
--   API key could update unclaimed roster records.
--
-- Fix:
--   1. Restrict the policy explicitly TO authenticated users.
--   2. Remove the permissive "OR user_id IS NULL" clause.
--   3. Add an explicit WITH CHECK clause matching the USING expression.
--   4. Preserve admin access (is_csr_admin()) and owner access (user_id = auth.uid()).
--
-- Instructions: Run this script in the Supabase Dashboard SQL Editor.
-- ==============================================================================

-- 1. Recreate the UPDATE policy on csr_members with proper restrictions
DROP POLICY IF EXISTS "csr_members_update_admin_or_owner" ON public.csr_members;

CREATE POLICY "csr_members_update_admin_or_owner"
  ON public.csr_members FOR UPDATE
  TO authenticated
  USING (is_csr_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid()))
  WITH CHECK (is_csr_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));
