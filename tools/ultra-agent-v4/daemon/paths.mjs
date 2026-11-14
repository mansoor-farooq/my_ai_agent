import os from 'node:os';
import path from 'node:path';

export function runtimePaths({ env = process.env, platform = process.platform, homeDir = os.homedir() } = {}) {
  const base = platform === 'win32'
    ? (env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'))
    : (env.XDG_STATE_HOME || path.join(homeDir, '.local', 'state'));
  const root = path.resolve(base, 'Mansoor-Agent-Hub', 'runtime');
  return {
    root,
    runsDir: path.join(root, 'runs'),
    lockFile: path.join(root, 'daemon.lock.json'),
    socketName: platform === 'win32' ? '\\\\.\\pipe\\mansoor-agent-v1' : path.join(root, 'mansoor-agent-v1.sock'),
  };
}
