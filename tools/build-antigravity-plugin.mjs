import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Usage: node tools/build-antigravity-plugin.mjs <empty-output-folder>');
const dist = join(root, 'dist');
if (target !== dist && !target.startsWith(`${dist}${process.platform === 'win32' ? '\\' : '/'}`)) {
  throw new Error('Choose an output folder inside the agent hub dist directory.');
}
await mkdir(target, { recursive: true });
if ((await readdir(target)).length) throw new Error(`Output folder must be empty: ${target}`);

const excludedAgentFolders = new Set(['live-web-auditor', 'omniroute-gateway-operator']);
const secretPattern = /(?:AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_-]{32,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]{30,})/;
const sourceAgents = join(root, 'agents', 'Antigravity', 'custom-agents');
const responsePolicy = `\n\n## Response quality contract\n\nLead with the result. Use plain language and short paragraphs, match the user's language, separate evidence from assumptions, give concise rationale without hidden chain-of-thought, and report only verification actually run. For implementation handoffs include changed paths, behavior, checks and limitations. Never invent metrics, citations, records or tool results.\n`;
let agentCount = 0;

for (const entry of await readdir(sourceAgents, { withFileTypes: true })) {
  if (!entry.isDirectory() || excludedAgentFolders.has(entry.name)) continue;
  const source = join(sourceAgents, entry.name, 'agent.md');
  let text;
  try { text = await readFile(source, 'utf8'); } catch { continue; }
  if (secretPattern.test(text)) throw new Error(`Credential-like value detected in agent profile: ${entry.name}`);

  // Keep Antigravity's host-owned skill library as the source; ship only a compact name map.
  let skills = [];
  text = text.replace(/^skills:\r?\n((?:[ \t]+-[^\r\n]*\r?\n)+)/m, (_block, entries) => {
    skills = [...entries.matchAll(/^\s+-\s+(.+?)\s*$/gm)].map((match) => match[1].replace(/^skills\//, ''));
    return '';
  });
  if (skills.length) {
    const frontMatterEnd = text.indexOf('---', 4) + 3;
    const skillNote = `\n\n## Relevant host skills\n\nWhen these skills exist in Antigravity's installed catalog, load only the few needed for the assigned task:\n${skills.map((name) => `- ${name}`).join('\n')}\n`;
    text = `${text.slice(0, frontMatterEnd)}${skillNote}${text.slice(frontMatterEnd)}`;
  }
  text += responsePolicy;

  const destination = join(target, 'agents', entry.name);
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, 'agent.md'), text);
  agentCount += 1;
}

const manifest = {
  $schema: 'https://antigravity.google/schemas/v1/plugin.json',
  name: 'mansoor-agent-hub',
  displayName: 'Mansoor Gemini Agent Team',
  version: '1.1.0',
  description: 'A Gemini-inherited single manager with focused field specialists. Uses Antigravity host skills, bounded reference research and approved UI asset generation without bundling duplicate skill catalogs or provider connectors.',
  logo: 'assets/logo.svg',
  suggestedPrompts: [
    'Inspect this repository and route the task to one matching domain expert.',
    'Ask the specialist to make a bounded change and report local verification evidence.',
    'Request a focused security or release review for this diff.'
  ],
  author: { name: 'Mansoor' }
};
await writeFile(join(target, 'plugin.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await mkdir(join(target, 'assets'), { recursive: true });
await writeFile(join(target, 'assets', 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#123B35"/><path d="M28 91V37h14l22 29 22-29h14v54H85V61L64 88 43 61v30z" fill="#F1F5E9"/><circle cx="100" cy="99" r="8" fill="#24B47E"/></svg>\n');
await writeFile(join(target, 'README.md'), `# Mansoor Gemini Agent Team\n\nThis local plugin contains ${agentCount} Gemini-inherited expert agent profiles and no bundled skill bodies. It references skill names from the host Antigravity installation, avoiding duplicate copies and extra customization-token load.\n\n## Install\n\n1. Install Antigravity and sign in with the target user's Gemini account.\n2. Extract this ZIP.\n3. Double-click \`Install-Mansoor-Agent-Team.cmd\`.\n\nThe installer checks Antigravity's CLI, validates the plugin and installs or updates it. No GitHub sign-in is required.\n\n## Fast mode\n\nChoose \`Gemini 3.8 Flash\` with \`Low\` thinking for quick fixes. The manager uses one relevant specialist and skips deep research unless the task needs it. Use \`Medium\` or \`High\` thinking for architecture, security, migration, ML or explicit research work.\n\n## Response quality\n\nManager and specialist handoffs use a Claude-style quality contract: result first, concise rationale, clear evidence and assumptions, production-grade reporting and no invented tool results. This describes answer quality, not a Claude model connection.\n\n## Team model\n\nUse production-orchestrator as the only manager. It selects one field specialist and the few relevant skills already installed by Antigravity. Bounded search_web/read_url_content research is allowed for references; generate_image requires an approved UI asset brief. The plugin contains no MCP server, OAuth/account setup, DeepSeek/Hermes bridge, OmniRoute gateway, API credential or provider router.\n`);
await writeFile(join(target, '.env.example'), `# Optional local integration settings.\n# Leave blank when using the Antigravity account session.\n# The portable plugin does not read these automatically; only an explicitly\n# configured project/provider integration may use its matching variable.\n\n# OPENAI_API_KEY=\n# GEMINI_API_KEY=\n# DEEPSEEK_API_KEY=\n# GITHUB_TOKEN=\n`);
await writeFile(join(target, 'Install-Mansoor-Agent-Team.ps1'), `param()\n$ErrorActionPreference = 'Stop'\n$pluginRoot = Split-Path -Parent $MyInvocation.MyCommand.Path\n$agy = Get-Command agy -ErrorAction SilentlyContinue\nif (-not $agy) {\n  throw 'Antigravity CLI (agy) was not found. Install Antigravity first, then run this installer again.'\n}\n& $agy.Source plugin validate --strict $pluginRoot\nif ($LASTEXITCODE -ne 0) { throw 'Antigravity plugin validation failed.' }\n& $agy.Source plugin install $pluginRoot\nif ($LASTEXITCODE -ne 0) { throw 'Antigravity plugin installation failed.' }\nWrite-Host 'Mansoor Gemini Agent Team installed successfully.'\nWrite-Host 'Restart Antigravity, or reload its skills/agents if the app is already open.'\n`);
await writeFile(join(target, 'Install-Mansoor-Agent-Team.cmd'), `@echo off\nsetlocal\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Mansoor-Agent-Team.ps1"\nif errorlevel 1 (\n  echo.\n  echo Installation failed. Read the message above.\n  pause\n  exit /b 1\n)\necho.\npause\n`);
console.log(`Built Gemini expert agent plugin at ${target} (${agentCount} agents; zero bundled provider connectors or skill bodies).`);
