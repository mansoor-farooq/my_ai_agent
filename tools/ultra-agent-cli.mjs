#!/usr/bin/env node
import { runtimePaths } from './ultra-agent-v4/daemon/paths.mjs';
import { startDaemon, connectRuntimeClient } from './ultra-agent-v4/daemon/daemon.mjs';

const args = process.argv.slice(2);
const command = args[0] || 'status';
const value = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const values = (name) => args.flatMap((arg, index) => arg === name && args[index + 1] ? [args[index + 1]] : []);
const paths = runtimePaths();

async function main() {
  if (command === 'start') {
    const daemon = await startDaemon({ paths });
    console.log(`Mansoor Agent daemon ready (${daemon.paths.socketName})`);
    await new Promise(() => {});
    return;
  }
  const client = await connectRuntimeClient({ paths });
  try {
    let request;
    if (command === 'submit') request = { method: 'submit', input: { projectDir: value('--project', process.cwd()), projectId: value('--project-id', 'LOCAL-PROJECT'), taskId: value('--task-id', `TASK-${Date.now()}`), objective: value('--objective'), scope: values('--scope'), acceptance: values('--acceptance'), mode: value('--mode', 'fast'), agent: value('--agent', 'Mansoor AI Team Manager') } };
    else if (command === 'events') request = { method: 'events', runId: value('--run') };
    else if (command === 'resume') request = { method: 'resume', runId: value('--run') };
    else if (command === 'stop') request = { method: 'stop', runId: value('--run') };
    else if (command === 'doctor') request = { method: 'doctor' };
    else request = { method: 'status', runId: value('--run') };
    const result = await client.request(request);
    console.log(args.includes('--json') ? JSON.stringify(result, null, 2) : JSON.stringify(result, null, 2));
  } finally { client.close(); }
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) main().catch((error) => { console.error(`mansoor-agent: ${error.message}`); process.exitCode = 1; });
