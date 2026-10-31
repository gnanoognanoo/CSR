import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(root, 'src/members/data.ts'), 'utf8');
const exports = {};
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInNewContext(code, { exports, module: { exports } });
const { members, memberDivisions, memberStats, getMemberStats, getMemberInitials, searchMembers } = exports;

test('member totals count unique records and separate listed profiles from division assignments', () => {
  assert.equal(memberStats.total, 115);
  assert.equal(memberStats.listed, members.length);
  assert.equal(memberStats.divisionMembers, 115);
  assert.equal(memberStats.divisions, memberDivisions.length);
  const changed = [...members, members[0], { ...members[0], id: 'extra-member', name: 'New Record', year: 'IV Year' }];
  const recalculated = getMemberStats(changed);
  assert.equal(recalculated.total, members.length + 1);
  assert.equal(recalculated.listed, members.length + 1);
  assert.equal(recalculated.byDivision.ai, 18);
  assert.equal(recalculated.byYear['IV Year'], 1);
});

test('division counts and year distributions match the seven public roster tables', () => {
  const expected = [
    ['ai', 17, 8, 9], ['embedded', 17, 5, 12], ['robotics', 16, 6, 10],
    ['software', 18, 6, 12], ['iot', 16, 5, 11], ['research', 15, 4, 11],
    ['operations', 16, 8, 8],
  ];
  for (const [id, count, thirdYear, secondYear] of expected) {
    const division = memberDivisions.find(record => record.id === id);
    const records = members.filter(record => record.divisionId === id);
    assert.equal(memberStats.byDivision[id], count);
    assert.equal(records.length, count);
    assert.equal(records.filter(record => record.year === 'III Year').length, thirdYear);
    assert.equal(records.filter(record => record.year === 'II Year').length, secondYear);
    assert.ok(records.every(record => record.division === division.name));
  }
  assert.equal(members.filter(member => member.year === 'III Year').length, 42);
  assert.equal(members.filter(member => member.year === 'II Year').length, 73);
});

test('division leads are included once in the named roster with their source roles', () => {
  assert.equal(members.filter(record => record.role === 'Division Lead').length, 7);
  assert.equal(members.filter(record => record.role === 'Member').length, 108);
  for (const division of memberDivisions) {
    const lead = members.filter(record => record.name === division.lead);
    assert.equal(lead.length, 1);
    assert.equal(lead[0].role, 'Division Lead');
    assert.equal(lead[0].divisionId, division.id);
  }
});

test('public records contain only allowlisted fields and generic stable ordinal keys', () => {
  const allowed = ['department', 'division', 'divisionId', 'id', 'name', 'role', 'year'];
  assert.equal(new Set(members.map(record => record.id)).size, members.length);
  assert.equal(new Set(members.map(record => record.name.toLocaleLowerCase())).size, members.length);
  for (const [index, member] of members.entries()) {
    assert.equal(member.id, `member-${String(index + 1).padStart(3, '0')}`);
    assert.deepEqual(Object.keys(member).sort(), allowed);
    for (const value of Object.values(member)) {
      assert.equal(typeof value, 'string');
      assert.ok(value.length > 0);
      assert.ok(!/[\r\n]/u.test(value), 'wrapped public table cells are normalized');
      assert.ok(!/@|\d{7,}|https?:\/\//u.test(value), 'no contacts or invented profile links');
    }
  }
});

test('source spelling, public department and year fields survive extraction', () => {
  const member = members.find(record => record.name === 'GNANESHWAR R');
  assert.equal(member.division, 'Software Engineering');
  assert.equal(member.department, 'Computer Science and Engineering');
  assert.equal(member.year, 'II Year');
  assert.equal(member.role, 'Member');
  assert.ok(members.some(record => record.name === 'PRISCILLA SHIRLEY PRASHANTH STEPHENS'));
  assert.ok(members.some(record => record.name === 'M.R.Harish'));
  assert.ok(members.some(record => record.name === 'gomathy s'));
  assert.ok(members.some(record => record.department === 'Biotechnology'));
  assert.ok(members.some(record => record.department === 'VLSI'));
});

test('initials are abstract text badges and support source punctuation or single names', () => {
  assert.equal(getMemberInitials('GNANESHWAR R'), 'GR');
  assert.equal(getMemberInitials('M.R.Harish'), 'MH');
  assert.equal(getMemberInitials('Guru prakash Muthusamy'), 'GM');
  assert.equal(getMemberInitials('Dilish'), 'D');
  assert.equal(getMemberInitials(' '), '');
});

test('search matches names and public metadata case-insensitively without changing data', () => {
  const before = JSON.stringify(members);
  assert.equal(searchMembers(members, 'gnaneshwar')[0].name, 'GNANESHWAR R');
  assert.equal(searchMembers(members, 'M.R.Harish')[0].name, 'M.R.Harish');
  assert.equal(searchMembers(members, 'priscilla stephens')[0].name, 'PRISCILLA SHIRLEY PRASHANTH STEPHENS');
  assert.equal(searchMembers(members, 'robotics mechanical').length, 5);
  assert.equal(searchMembers(members, 'Biotechnology').length, 2);
  assert.equal(searchMembers(members, 'no matching member').length, 0);
  assert.equal(searchMembers(members, ' '), members);
  assert.equal(JSON.stringify(members), before);
});

test('public member data is self-contained and the private roster PDF is not published', () => {
  assert.ok(!/\b(?:import|require)\b.*(?:pdf|Downloads|attachments)/u.test(source));
  const paths = [];
  function walk(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const target = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(target);
      else paths.push(target);
    }
  }
  walk(path.join(root, 'public'));
  assert.ok(!paths.some(filename => /csr.*member.*\.pdf$/iu.test(filename)));
  const serialized = JSON.stringify({ members, memberDivisions });
  assert.ok(!/"(?:email|phone|contact|section|privateId|github|linkedin|photo|skills)"\s*:/iu.test(serialized));
});
