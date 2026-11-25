#!/usr/bin/env node

export function inspectBackend({ mode = 'antigravity', hostModel = null, command = null, commandRunner = null } = {}) {
  const selected = String(mode || 'antigravity').toLowerCase();
  if (selected === 'antigravity') return {
    status: 'host-managed',
    backend: 'antigravity',
    model: hostModel ? String(hostModel) : 'not-exposed-by-host',
    switching: 'host-controlled',
  };
  if (selected === 'local') {
    if (!command) return { status: 'unconfigured', backend: 'local', model: null };
    const probe = typeof commandRunner === 'function' ? commandRunner(command) : { ok: false, reason: 'probe-not-injected' };
    return probe?.ok ? { status: 'ready', backend: 'local', command: String(command), model: probe.model || null } : { status: 'unavailable', backend: 'local', command: String(command), reason: probe?.reason || 'provider-not-ready' };
  }
  return { status: 'unconfigured', backend: selected, model: null, reason: 'No provider adapter is bundled.' };
}

export function createFallbackPlan({ primary = 'antigravity', fallback = null } = {}) {
  return {
    schema: 'mansoor.v5-backend-fallback-plan/v1',
    primary: String(primary),
    fallback: fallback ? { ...fallback, mode: String(fallback.mode || '') } : null,
    requiresExplicitApproval: true,
    silentSwitchAllowed: false,
    stateCheckpointRequired: true,
    reason: 'Provider, cost and data-handling changes must be visible before switching backends.',
  };
}
