import assert from 'node:assert/strict';
import test from 'node:test';
import { discoverAuditBrowsers, planAuditBrowserRuns } from '../audit-browser-runtime.mjs';

test('discovers browsers from PATH and platform locations without opening user profiles', () => {
  const result = discoverAuditBrowsers({
    platform: 'win32',
    env: { PATH: 'C:\\Apps\\Chrome;C:\\Apps\\Firefox' },
    exists: (file) => ['C:\\Apps\\Chrome\\chrome.exe', 'C:\\Apps\\Firefox\\firefox.exe'].includes(file),
    resolveCommand: (name) => name === 'chrome.exe' ? 'C:\\Apps\\Chrome\\chrome.exe' : name === 'firefox.exe' ? 'C:\\Apps\\Firefox\\firefox.exe' : null,
  });
  assert.deepEqual(result.browsers.map((browser) => browser.id), ['chrome', 'firefox']);
  assert.ok(result.browsers.every((browser) => browser.userProfileUsed === false));
});

test('prefers installed browsers with an exposed automation provider and reports unsupported browsers', () => {
  const plan = planAuditBrowserRuns({
    browsers: [{ id: 'edge', executable: 'msedge.exe' }, { id: 'firefox', executable: 'firefox.exe' }],
    providers: { antigravity: false, playwright: true, selenium: false },
  });
  assert.equal(plan.runs[0].browser, 'edge');
  assert.equal(plan.runs[0].provider, 'playwright');
  assert.equal(plan.runs[1].status, 'blocked');
  assert.match(plan.runs[1].reason, /compatible browser automation driver/i);
});

test('uses the native Antigravity browser when exposed and never claims unlaunched browser evidence', () => {
  const plan = planAuditBrowserRuns({ browsers: [{ id: 'chrome', executable: 'chrome' }], providers: { antigravity: true } });
  assert.equal(plan.runs[0].provider, 'antigravity-browser');
  assert.equal(plan.runs[0].status, 'ready');
  assert.deepEqual(plan.evidence, []);
});
