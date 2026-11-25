#!/usr/bin/env node
import { TARGET_PROFILES } from './device-matrix.mjs';

export function detectUiTestTools({ commands = {} } = {}) {
  return { flutterIntegration: Boolean(commands.flutterIntegration), patrol: Boolean(commands.patrol), maestro: Boolean(commands.maestro) };
}

export function summarizeDeviceEvidence(reports = []) {
  const keys = new Set(TARGET_PROFILES.map((profile) => `${profile.manufacturer}:${profile.android}`));
  const passing = new Set(reports.filter((report) => report?.status === 'pass').map((report) => `${String(report.device || report.manufacturer).toLowerCase()}:${String(report.android)}`));
  const validPassing = [...passing].filter((key) => keys.has(key));
  return { schema: 'mansoor.mobile-ui-evidence/v1', status: validPassing.length === keys.size ? 'pass' : 'unverified', coverage: validPassing.length / keys.size, expected: keys.size, passingProfiles: validPassing.sort(), missingProfiles: [...keys].filter((key) => !passing.has(key)).sort() };
}

export async function runMobileUiFlowGate({ projectDir, flows = [], tools = {}, runner = null } = {}) {
  if (!projectDir) throw new Error('projectDir is required');
  if (flows.some((flow) => !flow?.id || !Array.isArray(flow?.semantics) || flow.semantics.length === 0)) return { schema: 'mansoor.mobile-ui-flow-gate/v1', status: 'blocked', reason: 'missing-semantic-identifiers', projectDir };
  const available = detectUiTestTools({ commands: tools });
  if (!Object.values(available).some(Boolean) || typeof runner !== 'function') return { schema: 'mansoor.mobile-ui-flow-gate/v1', status: 'unverified', reason: 'mobile-test-runner-unavailable', projectDir, tools: available, flows: flows.map((flow) => flow.id) };
  const results = [];
  for (const flow of flows) results.push(await runner({ projectDir, flow, tools: available }));
  return { schema: 'mansoor.mobile-ui-flow-gate/v1', status: results.every((result) => result?.status === 'pass') ? 'pass' : 'fail', projectDir, tools: available, results };
}

