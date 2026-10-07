import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(relative) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  const exports = {};
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, module: { exports } });
  return exports;
}
const { getMemberWindow, nearestMemberStep, wrapMemberIndex } = load('../src/members/orbit-window.ts');
const { members, memberDivisions } = load('../src/members/data.ts');

test('a complete roster turn reaches every profile with exactly twelve desktop or six mobile badges', () => {
  for (const capacity of [12, 6]) {
    const seen = new Set();
    for (let step = 0; step < members.length; step++) {
      const slots = getMemberWindow(members, step, capacity);
      assert.equal(slots.length, capacity);
      assert.equal(new Set(slots.map(slot => slot.member.id)).size, capacity);
      const selected = slots.find(slot => slot.position === wrapMemberIndex(step, capacity));
      assert.equal(selected.member.id, members[step].id);
      seen.add(selected.member.id);
    }
    assert.equal(seen.size, members.length);
  }
});

test('stepping either way recycles only the rear badge and preserves every remaining physical position', () => {
  for (const capacity of [12, 6]) {
    for (const step of [-116, -1, 0, 114, 115, 231]) {
      const before = getMemberWindow(members, step, capacity);
      for (const direction of [-1, 1]) {
        const after = getMemberWindow(members, step + direction, capacity);
        const retained = before.filter(old => after.some(next => next.member.id === old.member.id));
        assert.equal(retained.length, capacity - 1);
        for (const old of retained) {
          assert.equal(after.find(next => next.member.id === old.member.id).position, old.position);
        }
        const replaced = before.filter(old => !after.some(next => next.member.id === old.member.id));
        const rearOffset = wrapMemberIndex(replaced[0].position - wrapMemberIndex(step, capacity), capacity);
        assert.ok(rearOffset >= capacity / 2 - 1 && rearOffset <= capacity / 2 + 1);
      }
    }
  }
});

test('all division filters traverse their entire roster without duplicates or unrelated members', () => {
  for (const division of memberDivisions) {
    const records = members.filter(member => member.divisionId === division.id);
    for (const capacity of [12, 6]) {
      for (let step = -records.length; step < records.length * 2; step++) {
        const slots = getMemberWindow(records, step, capacity);
        assert.equal(slots.length, capacity);
        assert.equal(new Set(slots.map(slot => slot.member.id)).size, capacity);
        assert.ok(slots.every(slot => slot.member.divisionId === division.id));
        assert.equal(slots.find(slot => slot.position === wrapMemberIndex(step, capacity)).member.id, records[wrapMemberIndex(step, records.length)].id);
      }
    }
  }
});

test('short and empty datasets do not invent extra members', () => {
  assert.equal(getMemberWindow([], 0, 12).length, 0);
  const short = getMemberWindow(members.slice(0, 3), -100, 12);
  assert.equal(short.length, 3);
  assert.equal(new Set(short.map(slot => slot.member.id)).size, 3);
});

test('name selection chooses the nearest cycle including wraparound in either direction', () => {
  for (const total of [115, 18, 15]) {
    for (let current = -total * 2; current < total * 2; current += 7) {
      for (let target = 0; target < total; target++) {
        const step = nearestMemberStep(current, target, total);
        assert.equal(wrapMemberIndex(step, total), target);
        assert.ok(Math.abs(step - current) <= total / 2);
      }
    }
  }
  assert.equal(nearestMemberStep(0, 114, 115), -1);
  assert.equal(nearestMemberStep(114, 0, 115), 115);
});
