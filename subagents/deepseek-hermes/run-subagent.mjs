import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const bridgeDir = dirname(fileURLToPath(import.meta.url));
const poolFile = join(bridgeDir, 'gemini-pool.json');
const pool = JSON.parse(readFileSync(poolFile, 'utf8'));

const rootCandidates = [
  process.env.DEEPSEEK_HERMES_ROOT,
  join(process.env.USERPROFILE || '', 'deepseek harmees'),
  'E:\\deepseek harmees',
].filter(Boolean);
const harnessRoot = rootCandidates.find((candidate) =>
  existsSync(join(candidate, 'apps', 'cli', 'src', 'bin.ts')),
);
if (!harnessRoot) {
  throw new Error(
    'DeepSeek Hermes source was not found. Set DEEPSEEK_HERMES_ROOT to the DeepSeek Harness project folder.',
  );
}
const cliEntry = join(harnessRoot, 'apps', 'cli', 'src', 'bin.ts');
const cliArgs = ['--import', 'tsx/esm', cliEntry, 'headless', '--permission-mode', 'workspace-write'];

const task = process.argv.slice(2).join(' ') || 'test task';

async function runWithKey(account) {
  return new Promise((resolve, reject) => {
    console.log('[Sub-Agent] Launching task with Gemini Account ' + account.id + ' (' + account.name + ')...');
    
    const env = {
      ...process.env,
      GEMINI_API_KEY: account.key,
      DSH_CLIENT_TITLE: 'Mansoor'
    };

    const child = spawn('node', [...cliArgs, task], {
      env,
      stdio: 'inherit',
      shell: true,
      cwd: harnessRoot,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error('Exit code ' + code));
      }
    });
  });
}

async function runWithDeepSeekAccount() {
  return new Promise((resolve, reject) => {
    console.log('[Sub-Agent] Priority 1: Launching task with your logged-in DeepSeek Account models...');
    const env = {
      ...process.env,
      DSH_CLIENT_TITLE: 'Mansoor'
    };

    const child = spawn('node', [...cliArgs, task], {
      env,
      stdio: 'inherit',
      shell: true,
      cwd: harnessRoot,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error('Exit code ' + code));
      }
    });
  });
}

async function main() {
  // Priority 1: Logged-in DeepSeek account models
  try {
    await runWithDeepSeekAccount();
    console.log('[Sub-Agent] Task completed successfully using DeepSeek Account.');
    return;
  } catch (err) {
    console.warn('[Sub-Agent] DeepSeek Account limit reached or busy, falling back to Gemini pool...');
  }

  // Priority 2: Fallback across 4 Gemini accounts
  for (const account of pool.accounts) {
    try {
      await runWithKey(account);
      console.log('[Sub-Agent] Task completed successfully using Gemini Account ' + account.id + '.');
      return;
    } catch (err) {
      console.warn('[Sub-Agent] Gemini Account ' + account.id + ' hit limit, rotating to next account...');
    }
  }
  console.error('[Sub-Agent] All accounts exhausted.');
  process.exit(1);
}

main();
