#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TARGET_PROFILES = [
  ...['samsung', 'google', 'xiaomi'].flatMap((manufacturer) => [13, 14, 16].map((android) => ({ manufacturer, android: String(android) }))),
];

export function normalizeAndroidPreviewEvidence(report) {
  const device = report?.device ?? null;
  return {
    schema: 'mansoor.android-preview-observation/v1',
    status: report?.overallStatus === 'pass' ? 'pass' : report?.overallStatus === 'fail' ? 'fail' : 'unverified',
    serial: device?.serial ?? null,
    manufacturer: device?.manufacturer ? String(device.manufacturer).toLowerCase() : null,
    android: device?.android ? String(device.android) : null,
    scrcpyStatus: report?.scrcpy?.status ?? 'unverified',
  };
}

export function summarizeMatrix(observations) {
  const normalized = observations.map((item) => ({ manufacturer: String(item.manufacturer).toLowerCase(), android: String(item.android), overallStatus: item.overallStatus }));
  const key = (item) => `${item.manufacturer}:${item.android}`;
  const available = new Map(normalized.map((item) => [key(item), item]));
  const profiles = TARGET_PROFILES.map((profile) => ({ ...profile, key: key(profile), observation: available.get(key(profile)) ?? null }));
  const passing = profiles.filter((profile) => profile.observation?.overallStatus === 'pass').length;
  return {
    schema: 'mansoor.device-matrix/v1',
    status: passing === TARGET_PROFILES.length ? 'pass' : 'unverified',
    coverage: passing / TARGET_PROFILES.length,
    passingProfiles: profiles.filter((profile) => profile.observation?.overallStatus === 'pass').map((profile) => profile.key),
    missingProfiles: profiles.filter((profile) => !profile.observation || profile.observation.overallStatus !== 'pass').map((profile) => profile.key),
  };
}

function main() {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: node tools/device-matrix.mjs <report-or-directory>');
  const target = path.resolve(input);
  const files = fs.statSync(target).isDirectory()
    ? fs.readdirSync(target).filter((file) => file.endsWith('.json')).map((file) => path.join(target, file))
    : [target];
  const observations = files.flatMap((file) => {
    try {
      const report = JSON.parse(fs.readFileSync(file, 'utf8'));
      const device = report.device ?? report.devices?.[0];
      return device ? [{ manufacturer: device.manufacturer, android: device.android, overallStatus: report.overallStatus }] : [];
    } catch { return []; }
  });
  process.stdout.write(`${JSON.stringify(summarizeMatrix(observations), null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
