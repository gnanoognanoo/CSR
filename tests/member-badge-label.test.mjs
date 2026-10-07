import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const modules = new Map()
function load(relativePath) {
  const filename = new URL(relativePath, import.meta.url)
  if (modules.has(filename.href)) return modules.get(filename.href)
  const exports = {}
  modules.set(filename.href, exports)
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  // No DOM or canvas globals are provided: badge identity content is pure.
  vm.runInNewContext(code, {
    exports, module: { exports },
    require: name => {
      assert.equal(name, './data')
      return load('../src/members/data.ts')
    },
  }, { filename: filename.pathname })
  return exports
}

const { getMemberBadgeLabel } = load('../src/members/badge-label.ts')
const { members, memberDivisions, getMemberInitials } = load('../src/members/data.ts')

test('all 115 badge labels preserve the full public name and established initials', () => {
  assert.equal(members.length, 115)
  const before = JSON.stringify(members)
  for (const member of members) {
    for (const focused of [false, true]) {
      const label = getMemberBadgeLabel(member, focused)
      assert.equal(label.name, member.name)
      assert.equal(label.initials, getMemberInitials(member.name))
      assert.ok(label.initials.length > 0)
      const division = memberDivisions.find(item => item.id === member.divisionId)
      assert.equal(label.divisionShort, division.shortName)
      assert.equal(label.metadata, focused ? member.year ?? null : null)
      assert.equal(label.secondary, focused ? [division.shortName, member.year].filter(Boolean).join(' · ') : null)
      assert.equal(Object.hasOwn(label, 'department'), false, 'long department labels belong in the profile rather than every small badge')
    }
  }
  assert.equal(JSON.stringify(members), before, 'presentation cannot rewrite or supplement the public roster')
})

test('optional fields stay absent and custom source metadata is not replaced with invented defaults', () => {
  for (const member of [
    { id: 'sparse', name: 'SingleName' },
    { id: 'core', name: 'Core Volunteer', role: 'Core team' },
    { id: 'blank', name: '' },
  ]) {
    const label = getMemberBadgeLabel(member, true)
    assert.equal(label.name, member.name)
    assert.equal(label.divisionShort, null)
    assert.equal(label.metadata, null)
    assert.equal(label.secondary, null)
  }
  const custom = { id: 'custom', name: '  Mira  K  ', division: 'Interdisciplinary Lab', year: 'IV Year' }
  const label = getMemberBadgeLabel(custom, true)
  assert.equal(label.name, custom.name, 'the exact identity remains available for accessibility')
  assert.equal(label.initials, 'MK')
  assert.equal(label.divisionShort, custom.division)
  assert.equal(label.metadata, custom.year)
  assert.equal(label.secondary, 'Interdisciplinary Lab · IV Year')
  assert.equal(getMemberBadgeLabel(custom).secondary, null, 'distant badges should keep the secondary line quiet')
  const byName = getMemberBadgeLabel({ id: 'no-id', name: 'Member', division: 'AI & Intelligent Systems' }, true)
  assert.equal(byName.divisionShort, 'AI')
})

