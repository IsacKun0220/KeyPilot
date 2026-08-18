import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  mapForegroundApp,
  getForegroundSnapshotFromWindowsResult
} = require('../server/server.js');

test('Windows browser title detection maps Google Workspace tabs correctly', () => {
  assert.equal(
    mapForegroundApp('chrome', 'Quarterly Budget - Google Sheets - docs.google.com', ''),
    'sheets'
  );
  assert.equal(
    mapForegroundApp('msedge', 'Team Deck - Google Slides - docs.google.com', ''),
    'slides'
  );
  assert.equal(
    mapForegroundApp('chrome', 'Design Notes - Google Docs - docs.google.com', ''),
    'docs'
  );
});

test('Windows browser title detection supports Chrome and Edge generic titles', () => {
  assert.equal(
    mapForegroundApp('chrome', 'Roadmap spreadsheet - sheets.google.com', ''),
    'sheets'
  );
  assert.equal(
    mapForegroundApp('msedge', 'Launch presentation - slides.google.com', ''),
    'slides'
  );
  assert.equal(
    mapForegroundApp('msedge', 'Project spec - docs.google.com/document/d/123', ''),
    'docs'
  );
});

test('Windows browser title detection supports localized Google Workspace titles', () => {
  assert.equal(
    mapForegroundApp('chrome', '無標題文件 - Google 文件', ''),
    'docs'
  );
  assert.equal(
    mapForegroundApp('chrome', '無標題試算表 - Google 試算表', ''),
    'sheets'
  );
  assert.equal(
    mapForegroundApp('msedge', '無標題簡報 - Google 簡報', ''),
    'slides'
  );
});

test('Windows native Office process detection maps desktop apps correctly', () => {
  assert.equal(getForegroundSnapshotFromWindowsResult('WINWORD', 'Draft.docx - Word').app, 'word');
  assert.equal(getForegroundSnapshotFromWindowsResult('EXCEL', 'Budget.xlsx - Excel').app, 'excel');
  assert.equal(getForegroundSnapshotFromWindowsResult('POWERPNT', 'Deck.pptx - PowerPoint').app, 'powerpoint');
});

test('Windows browser snapshot preserves browser process and resolved app', () => {
  const snapshot = getForegroundSnapshotFromWindowsResult(
    'msedge',
    'Quarterly Planning - Google Sheets - docs.google.com'
  );
  assert.deepEqual(snapshot, {
    app: 'sheets',
    browser: 'msedge',
    title: 'Quarterly Planning - Google Sheets - docs.google.com',
    url: ''
  });
});
