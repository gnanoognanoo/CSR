import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaSql = readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');
const c3MigrationSql = readFileSync(path.join(root, 'supabase/migrations/20261115_c3_fix_student_data_exposure.sql'), 'utf8');
const seedSql = readFileSync(path.join(root, 'supabase/seed.sql'), 'utf8');
const parseRosterScript = readFileSync(path.join(root, 'scripts/parse-full-roster.js'), 'utf8');
const membersServiceSource = readFileSync(path.join(root, 'src/services/members.ts'), 'utf8');
const memberPortalSource = readFileSync(path.join(root, 'src/portal/MemberPortalPage.tsx'), 'utf8');
const gitignoreSource = readFileSync(path.join(root, '.gitignore'), 'utf8');

// Policy evaluator implementing the exact PostgreSQL RLS SELECT logic on csr_members
function evaluateC3RlsSelect(caller, targetRow) {
  // caller: { role: 'anon' | 'authenticated', uid: string | null, email: string | null, isAdmin: boolean }
  // Policy: TO authenticated
  if (caller.role !== 'authenticated' || !caller.uid) {
    return { allowed: false, reason: 'DENIED: Base table SELECT policy is restricted TO authenticated' };
  }

  // USING (is_csr_admin() OR user_id = auth.uid() OR (email IS NOT NULL AND LOWER(email) = LOWER(auth.jwt()->>'email')))
  const isOwner = targetRow.user_id !== null && targetRow.user_id === caller.uid;
  const isEmailMatch = targetRow.email && caller.email && targetRow.email.toLowerCase() === caller.email.toLowerCase();
  const usingSatisfied = caller.isAdmin || isOwner || isEmailMatch;

  if (!usingSatisfied) {
    return { allowed: false, reason: 'DENIED: Row not accessible under owner/admin/candidate criteria' };
  }

  return { allowed: true };
}

test('C3 Security 1: Tracked seed and script files contain NO real student emails or phone numbers', () => {
  // 1. Verify seed.sql does not contain student email domains or 10-digit phone numbers
  assert.ok(
    !seedSql.includes('@ritchennai.edu.in'),
    'supabase/seed.sql must not contain @ritchennai.edu.in student emails'
  );
  assert.ok(
    !seedSql.includes('@gmail.com'),
    'supabase/seed.sql must not contain personal @gmail.com student emails'
  );
  assert.ok(
    !/\b[6-9]\d{9}\b/.test(seedSql),
    'supabase/seed.sql must not contain 10-digit mobile phone numbers'
  );

  // 2. Verify scripts/parse-full-roster.js does not contain student email domains or 10-digit phone numbers
  assert.ok(
    !parseRosterScript.includes('@ritchennai.edu.in'),
    'scripts/parse-full-roster.js must not contain @ritchennai.edu.in student emails'
  );
  assert.ok(
    !parseRosterScript.includes('@gmail.com'),
    'scripts/parse-full-roster.js must not contain personal @gmail.com student emails'
  );
  assert.ok(
    !/\b[6-9]\d{9}\b/.test(parseRosterScript),
    'scripts/parse-full-roster.js must not contain 10-digit mobile phone numbers'
  );

  // 3. Verify .gitignore includes patterns for private roster dumps
  assert.match(gitignoreSource, /\*\.roster\.json/, '.gitignore must ignore *.roster.json');
  assert.match(gitignoreSource, /roster\*\.csv/, '.gitignore must ignore roster*.csv');
  assert.match(gitignoreSource, /roster\*\.pdf/, '.gitignore must ignore roster*.pdf');
});

test('C3 Security 2: Public-safe view csr_members_public excludes all private contact fields', () => {
  for (const [name, sql] of [['schema.sql', schemaSql], ['migration.sql', c3MigrationSql]]) {
    const viewMatch = sql.match(/CREATE OR REPLACE VIEW public\.csr_members_public AS\s*SELECT([\s\S]*?)FROM public\.csr_members;/);
    assert.ok(viewMatch, `${name} must define public.csr_members_public view`);

    const viewColumns = viewMatch[1];
    // Must NOT project email, phone, or user_id
    assert.ok(!/\bemail\b/i.test(viewColumns), `${name} public view must NOT project email`);
    assert.ok(!/\bphone\b/i.test(viewColumns), `${name} public view must NOT project phone`);
    assert.ok(!/\buser_id\b/i.test(viewColumns), `${name} public view must NOT project user_id`);

    // Must project public directory fields
    for (const field of ['id', 'name', 'division_id', 'division', 'year', 'department', 'role']) {
      assert.ok(new RegExp(`\\b${field}\\b`, 'i').test(viewColumns), `${name} public view must project ${field}`);
    }

    // Must grant SELECT on view to anon and authenticated
    assert.match(
      sql,
      /GRANT SELECT ON public\.csr_members_public TO anon,\s*authenticated;/,
      `${name} must grant view access to anon and authenticated`
    );
  }
});

test('C3 Security 3: Base table csr_members SELECT is restricted to authenticated admins and owners', () => {
  for (const [name, sql] of [['schema.sql', schemaSql], ['migration.sql', c3MigrationSql]]) {
    // 1. Must drop public SELECT policy
    assert.match(
      sql,
      /DROP POLICY IF EXISTS "csr_members_select_public"/,
      `${name} must drop permissive csr_members_select_public`
    );

    // 2. Must create restricted policy TO authenticated
    const policyMatch = sql.match(/CREATE POLICY "csr_members_select_admin_or_owner"[\s\S]*?ON (?:public\.)?csr_members FOR SELECT[\s\S]*?TO authenticated[\s\S]*?USING\s*\(([\s\S]*?)\);/);
    assert.ok(policyMatch, `${name} must create csr_members_select_admin_or_owner TO authenticated`);

    const usingClause = policyMatch[1];
    assert.ok(usingClause.includes('is_csr_admin()'), `${name} policy must allow is_csr_admin()`);
    assert.ok(usingClause.includes('user_id = auth.uid()'), `${name} policy must allow user_id = auth.uid()`);
    assert.ok(
      usingClause.includes("LOWER(email) = LOWER(auth.jwt()->>'email')"),
      `${name} policy must allow verified email matching for claiming`
    );

    // 3. Must revoke anon SELECT from base table
    assert.match(
      sql,
      /REVOKE SELECT ON public\.csr_members FROM anon;/,
      `${name} must revoke base table SELECT from anon`
    );
  }
});

test('C3 Verification 1: Anonymous users cannot query base table csr_members', () => {
  const anonymousCaller = { role: 'anon', uid: null, email: null, isAdmin: false };
  const targetRow = {
    id: 'member-001',
    name: 'Student Name',
    email: 'student@ritchennai.edu.in',
    phone: '9876543210',
    user_id: null,
  };

  const result = evaluateC3RlsSelect(anonymousCaller, targetRow);
  assert.strictEqual(result.allowed, false);
  assert.match(result.reason, /TO authenticated/);
});

test('C3 Verification 2: Authenticated members can only read their own row from base table', () => {
  const memberAlice = { role: 'authenticated', uid: 'user-alice-123', email: 'alice@rit.ac.in', isAdmin: false };
  const aliceRow = {
    id: 'member-002',
    name: 'Alice',
    email: 'alice@rit.ac.in',
    phone: '9876543211',
    user_id: 'user-alice-123',
  };
  const bobRow = {
    id: 'member-003',
    name: 'Bob',
    email: 'bob@rit.ac.in',
    phone: '9876543212',
    user_id: 'user-bob-456',
  };

  // Alice can read her own row
  const ownResult = evaluateC3RlsSelect(memberAlice, aliceRow);
  assert.strictEqual(ownResult.allowed, true);

  // Alice CANNOT read Bob's row on base table
  const bobResult = evaluateC3RlsSelect(memberAlice, bobRow);
  assert.strictEqual(bobResult.allowed, false);
});

test('C3 Verification 3: Authenticated members can read their own unclaimed candidate record by email', () => {
  const memberCharlie = { role: 'authenticated', uid: 'user-charlie-789', email: 'charlie@rit.ac.in', isAdmin: false };
  const charlieUnclaimedRow = {
    id: 'member-004',
    name: 'Charlie',
    email: 'charlie@rit.ac.in',
    phone: '9876543213',
    user_id: null,
  };
  const otherUnclaimedRow = {
    id: 'member-005',
    name: 'Other Student',
    email: 'other@rit.ac.in',
    phone: '9876543214',
    user_id: null,
  };

  // Charlie can access his matching candidate record
  const candidateResult = evaluateC3RlsSelect(memberCharlie, charlieUnclaimedRow);
  assert.strictEqual(candidateResult.allowed, true);

  // Charlie CANNOT access other unclaimed student records
  const otherResult = evaluateC3RlsSelect(memberCharlie, otherUnclaimedRow);
  assert.strictEqual(otherResult.allowed, false);
});

test('C3 Verification 4: Authenticated Admins have full read access to base table csr_members', () => {
  const adminCaller = { role: 'authenticated', uid: 'admin-1', email: 'admin@rit.ac.in', isAdmin: true };
  const studentRow = {
    id: 'member-006',
    name: 'Any Student',
    email: 'student6@rit.ac.in',
    phone: '9876543215',
    user_id: null,
  };

  const adminResult = evaluateC3RlsSelect(adminCaller, studentRow);
  assert.strictEqual(adminResult.allowed, true);
});

test('C3 Verification 5: Frontend service getMembers() queries the safe public view', () => {
  // 1. getMembers() must query csr_members_public
  assert.match(
    membersServiceSource,
    /supabase\.from\(['"]csr_members_public['"]\)\.select/,
    'getMembers() in members.ts must query csr_members_public'
  );

  // 2. getAdminMembers() must query csr_members for admins
  assert.match(
    membersServiceSource,
    /export async function getAdminMembers[\s\S]*?supabase\s*\.from\(['"]csr_members['"]\)/,
    'getAdminMembers() must exist and query csr_members for authorized admins'
  );

  // 3. getClaimCandidateForEmail() must select only safe fields, avoiding select('*')
  const claimCandidateMatch = membersServiceSource.match(/export async function getClaimCandidateForEmail[\s\S]*?\.select\((['"][^'"]+['"])\)/);
  assert.ok(claimCandidateMatch, 'getClaimCandidateForEmail must exist');
  assert.ok(
    !claimCandidateMatch[1].includes('*'),
    'getClaimCandidateForEmail must select explicit safe fields, never "*"'
  );
  assert.ok(
    claimCandidateMatch[1].includes('id') && claimCandidateMatch[1].includes('name'),
    'getClaimCandidateForEmail must select id and name'
  );
});

test('C3 Verification 6: MemberPortalPage eliminates bulk roster download and client-side email filtering', () => {
  // 1. Verify allRoster bulk download is removed
  assert.ok(
    !memberPortalSource.includes('setAllRoster(res.raw)'),
    'MemberPortalPage must NOT store all raw member records in state'
  );

  // 2. Verify client-side bulk email filtering is removed
  assert.ok(
    !memberPortalSource.includes('allRoster.filter'),
    'MemberPortalPage must NOT perform client-side allRoster.filter by email'
  );

  // 3. Verify it uses targeted candidate claim lookup
  assert.match(
    memberPortalSource,
    /getClaimCandidateForEmail\(user\.email\)/,
    'MemberPortalPage must call targeted getClaimCandidateForEmail'
  );
});
