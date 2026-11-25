#!/usr/bin/env node
import { runtimePaths } from './ultra-agent-v4/daemon/paths.mjs';
import { startDaemon, connectRuntimeClient } from './ultra-agent-v4/daemon/daemon.mjs';
import { createTurboSession, getTurboSession, revokeTurboSession } from './ultra-agent-v5/turbo-session.mjs';

const args = process.argv.slice(2);
const command = args[0] || 'status';
const value = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const values = (name) => args.flatMap((arg, index) => arg === name && args[index + 1] ? [args[index + 1]] : []);
const has = (name) => args.includes(name);
const paths = runtimePaths();

async function main() {
  if (command === 'start') {
    const daemon = await startDaemon({ paths });
    console.log(`Mansoor Agent daemon ready (${daemon.paths.socketName})`);
    await new Promise(() => {});
    return;
  }
  if (command === 'turbo-on') {
    const session = createTurboSession({ file: paths.turboSessionFile, projectDir: value('--project', process.cwd()), projectId: value('--project-id', 'LOCAL-PROJECT'), scopes: values('--scope'), ttlHours: value('--hours', '12'), actor: value('--actor', 'owner') });
    console.log(JSON.stringify({ ok: true, session }, null, 2));
    return;
  }
  if (command === 'turbo-status') {
    try { console.log(JSON.stringify({ ok: true, session: getTurboSession({ file: paths.turboSessionFile }) }, null, 2)); }
    catch (error) { console.log(JSON.stringify({ ok: false, error: error.message }, null, 2)); process.exitCode = 1; }
    return;
  }
  if (command === 'turbo-off') {
    try { console.log(JSON.stringify({ ok: true, session: revokeTurboSession({ file: paths.turboSessionFile, actor: value('--actor', 'owner') }) }, null, 2)); }
    catch (error) { console.log(JSON.stringify({ ok: false, error: error.message }, null, 2)); process.exitCode = 1; }
    return;
  }
  const client = await connectRuntimeClient({ paths });
  try {
    let request;
    if (command === 'submit' || command === 'chat') {
      const autonomy = has('--turbo') ? 'turbo' : value('--autonomy', 'managed');
      let turboSessionId = value('--turbo-session', '');
      if (autonomy === 'turbo' && !turboSessionId) turboSessionId = getTurboSession({ file: paths.turboSessionFile })?.sessionId || '';
      request = { method: 'submit', input: { projectDir: value('--project', process.cwd()), projectId: value('--project-id', 'LOCAL-PROJECT'), taskId: value('--task-id', `TASK-${Date.now()}`), objective: value('--objective', value('--message')), scope: values('--scope'), acceptance: values('--acceptance'), mode: value('--mode', autonomy === 'turbo' ? 'premium' : 'fast'), autonomy, parallelize: !has('--no-parallel'), maxParallel: Number(value('--max-parallel', '')) || undefined, turboSessionFile: paths.turboSessionFile, turboSessionId, agent: value('--agent', 'Mansoor AI Team Manager') } };
    }
    else if (command === 'events') request = { method: 'events', runId: value('--run') };
    else if (command === 'resume') request = { method: 'resume', runId: value('--run') };
    else if (command === 'stop') request = { method: 'stop', runId: value('--run') };
    else if (command === 'health') request = { method: 'health' };
    else if (command === 'doctor') request = { method: 'doctor' };
    else request = { method: 'status', runId: value('--run') };
    const result = await client.request(request);
    console.log(args.includes('--json') ? JSON.stringify(result, null, 2) : JSON.stringify(result, null, 2));
  } finally { client.close(); }
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) main().catch((error) => { console.error(`mansoor-agent: ${error.message}`); process.exitCode = 1; });
