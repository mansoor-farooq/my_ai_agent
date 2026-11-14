import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { runtimePaths } from './paths.mjs';
import { handleProtocolRequest } from './protocol.mjs';

function pidAlive(pid) { try { process.kill(Number(pid), 0); return true; } catch { return false; } }

function acquireLock(lockFile) {
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  try {
    const fd = fs.openSync(lockFile, 'wx');
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    return fd;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    try {
      const current = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      if (!pidAlive(current.pid)) { fs.unlinkSync(lockFile); return acquireLock(lockFile); }
    } catch (readError) { if (readError.code !== 'ENOENT') throw new Error('daemon lock is held or unreadable'); return acquireLock(lockFile); }
    throw new Error('daemon already running');
  }
}

export async function startDaemon({ paths = runtimePaths(), now = () => new Date().toISOString() } = {}) {
  fs.mkdirSync(paths.runsDir, { recursive: true });
  const lockFd = acquireLock(paths.lockFile);
  const server = net.createServer((socket) => {
    let buffer = '';
    socket.setEncoding('utf8');
    socket.on('data', async (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines.filter(Boolean)) {
        let request;
        try { request = JSON.parse(line); } catch { socket.write(`${JSON.stringify({ ok: false, error: 'invalid-json' })}\n`); continue; }
        try { socket.write(`${JSON.stringify(await handleProtocolRequest(request, { runsDir: paths.runsDir, now }))}\n`); }
        catch (error) { socket.write(`${JSON.stringify({ ok: false, error: error.message })}\n`); }
      }
    });
  });
  if (process.platform !== 'win32' && fs.existsSync(paths.socketName)) fs.unlinkSync(paths.socketName);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(paths.socketName, resolve); });
  const heartbeat = setInterval(() => {
    try { fs.writeFileSync(paths.lockFile, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), heartbeatAt: now() })); } catch {}
  }, 5000);
  heartbeat.unref();
  return {
    paths,
    status: 'ready',
    close: async () => {
      clearInterval(heartbeat);
      await new Promise((resolve) => server.close(() => resolve()));
      try { fs.closeSync(lockFd); } catch {}
      try { fs.unlinkSync(paths.lockFile); } catch {}
      if (process.platform !== 'win32') { try { fs.unlinkSync(paths.socketName); } catch {} }
    },
  };
}

export async function connectRuntimeClient({ paths = runtimePaths(), timeoutMs = 5000 } = {}) {
  const socket = net.createConnection(paths.socketName);
  socket.setEncoding('utf8');
  let buffer = '';
  const pending = [];
  socket.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines.filter(Boolean)) pending.shift()?.(JSON.parse(line));
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('daemon connection timeout')), timeoutMs);
    socket.once('connect', () => { clearTimeout(timer); resolve(); });
    socket.once('error', (error) => { clearTimeout(timer); reject(error); });
  });
  return {
    request(request) { return new Promise((resolve, reject) => { pending.push(resolve); socket.write(`${JSON.stringify(request)}\n`, (error) => { if (error) reject(error); }); }); },
    close() { socket.end(); },
  };
}
