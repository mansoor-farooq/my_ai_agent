import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const index = args.indexOf('--file');
const file = index >= 0 && args[index + 1] ? path.resolve(args[index + 1]) : path.resolve('shared/control-plane/agent-capability-manifest.json');
const forbidden = new Set(['system.admin', 'credentials.read', 'unrelated-files.read', 'browser-data.read', 'covert-monitoring', 'raw-hidden-reasoning.export']);
const allowedModes = new Set(['summary', 'evidence', 'prompt-ledger']);
const errors = [];
let manifest;
try { manifest = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { errors.push(`manifest cannot be read as JSON: ${error.message}`); }
if (manifest) {
  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!manifest.agentId) errors.push('agentId is required');
  const allow = manifest.capabilities?.allow;
  const deny = manifest.capabilities?.deny;
  if (!Array.isArray(allow) || !Array.isArray(deny)) errors.push('capabilities.allow and capabilities.deny must be arrays');
  for (const capability of allow || []) if (forbidden.has(capability)) errors.push(`forbidden capability is allowed: ${capability}`);
  for (const capability of forbidden) if (!(deny || []).includes(capability)) errors.push(`required deny rule is missing: ${capability}`);
  const exportPolicy = manifest.exportPolicy || {};
  for (const field of ['consentRequired', 'projectScopeRequired']) if (exportPolicy[field] !== true) errors.push(`exportPolicy.${field} must be true`);
  for (const field of ['secrets', 'customerData', 'rawHiddenReasoning']) if (exportPolicy[field] !== false) errors.push(`exportPolicy.${field} must be false`);
  for (const mode of exportPolicy.allowedModes || []) if (!allowedModes.has(mode)) errors.push(`unsupported export mode: ${mode}`);
  if (manifest.github?.transport !== 'github-app-installation') errors.push('GitHub transport must be github-app-installation');
  if (manifest.github?.repositorySelection !== 'selected') errors.push('GitHub repositorySelection must be selected');
  if (manifest.github?.permissions?.metadata !== 'read') errors.push('GitHub metadata permission must be read');
  if (manifest.github?.permissions?.contents !== 'write') errors.push('GitHub contents permission must be write');
  if (manifest.github?.administration !== 'none') errors.push('GitHub administration permission must be none');
  if (manifest.branchPolicy?.knowledgePattern !== 'knowledge/**' || manifest.branchPolicy?.mainProtected !== true || manifest.branchPolicy?.forcePush !== false) errors.push('main must be protected and knowledge branches must block force-push');
  if (manifest.tokenPolicy?.type !== 'installation-token' || manifest.tokenPolicy?.maxLifetimeSeconds > 3600 || manifest.tokenPolicy?.personalAccessToken !== false || manifest.tokenPolicy?.privateKeyInRepository !== false) errors.push('token policy must use short-lived installation tokens without repository credentials');
  if (manifest.audit?.required !== true || manifest.audit?.payload !== 'metadata-only') errors.push('metadata-only audit is required');
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(JSON.stringify({ valid: true, file, agentId: manifest.agentId, transport: manifest.github.transport }));
