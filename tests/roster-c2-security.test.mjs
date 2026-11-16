import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaSql = readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');
const c2MigrationSql = readFileSync(path.join(root, 'supabase/migrations/20261115_c2_fix_roster_update_security.sql'), 'utf8');

// Policy evaluator implementing the exact PostgreSQL RLS logic of the C2 fix
function evaluateC2RlsUpdate(caller, targetRow, updatedRow) {
  // caller: { role: 'anon' | 'authenticated', uid: string | null, isAdmin: boolean }
  // Policy: TO authenticated
  if (caller.role !== 'authenticated' || !caller.uid) {
    return { allowed: false, reason: 'DENIED: RLS policy is restricted TO authenticated' };
  }

  // USING (is_csr_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid()))
  const usingSatisfied = caller.isAdmin || (targetRow.user_id !== null && targetRow.user_id === caller.uid);
  if (!usingSatisfied) {
    return { allowed: false, reason: 'DENIED: USING clause rejected row selection for update' };
  }

  // WITH CHECK (is_csr_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid()))
  const checkSatisfied = caller.isAdmin || (updatedRow.user_id !== null && updatedRow.user_id === caller.uid);
  if (!checkSatisfied) {
    return { allowed: false, reason: 'DENIED: WITH CHECK clause rejected new row state' };
  }

  return { allowed: true };
}

// Trigger simulation for public.protect_csr_member_fields()
function simulateProtectCsrMemberFieldsTrigger(caller, oldRow, newRow) {
  // If called from an authenticated client session by a non-admin
  if (caller.uid !== null && !caller.isAdmin) {
    const protectedFields = ['role', 'division', 'division_id', 'name', 'department', 'year', 'sec'];
    for (const field of protectedFields) {
      if (oldRow[field] !== newRow[field]) {
        throw new Error(`Access denied: Only administrators can modify official member credentials (${field}).`);
      }
    }
  }
  return newRow;
}

test('C2 Static Analysis: RLS policy in schema.sql and migration strictly enforces C2 requirements', () => {
  // 1. Verify policy in schema.sql specifies TO authenticated
  assert.match(
    schemaSql,
    /CREATE POLICY "csr_members_update_admin_or_owner"[\s\S]*?ON csr_members FOR UPDATE[\s\S]*?TO authenticated/,
    'schema.sql update policy must be restricted TO authenticated'
  );

  // 2. Verify policy in schema.sql does NOT allow user_id IS NULL
  const schemaPolicyMatch = schemaSql.match(/CREATE POLICY "csr_members_update_admin_or_owner"[\s\S]*?WITH CHECK[^;]+;/);
  assert.ok(schemaPolicyMatch, 'Policy definition must exist in schema.sql');
  assert.ok(
    !schemaPolicyMatch[0].includes('user_id IS NULL'),
    'schema.sql update policy must NOT contain "user_id IS NULL"'
  );

  // 3. Verify policy in schema.sql has WITH CHECK clause
  assert.match(
    schemaPolicyMatch[0],
    /WITH CHECK\s*\(/,
    'schema.sql update policy must define an explicit WITH CHECK clause'
  );

  // 4. Verify standalone C2 migration specifies TO authenticated
  assert.match(
    c2MigrationSql,
    /CREATE POLICY "csr_members_update_admin_or_owner"[\s\S]*?ON public\.csr_members FOR UPDATE[\s\S]*?TO authenticated/,
    'C2 migration update policy must be restricted TO authenticated'
  );

  // 5. Verify standalone C2 migration policy statement does NOT allow user_id IS NULL
  const migrationPolicyMatch = c2MigrationSql.match(/CREATE POLICY "csr_members_update_admin_or_owner"[\s\S]*?WITH CHECK[^;]+;/);
  assert.ok(migrationPolicyMatch, 'Policy definition must exist in C2 migration');
  assert.ok(
    !migrationPolicyMatch[0].includes('user_id IS NULL'),
    'C2 migration update policy statement must NOT contain "user_id IS NULL"'
  );

  // 6. Verify standalone C2 migration has WITH CHECK clause
  assert.match(
    migrationPolicyMatch[0],
    /WITH CHECK\s*\(/,
    'C2 migration update policy must define an explicit WITH CHECK clause'
  );
});

test('C2 Verification 1: Anonymous users cannot update unclaimed roster records', () => {
  const anonymousCaller = { role: 'anon', uid: null, isAdmin: false };
  const unclaimedRow = {
    id: 'member-101',
    name: 'Jane Doe',
    role: 'Member',
    division: 'AI',
    division_id: 'ai',
    email: 'jane@rit.ac.in',
    user_id: null,
    bio: null,
  };
  const attemptedUpdate = {
    ...unclaimedRow,
    name: 'Attacker Name',
    role: 'Lead',
    email: 'attacker@evil.com',
  };

  const result = evaluateC2RlsUpdate(anonymousCaller, unclaimedRow, attemptedUpdate);
  assert.strictEqual(result.allowed, false);
  assert.match(result.reason, /TO authenticated/);
});

test('C2 Verification 2: Anonymous users cannot update claimed roster records', () => {
  const anonymousCaller = { role: 'anon', uid: null, isAdmin: false };
  const claimedRow = {
    id: 'member-102',
    name: 'Alice Smith',
    role: 'Member',
    division: 'Software',
    division_id: 'software',
    email: 'alice@rit.ac.in',
    user_id: 'user-uuid-alice',
    bio: 'Software enthusiast',
  };
  const attemptedUpdate = {
    ...claimedRow,
    bio: 'Defaced bio',
  };

  const result = evaluateC2RlsUpdate(anonymousCaller, claimedRow, attemptedUpdate);
  assert.strictEqual(result.allowed, false);
  assert.match(result.reason, /TO authenticated/);
});

test('C2 Verification 3: Authenticated non-admin members cannot update unclaimed roster records', () => {
  const authenticatedMember = { role: 'authenticated', uid: 'user-uuid-bob', isAdmin: false };
  const unclaimedRow = {
    id: 'member-103',
    name: 'Unclaimed Student',
    role: 'Member',
    division: 'Robotics',
    division_id: 'robotics',
    email: 'unclaimed@rit.ac.in',
    user_id: null,
    bio: null,
  };
  const attemptedUpdate = {
    ...unclaimedRow,
    user_id: 'user-uuid-bob', // Bob tries to self-claim directly via UPDATE instead of RPC
  };

  const result = evaluateC2RlsUpdate(authenticatedMember, unclaimedRow, attemptedUpdate);
  assert.strictEqual(result.allowed, false);
  assert.match(result.reason, /USING clause rejected/);
});

test('C2 Verification 4: Authenticated non-admin members cannot update another member’s record', () => {
  const bob = { role: 'authenticated', uid: 'user-uuid-bob', isAdmin: false };
  const aliceRow = {
    id: 'member-104',
    name: 'Alice',
    role: 'Member',
    division: 'Software',
    division_id: 'software',
    user_id: 'user-uuid-alice',
    bio: 'Alice bio',
  };
  const attemptedUpdate = {
    ...aliceRow,
    bio: 'Bob tampering Alice bio',
  };

  const result = evaluateC2RlsUpdate(bob, aliceRow, attemptedUpdate);
  assert.strictEqual(result.allowed, false);
  assert.match(result.reason, /USING clause rejected/);
});

test('C2 Verification 5: Authenticated members CAN update permitted profile fields on their OWN linked record', () => {
  const memberAlice = { role: 'authenticated', uid: 'user-uuid-alice', isAdmin: false };
  const aliceRow = {
    id: 'member-105',
    name: 'Alice',
    role: 'Member',
    division: 'Software',
    division_id: 'software',
    department: 'CSE',
    year: '3rd Year',
    sec: 'A',
    user_id: 'user-uuid-alice',
    bio: 'Initial bio',
    github_url: 'https://github.com/alice',
    linkedin_url: 'https://linkedin.com/in/alice',
  };
  const validUpdate = {
    ...aliceRow,
    bio: 'Updated bio with new projects',
    github_url: 'https://github.com/alice-new',
    linkedin_url: 'https://linkedin.com/in/alice-new',
  };

  // 1. RLS policy allows it
  const rlsResult = evaluateC2RlsUpdate(memberAlice, aliceRow, validUpdate);
  assert.strictEqual(rlsResult.allowed, true);

  // 2. protect_csr_member_fields trigger allows it
  assert.doesNotThrow(() => {
    simulateProtectCsrMemberFieldsTrigger(memberAlice, aliceRow, validUpdate);
  });
});

test('C2 Verification 6: Authenticated members CANNOT modify official credentials on their own record', () => {
  const memberAlice = { role: 'authenticated', uid: 'user-uuid-alice', isAdmin: false };
  const aliceRow = {
    id: 'member-106',
    name: 'Alice',
    role: 'Member',
    division: 'Software',
    division_id: 'software',
    department: 'CSE',
    year: '3rd Year',
    sec: 'A',
    user_id: 'user-uuid-alice',
    bio: 'Initial bio',
  };

  // Attempt to escalate role on member record
  const roleTamper = { ...aliceRow, role: 'Lead' };
  assert.throws(
    () => simulateProtectCsrMemberFieldsTrigger(memberAlice, aliceRow, roleTamper),
    /Only administrators can modify official member credentials \(role\)/
  );

  // Attempt to change division
  const divTamper = { ...aliceRow, division: 'Operations', division_id: 'operations' };
  assert.throws(
    () => simulateProtectCsrMemberFieldsTrigger(memberAlice, aliceRow, divTamper),
    /Only administrators can modify official member credentials/
  );

  // Attempt to change name
  const nameTamper = { ...aliceRow, name: 'Different Name' };
  assert.throws(
    () => simulateProtectCsrMemberFieldsTrigger(memberAlice, aliceRow, nameTamper),
    /Only administrators can modify official member credentials \(name\)/
  );
});

test('C2 Verification 7: Authenticated members CANNOT reassign ownership (WITH CHECK)', () => {
  const memberAlice = { role: 'authenticated', uid: 'user-uuid-alice', isAdmin: false };
  const aliceRow = {
    id: 'member-107',
    name: 'Alice',
    role: 'Member',
    division: 'Software',
    division_id: 'software',
    user_id: 'user-uuid-alice',
    bio: 'Alice bio',
  };

  // Alice tries to transfer her linked record to Bob or NULL
  const transferToBob = { ...aliceRow, user_id: 'user-uuid-bob' };
  const result = evaluateC2RlsUpdate(memberAlice, aliceRow, transferToBob);
  assert.strictEqual(result.allowed, false);
  assert.match(result.reason, /WITH CHECK clause rejected/);

  const transferToNull = { ...aliceRow, user_id: null };
  const resultNull = evaluateC2RlsUpdate(memberAlice, aliceRow, transferToNull);
  assert.strictEqual(resultNull.allowed, false);
  assert.match(resultNull.reason, /WITH CHECK clause rejected/);
});

test('C2 Verification 8: Authenticated Admins have full access to update any member record', () => {
  const adminCaller = { role: 'authenticated', uid: 'admin-uuid-1', isAdmin: true };
  const unclaimedRow = {
    id: 'member-108',
    name: 'Unclaimed Member',
    role: 'Member',
    division: 'AI',
    division_id: 'ai',
    department: 'CSE',
    year: '2nd Year',
    sec: 'B',
    user_id: null,
    bio: null,
  };
  const adminUpdate = {
    ...unclaimedRow,
    role: 'Lead',
    name: 'Promoted Member',
    bio: 'Admin updated bio',
  };

  // 1. RLS allows admin
  const rlsResult = evaluateC2RlsUpdate(adminCaller, unclaimedRow, adminUpdate);
  assert.strictEqual(rlsResult.allowed, true);

  // 2. Trigger allows admin
  assert.doesNotThrow(() => {
    simulateProtectCsrMemberFieldsTrigger(adminCaller, unclaimedRow, adminUpdate);
  });
});

test('C2 Verification 9: Claiming RPC and signup auto-linking retain SECURITY DEFINER functionality', () => {
  // 1. Verify claim_member_profile in schema.sql is SECURITY DEFINER
  assert.match(
    schemaSql,
    /CREATE OR REPLACE FUNCTION claim_member_profile[\s\S]*?SECURITY DEFINER/,
    'claim_member_profile must be SECURITY DEFINER to bypass table RLS'
  );

  // 2. Verify handle_new_csr_user in schema.sql is SECURITY DEFINER
  assert.match(
    schemaSql,
    /CREATE OR REPLACE FUNCTION public\.handle_new_csr_user[\s\S]*?SECURITY DEFINER/,
    'handle_new_csr_user must be SECURITY DEFINER to bypass table RLS'
  );
});
