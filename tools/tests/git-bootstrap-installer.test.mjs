import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const script = await readFile(path.join(root, 'Install-Ultra-Agent.ps1'), 'utf8');
const launcher = await readFile(path.join(root, 'Install-Ultra-Agent.cmd'), 'utf8');

test('Git URL bootstrap only trusts HTTPS GitHub and requires a signed release asset', () => {
  assert.match(script, /Only HTTPS GitHub repository URLs are supported/i);
  assert.match(script, /releases\/latest/);
  assert.match(script, /mansoor-agent-hub\.zip/);
  assert.match(script, /Get-FileHash.*SHA256/is);
  assert.match(script, /Install-Mansoor-Agent-Team\.cmd/);
  assert.match(script, /signed manifest/i);
  assert.doesNotMatch(script, /Invoke-Expression|iex\s/i);
});

test('one-click launcher forwards the repository URL and preserves installer exit status', () => {
  assert.match(launcher, /Install-Ultra-Agent\.ps1/);
  assert.match(launcher, /-RepositoryUrl/);
  assert.match(launcher, /exit \/b %INSTALL_EXIT%/i);
});
