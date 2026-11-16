import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadTypeScript(filename, imports = {}, globals = {}) {
  const code = ts.transpileModule(readFileSync(path.join(root, 'src', filename), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  const context = { exports, module: { exports }, ...globals, require: name => {
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  } };
  vm.runInNewContext(code, context, { filename });
  return context.module.exports;
}
const data = loadTypeScript('members/data.ts');
const common = { react: React, 'react/jsx-runtime': jsxRuntime, 'react-dom': { createPortal: children => children }, './overlays.css': {} };
const profile = loadTypeScript('members/MemberProfile.tsx', { ...common, './data': data }, { document: { body: {} } });
const directory = loadTypeScript('members/MemberDirectory.tsx', { ...common, './data': data, './MemberProfile': profile }, { document: { body: {} } });
const renderProfile = member => renderToStaticMarkup(React.createElement(profile.MemberProfile, { member, onClose: () => {} }));

test('member profile displays the actual roster name and every supplied public metadata field', () => {
  const member = data.members[0];
  const markup = renderProfile(member);
  for (const value of [member.name, member.division, member.role, member.year, member.department]) {
    assert.ok(markup.includes(value.replaceAll('&', '&amp;')), `Profile should contain ${value}`);
  }
  assert.ok(markup.includes(data.getMemberInitials(member.name)));
  assert.match(markup, /<dialog[^>]+aria-labelledby=/);
  assert.match(markup, /Close member profile/);
  assert.ok(!markup.includes(member.id), 'local record key is never rendered as public identity');
});

test('member profile omits absent fields and has no fabricated portfolio sections or links', () => {
  const markup = renderProfile({ id: 'missing-fields', name: 'Name Only' });
  assert.match(markup, /Name Only/);
  assert.ok(!markup.includes('members-profile__metadata'));
  assert.ok(!/<dt>(?:Year|Department|Role|Division)<\/dt>/.test(markup));
  assert.ok(!/GitHub|LinkedIn|Skills|About|Projects|<a\b|<img\b/.test(markup));
  assert.equal(renderProfile(null), '');
});

test('profile uses a public field allowlist even if a record contains extra private information', () => {
  const markup = renderProfile({
    ...data.members[0], email: 'private-contact@example.test', phone: '9876543210',
    section: 'Private section label', registerNumber: 'PRIVATE-IDENTIFIER-007',
    skills: ['Invented skill'], github: 'https://example.test/private-profile',
  });
  for (const value of ['private-contact', '9876543210', 'Private section', 'PRIVATE-IDENTIFIER', 'Invented skill', 'example.test']) {
    assert.ok(!markup.includes(value), `${value} must not be displayed`);
  }
});

test('directory combines public-name search and division, year and department filters without altering the roster', () => {
  const filters = { query: '', division: 'all', year: 'all', department: 'all' };
  assert.equal(directory.filterMemberDirectory(data.members, filters).length, 115);
  const member = data.members.find(candidate => candidate.divisionId === 'software');
  const results = directory.filterMemberDirectory(data.members, {
    query: member.name.toLocaleLowerCase(), division: member.divisionId,
    year: member.year, department: member.department,
  });
  assert.deepEqual(Array.from(results, candidate => candidate.id), [member.id]);
  assert.equal(results[0], member, 'Directory preserves the authoritative shared record');
  assert.equal(directory.filterMemberDirectory(data.members, { ...filters, query: member.name, division: 'ai' }).length, 0);
  assert.equal(directory.filterMemberDirectory(data.members, { ...filters, query: 'nonexistent member' }).length, 0);
});

test('directory never searches extra contact fields outside the public record allowlist', () => {
  const member = { ...data.members[0], email: 'privateonly@example.test', phone: '9876543210' };
  const filters = { query: 'privateonly', division: 'all', year: 'all', department: 'all' };
  assert.equal(directory.filterMemberDirectory([member], filters).length, 0);
});

test('member modal scroll lock restores its previous state and respects an existing orbit lock', () => {
  const body = { style: { overflow: 'auto' } };
  const release = profile.acquireMemberScrollLock(body);
  assert.equal(body.style.overflow, 'hidden');
  release();
  assert.equal(body.style.overflow, 'auto');
  body.style.overflow = 'hidden';
  const releaseOrbit = profile.acquireMemberScrollLock(body);
  body.style.overflow = 'clip';
  releaseOrbit();
  assert.equal(body.style.overflow, 'clip', 'An existing orbit lock remains owned by its original lifecycle');
});
