import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaSql = readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');
const billboardMigrationSql = readFileSync(
  path.join(root, 'supabase/migrations/20261116_billboard_schema.sql'),
  'utf8'
);
const memberFormModalTsx = readFileSync(
  path.join(root, 'src/admin/MemberFormModal.tsx'),
  'utf8'
);
const membersTabTsx = readFileSync(
  path.join(root, 'src/admin/MembersTab.tsx'),
  'utf8'
);
const adminDashboardTsx = readFileSync(
  path.join(root, 'src/admin/AdminDashboard.tsx'),
  'utf8'
);

test('Billboard Schema: csr_billboard table is defined with integrity constraints and RLS', () => {
  // Check table creation and columns in both schema.sql and migration
  for (const [sourceName, sql] of [
    ['schema.sql', schemaSql],
    ['20261116_billboard_schema.sql', billboardMigrationSql],
  ]) {
    assert.match(
      sql,
      /CREATE TABLE IF NOT EXISTS csr_billboard\s*\(/i,
      `${sourceName} must create csr_billboard table`
    );
    assert.match(
      sql,
      /position\s+INT\s+NOT\s+NULL\s+UNIQUE\s+CHECK\s*\(position\s*>=\s*1\s+AND\s+position\s*<=\s*6\)/i,
      `${sourceName} must constrain position between 1 and 6`
    );
    assert.match(
      sql,
      /ALTER TABLE csr_billboard ENABLE ROW LEVEL SECURITY/i,
      `${sourceName} must enable row level security on csr_billboard`
    );
    assert.match(
      sql,
      /CREATE POLICY "Allow public read access to billboard"\s+ON csr_billboard\s+FOR SELECT\s+USING\s*\(true\)/i,
      `${sourceName} must allow public read access`
    );
    assert.match(
      sql,
      /CREATE POLICY "Allow admins to manage billboard"\s+ON csr_billboard\s+FOR ALL[\s\S]*?USING\s*\(is_csr_admin\(\)\)[\s\S]*?WITH CHECK\s*\(is_csr_admin\(\)\)/i,
      `${sourceName} must restrict write access to is_csr_admin()`
    );
    assert.match(
      sql,
      /INSERT INTO csr_billboard/i,
      `${sourceName} must seed initial billboard members`
    );
  }
});

test('MemberFormModal: Includes LinkedIn URL input field and bindings', () => {
  assert.match(
    memberFormModalTsx,
    /<label className="form-label">LinkedIn URL<\/label>/,
    'MemberFormModal must render LinkedIn URL label'
  );
  assert.match(
    memberFormModalTsx,
    /value=\{formData\.linkedin_url\}/,
    'MemberFormModal must bind formData.linkedin_url'
  );
  assert.match(
    memberFormModalTsx,
    /onChange=\{e => setFormData\(\{ \.\.\.formData, linkedin_url: e\.target\.value \}\)\}/,
    'MemberFormModal must update formData.linkedin_url on change'
  );
  assert.match(
    memberFormModalTsx,
    /placeholder="https:\/\/linkedin\.com\/in\/username"/,
    'MemberFormModal must provide LinkedIn URL placeholder'
  );
});

test('Admin Operations: AdminHeader "+ Add Member" connects to MembersTab modal state', () => {
  // Verify AdminDashboard manages isAddMemberOpen state
  assert.match(
    adminDashboardTsx,
    /const \[isAddMemberOpen, setIsAddMemberOpen\] = useState\(false\);/,
    'AdminDashboard must track isAddMemberOpen state'
  );

  // Verify AdminHeader onAddMember sets active tab to members and opens the modal
  assert.match(
    adminDashboardTsx,
    /onAddMember=\{\(\) => \{\s*setActiveTab\('members'\);\s*setIsAddMemberOpen\(true\);\s*\}\}/,
    'AdminHeader onAddMember must activate members tab and open modal'
  );

  // Verify MembersTab receives isAddOpen and handler props
  assert.match(
    adminDashboardTsx,
    /<MembersTab[\s\S]*?isAddOpen=\{isAddMemberOpen\}[\s\S]*?onOpenAdd=\{\(\) => setIsAddMemberOpen\(true\)\}[\s\S]*?onCloseAdd=\{\(\) => setIsAddMemberOpen\(false\)\}/,
    'AdminDashboard must pass modal state and callbacks to MembersTab'
  );

  // Verify MembersTab supports external control
  assert.match(
    membersTabTsx,
    /isAddOpen\?: boolean;\s*onOpenAdd\?: \(\) => void;\s*onCloseAdd\?: \(\) => void;/,
    'MembersTabProps must declare isAddOpen, onOpenAdd, and onCloseAdd'
  );
});

test('Service Type Safety: No loose any types in catch blocks or RPC casts', () => {
  const billboardServiceTs = readFileSync(
    path.join(root, 'src/services/billboard.ts'),
    'utf8'
  );
  const membersServiceTs = readFileSync(
    path.join(root, 'src/services/members.ts'),
    'utf8'
  );

  assert.doesNotMatch(
    billboardServiceTs,
    /catch\s*\(\s*\w+\s*:\s*any\s*\)/,
    'billboard.ts must not use : any in catch blocks'
  );
  assert.doesNotMatch(
    membersServiceTs,
    /catch\s*\(\s*\w+\s*:\s*any\s*\)/,
    'members.ts must not use : any in catch blocks'
  );
  assert.doesNotMatch(
    membersServiceTs,
    /\(data as any\)/,
    'members.ts must not use (data as any) for RPC responses'
  );
});
