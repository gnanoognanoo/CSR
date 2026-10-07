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
function load(filename, imports = {}, globals = {}) {
  const source = ts.transpileModule(readFileSync(path.join(root, 'src', filename), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  const context = { ...globals, exports, module: { exports }, require: name => {
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  } };
  vm.runInNewContext(source, context, { filename });
  return context.module.exports;
}
const content = load('content.ts');
const data = load('projects/data.ts', { '../content': content });
// Test the real directory content independently of native dialog focus and capture.
const { AllProjectsOverlay } = load('projects/AllProjectsOverlay.tsx', {
  './projects': data, react: React, 'react/jsx-runtime': jsxRuntime,
  'react-dom': { createPortal: node => node },
  './ModelCredits': { ModelCredits: () => null },
  './ProjectDossier': { acquireDossierScrollLock: () => () => {} },
  './overlays.css': {},
}, { document: { body: {} } });
const render = division => renderToStaticMarkup(React.createElement(AllProjectsOverlay, {
  open: true, archive: data.projects, initialDivision: division, onClose() {}, onOpenProject() {},
}));
const decode = text => text.replaceAll('&amp;', '&');

test('a division archive lists every matching record and its corresponding uploaded thumbnail', () => {
  for (const division of data.projectDivisions) {
    const html = decode(render(division.id));
    const records = data.projects.filter(project => project.division === division.id);
    assert.ok(html.includes(`>${division.name}<span`));
    assert.equal((html.match(/aria-label="Open project:/g) ?? []).length, records.length);
    assert.ok(html.includes(`>${records.length} ${records.length === 1 ? 'project' : 'projects'}</p>`));
    for (const project of records) {
      assert.ok(html.includes(`aria-label="Open project: ${project.title}"`));
      assert.ok(html.includes(`src="${project.images[0].src}"`));
    }
    for (const project of data.projects.filter(project => project.division !== division.id)) {
      assert.ok(!html.includes(`aria-label="Open project: ${project.title}"`));
    }
  }
});

test('empty divisions report an honest archive state without fabricated project rows', () => {
  const html = decode(render('ai'));
  assert.ok(html.includes('No published projects yet'));
  assert.ok(html.includes('There are no published project records for AI &amp; Intelligent Systems'.replaceAll('&amp;', '&')));
  assert.equal((html.match(/class="all-projects-overlay__thumbnail"/g) ?? []).length, 0);
  assert.ok(!html.includes('aria-label="Open project:'));
  assert.ok(html.includes('aria-label="Close division projects"'));
});

test('the center archive retains all eight real dataset entries without changing their order', () => {
  const html = decode(render(null));
  assert.equal((html.match(/aria-label="Open project:/g) ?? []).length, 8);
  assert.equal((html.match(/class="all-projects-overlay__thumbnail"/g) ?? []).length, 8);
  assert.ok(html.includes('aria-label="Close all projects"'));
  let previous = -1;
  for (const project of data.projects) {
    const position = html.indexOf(`aria-label="Open project: ${project.title}"`);
    assert.ok(position > previous);
    previous = position;
  }
});
