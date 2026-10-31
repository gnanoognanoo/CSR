import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
  const context = { URL, ...globals, exports, module: { exports }, require: name => {
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  } };
  vm.runInNewContext(code, context, { filename });
  return context.module.exports;
}

const memberData = loadTypeScript('members/data.ts');
const content = loadTypeScript('content.ts', { './members/data': memberData });
const data = loadTypeScript('projects/data.ts', { '../content': content });
const orbit = loadTypeScript('projects/orbit-state.ts', { './data': data, react: {} });
// Render portal contents in isolation; native-dialog interactions are checked in a browser.
const dossier = loadTypeScript('projects/ProjectDossier.tsx', {
  './data': data, react: React, 'react/jsx-runtime': jsxRuntime,
  'react-dom': { createPortal: children => children },
}, { document: { body: {} } });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} should equal ${expected}`);

// These synthetic fixtures never enter the clearly labelled production demo archive.
const fixture = (id, division) => ({
  id, division, title: `Synthetic test fixture ${id}`, shortDescription: '', longDescription: '',
  status: 'Test only', year: '', contributors: [], technologies: [], images: [],
});
const syntheticArchive = [fixture('test-a1', 'ai'), fixture('test-a2', 'ai'), fixture('test-a3', 'ai'),
  fixture('test-s1', 'software'), fixture('test-s2', 'software')];

test('the archive retains seven institutional divisions and exactly eight uploaded-image projects in order', () => {
  assert.equal(data.projectDivisions.length, 7);
  assert.equal(new Set(data.projectDivisions.map(division => division.id)).size, 7);
  data.projectDivisions.forEach((division, index) => {
    assert.equal(division.name, content.divisions[index][0]);
    assert.equal(division.lead, content.divisions[index][1]);
    assert.equal(division.index, index + 1);
  });
  assert.equal(data.projects.length, 8);
  assert.equal(new Set(data.projects.map(project => project.id)).size, 8);
  assert.deepEqual(Array.from(data.projects, project => project.division), ['robotics', 'embedded', 'software', 'software', 'robotics', 'iot', 'robotics', 'robotics']);
  assert.deepEqual(Array.from(data.projects, project => project.images[0].src), Array.from({ length: 8 }, (_, index) => `/projects/uploaded/project-${String(index + 1).padStart(2, '0')}.${index === 3 ? 'jpg' : 'png'}`));
});

test('every image-based sample has substantive inferred content and uses the unchanged supplied image', () => {
  const suppliedHashes = [
    'd846978affa21eef41cb13c766d2d4ff54bf17969d7010ce7da7c1b47c72f1b2',
    'b41ea1e207a64504481ef31b43d5bf9b45c7e3b093d4734d162f9d2f80c9919c',
    '8681d24a3eb08f2c2c2eea00336285aece55d1ee31f83af9d97e3a0aacff0849',
    '97d376b1da8aa7f2c7faadc932440926ac1b1874e7b7af36cbd660fc2cb9778e',
    'fd669b0760c06b61c45bf7d2386ed78a49c09ae51d358480d1f6636a2356b771',
    '7b75beddfed5b830f81e3fb4a6a5124b3356f0cd0fc79610321611fda02d4bef',
    'c470bb7198708a1c3dc511b92bd374e6f05fb7ead18889811bbe2be3d2918b63',
    'f5b58b2a0eba39401172744f7d3dafad888030fee836aeddcc1d53e9b3d2792a',
  ];
  const divisionIds = new Set(data.projectDivisions.map(division => division.id));
  for (const [index, project] of data.projects.entries()) {
    assert.ok(divisionIds.has(project.division), `${project.id} belongs to a known division`);
    assert.equal(project.isDemo, true);
    assert.match(project.status, /demo|sample|placeholder/i);
    assert.ok(project.title.length > 5);
    assert.ok(project.shortDescription.length > 20);
    assert.ok(project.longDescription.length > 60);
    for (const field of ['problem', 'approach', 'solution']) {
      assert.ok(project[field]?.length > 20, `${project.id} requires ${field} content`);
    }
    assert.ok(project.technologies.length > 0);
    assert.ok(project.features.length >= 3);
    assert.ok(project.features.every(feature => feature.length > 10));
    assert.ok(project.contributors.length > 0);
    assert.ok(project.contributors.every(contributor => /demo|sample|not assigned|unassigned/i.test(contributor)), 'demo contributors must not be presented as a real team');
    assert.equal(project.githubUrl, undefined, 'no invented GitHub repository');
    assert.equal(project.demoUrl, undefined, 'no invented hosted project');
    assert.equal(project.results, undefined, 'no invented measured outcomes');
    assert.equal(project.images.length, 1);
    for (const image of project.images) {
      assert.match(image.src, /^\/projects\/uploaded\/project-0[1-8]\.(png|jpg)$/);
      assert.ok(image.alt.length > 10);
      assert.ok(existsSync(path.join(root, 'public', image.src)), `${project.id} image exists`);
      const bytes = readFileSync(path.join(root, 'public', image.src));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), suppliedHashes[index], 'the original uploaded artwork and branding remain unchanged');
    }
    assert.equal(project.inspirationUrl, undefined, 'generated image descriptions do not invent external provenance');
    assert.ok(!/coming soon/i.test(project.status));
  }
});

test('ring indexing wraps forward and backward without invalid empty-ring indices', () => {
  assert.equal(orbit.wrapIndex(-1, 7), 6);
  assert.equal(orbit.wrapIndex(7, 7), 0);
  assert.equal(orbit.wrapIndex(-22, 7), 6);
  assert.equal(orbit.wrapIndex(22, 7), 1);
  assert.equal(orbit.wrapIndex(4, 0), 0);
  assert.equal(orbit.wrapIndex(NaN, 7), 0);
  assert.equal(orbit.wrapIndex(2, Infinity), 0);
});

test('division clicks take the shortest path and wheel navigation keeps its direction across wraps', () => {
  close(orbit.nearestRotation(0, 1, 7), -360 / 7);
  close(orbit.nearestRotation(0, 6, 7), 360 / 7);
  close(orbit.nearestRotation(-6 * 360 / 7, 0, 7, -1), -360);
  close(orbit.nearestRotation(6 * 360 / 7, 0, 7, 1), 360);
  close(orbit.nearestRotation(720, 1, 7), 720 - 360 / 7);
  close(orbit.nearestRotation(720, 1, 7, 1), 1080 - 360 / 7);
  close(orbit.nearestRotation(0, 0, 7, -1), 0);
  close(orbit.nearestRotation(25, 0, 0), 25);
  for (let turn = -5; turn <= 5; turn++) {
    for (let index = 0; index < 7; index++) {
      const current = 360 * turn + 18;
      const next = orbit.nearestRotation(current, index, 7);
      assert.ok(Math.abs(next - current) <= 180 + 1e-7);
      const anchorAngle = next + index * 360 / 7;
      close(anchorAngle, Math.round(anchorAngle / 360) * 360);
    }
  }
});

test('inner rings derive their own lengths and navigate in the opposite direction', () => {
  assert.equal(data.getDivisionProjects('ai', syntheticArchive).length, 3);
  assert.equal(data.getDivisionProjects('software', syntheticArchive).length, 2);
  assert.equal(data.getDivisionProjects('robotics', syntheticArchive).length, 0);
  let state = orbit.createOrbitState(syntheticArchive);
  assert.equal(state.selectedProjects.ai, 'test-a1');
  assert.equal(state.selectedProjects.robotics, null);
  state = orbit.orbitReducer(state, { type: 'select-project', id: 'test-a2', direction: 1 }, syntheticArchive);
  close(state.innerRotations.ai, 120);
  state = orbit.orbitReducer(state, { type: 'select-project', id: 'test-a3', direction: 1 }, syntheticArchive);
  close(state.innerRotations.ai, 240);
  state = orbit.orbitReducer(state, { type: 'select-project', id: 'test-a1', direction: 1 }, syntheticArchive);
  close(state.innerRotations.ai, 360);
  state = orbit.orbitReducer(state, { type: 'select-division', id: 'embedded', direction: -1 }, syntheticArchive);
  close(state.outerRotation, -360 / 7);
});

test('closing dossiers and revisiting a division preserve both project selection and ring rotation', () => {
  let state = orbit.createOrbitState(syntheticArchive);
  state = orbit.orbitReducer(state, { type: 'select-project', id: 'test-a3', open: true, direction: 1 }, syntheticArchive);
  assert.equal(state.detailOpen, true);
  const beforeClose = state;
  state = orbit.orbitReducer(state, { type: 'close-project' }, syntheticArchive);
  assert.equal(state.detailOpen, false);
  assert.equal(state.selectedDivision, beforeClose.selectedDivision);
  assert.equal(state.selectedProjects, beforeClose.selectedProjects);
  assert.equal(state.innerRotations, beforeClose.innerRotations);
  assert.equal(state.outerRotation, beforeClose.outerRotation);
  state = orbit.orbitReducer(state, { type: 'select-project', id: 'test-s2', open: true }, syntheticArchive);
  assert.equal(state.selectedDivision, 'software');
  assert.equal(state.selectedProjects.software, 'test-s2');
  state = orbit.orbitReducer(state, { type: 'select-division', id: 'ai' }, syntheticArchive);
  assert.equal(state.selectedProjects.ai, 'test-a3');
  close(state.innerRotations.ai, 240);
  assert.equal(state.selectedProjects.software, 'test-s2');
  close(state.innerRotations.software, -180);
  assert.equal(state.detailOpen, false);
});

test('empty archives and invalid selection actions do not create phantom projects or corrupt rotations', () => {
  const emptyArchive = [];
  const empty = orbit.createOrbitState(emptyArchive);
  assert.ok(Object.values(empty.selectedProjects).every(value => value === null));
  for (const action of [
    { type: 'select-project', id: 'unpublished' }, { type: 'select-division', id: 'unknown' },
    { type: 'outer-rotation', degrees: NaN }, { type: 'inner-rotation', degrees: Infinity },
  ]) assert.equal(orbit.orbitReducer(empty, action, emptyArchive), empty);
  const selected = orbit.orbitReducer(empty, { type: 'select-division', id: 'robotics' }, emptyArchive);
  assert.equal(selected.selectedProjects.robotics, null);
  assert.equal(selected.detailOpen, false);
  assert.ok(Number.isFinite(selected.outerRotation));
});

test('project links allow only valid absolute HTTP and HTTPS URLs', () => {
  assert.equal(data.safeProjectUrl('https://example.org/demo'), 'https://example.org/demo');
  assert.equal(data.safeProjectUrl('http://localhost:8080'), 'http://localhost:8080/');
  for (const value of [undefined, '', '/demo', '//example.org', 'javascript:alert(1)', 'data:text/html,test', 'file:///C:/secret', 'not a url']) {
    assert.equal(data.safeProjectUrl(value), undefined);
  }
});

test('a dossier inside an engaged orbit does not re-lock the next route during cleanup', () => {
  const body = { style: { overflow: 'hidden' } };
  const releaseDossier = dossier.acquireDossierScrollLock(body);
  body.style.overflow = ''; // Orbit route releases its own lock before child cleanup.
  releaseDossier();
  assert.equal(body.style.overflow, '');
  body.style.overflow = 'auto';
  const releaseStandalone = dossier.acquireDossierScrollLock(body);
  assert.equal(body.style.overflow, 'hidden');
  releaseStandalone();
  assert.equal(body.style.overflow, 'auto', 'Directory dossiers restore their own previous overflow');
});

test('a partial dossier omits unpublished sections, visuals, and missing or unsafe links', () => {
  const project = { ...fixture('synthetic-dossier', 'ai'), githubUrl: 'javascript:alert(1)' };
  const html = renderToStaticMarkup(React.createElement(dossier.ProjectDossier, { project, divisionName: 'AI & Intelligent Systems', onClose() {} }));
  assert.match(html, /Synthetic test fixture synthetic-dossier/);
  assert.match(html, /aria-labelledby=/);
  assert.match(html, /Close project dossier/);
  assert.match(html, /data-cursor="BACK"/);
  for (const absent of ['The problem', 'The approach', 'The solution', 'Key features', 'Technologies', 'Contributors', 'Results', '<img', 'href=', 'javascript:']) assert.ok(!html.includes(absent), `${absent} must not be invented`);
  assert.equal(renderToStaticMarkup(React.createElement(dossier.ProjectDossier, { project: null, divisionName: 'AI & Intelligent Systems', onClose() {} })), '');
});

test('every uploaded-image dossier labels its image-based concept as a demo and avoids presenting it as an official project', () => {
  for (const project of data.projects) {
    const divisionName = data.projectDivisions.find(division => division.id === project.division).name;
    const html = renderToStaticMarkup(React.createElement(dossier.ProjectDossier, {
      project, divisionName, onClose() {},
    }));
    assert.match(html, /DEMO PROJECT/);
    assert.match(html, /inferred from the supplied image/);
    assert.match(html, /not an official CSR-RIT project/);
    assert.match(html, /CSR Cohort Team — Unassigned/);
    assert.ok(html.includes(`src="${project.images[0].src}"`));
    assert.ok(html.includes(project.title));
    assert.ok(html.includes(divisionName.replaceAll('&', '&amp;')));
    for (const heading of ['Project overview', 'The problem', 'The approach', 'The solution', 'Key features', 'Likely technologies']) {
      assert.ok(html.includes(`<h3>${heading}</h3>`), `${project.id} requires ${heading}`);
    }
    assert.ok(html.includes(project.features[0]));
    assert.ok(!html.includes('Concept reference'));
    assert.ok(!html.includes('View demo ↗'));
    assert.ok(!html.includes('>GitHub ↗'));
  }
});

test('a supplied dossier presents complete fields in order and safe external links', () => {
  const project = {
    ...fixture('synthetic-complete-dossier', 'software'),
    shortDescription: 'Synthetic short description', longDescription: 'Synthetic overview',
    problem: 'Synthetic problem', approach: 'Synthetic approach', solution: 'Synthetic solution',
    features: ['Synthetic feature'], technologies: ['Synthetic technology'], contributors: ['Synthetic contributor'], results: 'Synthetic results',
    images: [{ src: '/synthetic-test-only.png', alt: 'Synthetic visual for the test only' }],
    year: 'Test year', demoUrl: 'https://example.org/demo', githubUrl: 'https://github.com/example/test',
  };
  const html = renderToStaticMarkup(React.createElement(dossier.ProjectDossier, { project, divisionName: 'Software Engineering', onClose() {} }));
  assert.match(html, /alt="Synthetic visual for the test only"/);
  assert.match(html, /href="https:\/\/example.org\/demo" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /href="https:\/\/github.com\/example\/test"/);
  const labels = ['The problem', 'The approach', 'The solution', 'Key features', 'Technologies', 'Contributors', 'Results'];
  labels.forEach((label, index) => {
    assert.ok(html.includes(`<h3>${label}</h3>`));
    if (index) assert.ok(html.indexOf(`<h3>${label}</h3>`) > html.indexOf(`<h3>${labels[index - 1]}</h3>`));
  });
  assert.ok(data.projects.every(record => !record.id.startsWith('synthetic-') && !record.id.startsWith('test-')), 'Synthetic dossier fixtures never enter the shipped archive');
});
