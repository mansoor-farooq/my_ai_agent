import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function findOnSystemPath(command, platform) {
  const result = spawnSync(platform === 'win32' ? 'where.exe' : 'which', [command], { encoding: 'utf8', windowsHide: true, timeout: 1500 });
  return result.status === 0 ? String(result.stdout || '').split(/\r?\n/).map((line) => line.trim()).find(Boolean) || null : null;
}

const DEFINITIONS = [
  { id: 'chrome', family: 'chromium', commands: ['chrome', 'chrome.exe'], windows: ['Google/Chrome/Application/chrome.exe'], linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/snap/bin/chromium'], mac: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] },
  { id: 'edge', family: 'chromium', commands: ['msedge', 'msedge.exe'], windows: ['Microsoft/Edge/Application/msedge.exe'], linux: ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable'], mac: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'] },
  { id: 'firefox', family: 'firefox', commands: ['firefox', 'firefox.exe'], windows: ['Mozilla Firefox/firefox.exe'], linux: ['/usr/bin/firefox', '/snap/bin/firefox'], mac: ['/Applications/Firefox.app/Contents/MacOS/firefox'] },
  { id: 'brave', family: 'chromium', commands: ['brave', 'brave.exe'], windows: ['BraveSoftware/Brave-Browser/Application/brave.exe'], linux: ['/usr/bin/brave-browser', '/usr/bin/brave'], mac: ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'] },
  { id: 'opera', family: 'chromium', commands: ['opera', 'opera.exe'], windows: ['Opera/launcher.exe'], linux: ['/usr/bin/opera'], mac: ['/Applications/Opera.app/Contents/MacOS/Opera'] },
  { id: 'vivaldi', family: 'chromium', commands: ['vivaldi', 'vivaldi.exe'], windows: ['Vivaldi/Application/vivaldi.exe'], linux: ['/usr/bin/vivaldi', '/usr/bin/vivaldi-stable'], mac: ['/Applications/Vivaldi.app/Contents/MacOS/Vivaldi'] },
  { id: 'chromium', family: 'chromium', commands: ['chromium', 'chromium.exe'], windows: ['Chromium/Application/chrome.exe'], linux: ['/usr/bin/chromium', '/usr/bin/chromium-browser'], mac: [] },
];

function pathCandidates(definition, platform, env) {
  if (platform === 'win32') {
    const roots = [env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA].filter(Boolean);
    return definition.windows.flatMap((suffix) => roots.map((root) => path.join(root, suffix.replaceAll('/', path.sep))));
  }
  if (platform === 'darwin') return definition.mac;
  return definition.linux;
}

export function discoverAuditBrowsers({ platform = process.platform, env = process.env, exists = fs.existsSync, resolveCommand } = {}) {
  const pathEntries = String(env.PATH || '').split(path.delimiter).filter(Boolean);
  const found = [];
  for (const definition of DEFINITIONS) {
    let executable = null;
    for (const command of definition.commands) {
      executable = typeof resolveCommand === 'function' ? resolveCommand(command) : findOnSystemPath(command, platform);
      if (!executable) {
        const candidate = pathEntries.map((entry) => path.join(entry, command)).find((file) => exists(file));
        if (candidate) executable = candidate;
      }
      if (executable) break;
    }
    if (!executable) executable = pathCandidates(definition, platform, env).find((file) => exists(file)) || null;
    if (executable) found.push({ id: definition.id, family: definition.family, executable, detection: 'path-or-known-install-location', userProfileUsed: false });
  }
  return { schema: 'mansoor.audit-browser-inventory/v1', platform, browsers: found };
}

export function planAuditBrowserRuns({ browsers = [], providers = {} } = {}) {
  const runs = browsers.map((browser) => {
    const family = browser.family || DEFINITIONS.find((entry) => entry.id === browser.id)?.family;
    if (providers.antigravity) return { browser: browser.id, executable: browser.executable, provider: 'antigravity-browser', status: 'ready', reason: null };
    if (family === 'chromium' && providers.playwright) return { browser: browser.id, executable: browser.executable, provider: 'playwright', status: 'ready', reason: null };
    if (family === 'firefox' && providers.selenium) return { browser: browser.id, executable: browser.executable, provider: 'selenium-webdriver', status: 'ready', reason: null };
    return { browser: browser.id, executable: browser.executable, provider: null, status: 'blocked', reason: 'No compatible browser automation driver is exposed.' };
  });
  return { schema: 'mansoor.audit-browser-run-plan/v1', runs, evidence: [], rule: 'Detected or planned is not run evidence; record artifacts only after navigation and inspection.' };
}
