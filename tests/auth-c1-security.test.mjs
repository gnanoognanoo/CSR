import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaSql = readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');
const migrationSql = readFileSync(path.join(root, 'supabase/migrations/20261115_c1_fix_admin_privilege_escalation.sql'), 'utf8');
const authContextSource = readFileSync(path.join(root, 'src/context/AuthContext.tsx'), 'utf8');

// Simulation of the database trigger public.handle_new_csr_user() logic
function simulateHandleNewUserTrigger(user, profilesTable = new Map()) {
  if (profilesTable.has(user.id)) {
    // ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();
    const existing = profilesTable.get(user.id);
    const updated = { ...existing, email: user.email, updated_at: new Date().toISOString() };
    profilesTable.set(user.id, updated);
    return updated;
  }

  // C1 FIX: Always assign 'member', never trust raw_user_meta_data->>'role'
  const newProfile = {
    id: user.id,
    email: user.email,
    full_name: user.raw_user_meta_data?.full_name || user.email.split('@')[0],
    role: 'member',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  profilesTable.set(user.id, newProfile);
  return newProfile;
}

// Simulation of AuthContext profile resolution & fallback creation
function simulateAuthContextProfile(user, existingProfile) {
  if (existingProfile) {
    const role = existingProfile.role ?? null;
    return {
      profile: existingProfile,
      role,
      isAdmin: role === 'admin',
      isMember: Boolean(user),
    };
  }

  // Fallback profile creation in AuthContext.tsx
  const fallbackProfile = {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member',
    role: 'member', // C1 FIX: Strictly 'member'
  };

  const role = fallbackProfile.role;
  return {
    profile: fallbackProfile,
    role,
    isAdmin: role === 'admin',
    isMember: Boolean(user),
  };
}

test('C1 Security: SQL files never trust raw_user_meta_data role or assign dynamic roles during signup', () => {
  // 1. Verify schema.sql does not reference raw_user_meta_data->>'role'
  assert.ok(
    !schemaSql.includes("raw_user_meta_data->>'role'"),
    'supabase/schema.sql must not read role from raw_user_meta_data'
  );

  // 2. Verify migration file does not reference raw_user_meta_data->>'role'
  assert.ok(
    !migrationSql.includes("raw_user_meta_data->>'role'"),
    'C1 migration must not read role from raw_user_meta_data'
  );

  // 3. Verify handle_new_csr_user in schema.sql assigns literal 'member'
  assert.match(
    schemaSql,
    /'member',\s*-- C1 FIX: Always 'member'/,
    "schema.sql handle_new_csr_user() must hardcode 'member'"
  );

  // 4. Verify handle_new_csr_user in migration assigns literal 'member'
  assert.match(
    migrationSql,
    /'member',\s*-- C1 FIX: Always 'member'/,
    "migration handle_new_csr_user() must hardcode 'member'"
  );
});

test('C1 Security: AuthContext.tsx never trusts client-supplied user_metadata for role assignment', () => {
  // 1. Verify AuthContext.tsx does not read user_metadata?.role
  assert.ok(
    !authContextSource.includes('user_metadata?.role'),
    'src/context/AuthContext.tsx must not read user_metadata?.role'
  );

  // 2. Verify fallback profile creation hardcodes role: 'member'
  assert.match(
    authContextSource,
    /role:\s*'member'/,
    "AuthContext fallback profile must specify role: 'member'"
  );
});

test('C1 Verification 1: Signup with role "member" results in role "member"', () => {
  const newUser = {
    id: 'usr-regular-001',
    email: 'student@ritchennai.edu.in',
    raw_user_meta_data: {
      full_name: 'Regular Student',
      role: 'member',
    },
    user_metadata: {
      full_name: 'Regular Student',
      role: 'member',
    },
  };

  const dbProfile = simulateHandleNewUserTrigger(newUser);
  assert.equal(dbProfile.role, 'member', 'Database trigger must assign member');

  const authState = simulateAuthContextProfile(newUser, null);
  assert.equal(authState.profile.role, 'member');
  assert.equal(authState.isAdmin, false, 'Regular member must not be admin');
  assert.equal(authState.isMember, true);
});

test('C1 Verification 2: Signup with role "admin" (tampered metadata) STILL results in role "member"', () => {
  const attackerUser = {
    id: 'usr-attacker-002',
    email: 'attacker@ritchennai.edu.in',
    raw_user_meta_data: {
      full_name: 'Privilege Escalation Attempt',
      role: 'admin', // Malicious attempt to self-promote to admin
    },
    user_metadata: {
      full_name: 'Privilege Escalation Attempt',
      role: 'admin',
    },
  };

  // 1. Database trigger check
  const dbProfile = simulateHandleNewUserTrigger(attackerUser);
  assert.equal(
    dbProfile.role,
    'member',
    'Privilege escalation thwarted: Trigger must assign "member" even when role="admin" is supplied'
  );

  // 2. Client-side AuthContext fallback check
  const authState = simulateAuthContextProfile(attackerUser, null);
  assert.equal(
    authState.profile.role,
    'member',
    'AuthContext fallback must assign "member" even when metadata specifies "admin"'
  );
  assert.equal(
    authState.isAdmin,
    false,
    'Attacker must not have isAdmin=true under any circumstances during signup'
  );

  // 3. Test arbitrary privileged strings: 'lead', 'superuser', 'owner'
  for (const maliciousRole of ['lead', 'superuser', 'owner', 'administrator']) {
    const userWithRole = {
      id: `usr-attacker-${maliciousRole}`,
      email: `${maliciousRole}@ritchennai.edu.in`,
      raw_user_meta_data: { role: maliciousRole },
      user_metadata: { role: maliciousRole },
    };
    const profile = simulateHandleNewUserTrigger(userWithRole);
    assert.equal(profile.role, 'member', `Role "${maliciousRole}" must be ignored and assigned "member"`);
  }
});

test('C1 Verification 3: Existing legitimate admins retain their admin permissions and roles', () => {
  const adminId = 'usr-admin-legitimate-001';
  const existingProfiles = new Map([
    [
      adminId,
      {
        id: adminId,
        email: 'official-admin@ritchennai.edu.in',
        full_name: 'Official Administrator',
        role: 'admin',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
  ]);

  const adminAuthUser = {
    id: adminId,
    email: 'official-admin@ritchennai.edu.in',
    raw_user_meta_data: {
      full_name: 'Official Administrator',
      role: 'admin',
    },
    user_metadata: {
      full_name: 'Official Administrator',
      role: 'admin',
    },
  };

  // Re-triggering or logging in with existing admin account
  const retriggeredProfile = simulateHandleNewUserTrigger(adminAuthUser, existingProfiles);
  assert.equal(retriggeredProfile.role, 'admin', 'Existing admin must retain role="admin"');

  // Verify AuthContext state for existing admin
  const adminState = simulateAuthContextProfile(adminAuthUser, retriggeredProfile);
  assert.equal(adminState.role, 'admin');
  assert.equal(adminState.isAdmin, true, 'Legitimate admin must retain isAdmin=true');
  assert.equal(adminState.isMember, true);
});

