// test-smooth-cycles-qa — QA-side regression gates for tween cycles (#19),
// complementary to test-smooth-cycles.mjs. Covers what that suite leaves open:
// real-PNG cycle-frame mutations (valid files, not corrupted bytes), the
// validator's wrap pair, key poses landing byte-identically on the canonical
// walk_a/walk_b geometry, and AC1's literal numbers (>= 8 frames, >= 8 fps).
//
//   node test-smooth-cycles-qa.mjs

import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPack } from './smooth-engine.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../../..');
const pack = 'skills/mascot/scripts/packs/smooth-duck.mjs';
const validate = join(scriptDir, 'validate-smooth-frames.mjs');

const results = [];
const fail = (name, detail) => {
  results.push([name, false, detail]);
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
};
const pass = (name) => {
  results.push([name, true, '']);
  console.log(`  ✓ ${name}`);
};
const bytesEqual = (a, b) => readFileSync(a).equals(readFileSync(b));

const tmp = mkdtempSync(join(tmpdir(), 'mascots-test-cycles-qa-'));
try {
  console.log('engine: cycle pack renders with the AC1 numbers');
  const rendered = await renderPack(pack, { out: join(tmp, 'pack') });
  const walkCount = rendered.cycles.walk?.frames?.length ?? 0;
  const manifest = JSON.parse(readFileSync(join(tmp, 'pack', 'manifest.json'), 'utf8'));
  walkCount >= 8 ? pass(`walk cycle renders >= 8 frames (${walkCount})`) : fail(`walk cycle renders >= 8 frames (${walkCount})`);
  (manifest.cycles?.walk?.fps ?? 0) >= 8 ? pass(`walk cycle fps >= 8 (${manifest.cycles?.walk?.fps})`) : fail('walk cycle fps >= 8');

  console.log('cycle keys land on the canonical walk geometry');
  const keyPoses = [
    ['smooth-duck_walk_000.png', 'smooth-duck_walk_a.png'],
    ['smooth-duck_walk_004.png', 'smooth-duck_walk_b.png'],
  ];
  for (const [cycle, canonical] of keyPoses) {
    bytesEqual(join(tmp, 'pack', cycle), join(tmp, 'pack', canonical))
      ? pass(`${cycle} byte-identical to ${canonical}`)
      : fail(`${cycle} byte-identical to ${canonical}`, 'key pose drifted from the canonical frame');
  }

  console.log('validator: wrap pair is exercised on the loop');
  const okRun = spawnSync('node', [validate, pack, '--out', join(tmp, 'pack')], { cwd: repoRoot, encoding: 'utf8' });
  const okOut = (okRun.stdout ?? '') + (okRun.stderr ?? '');
  okRun.status === 0 ? pass('validate-smooth-frames passes the cycle pack') : fail('validate-smooth-frames passes the cycle pack', okOut.split('\n').filter((l) => l.includes('✗')).join('; '));
  /\(wrap\): \d+ px/.test(okOut) ? pass('adjacent check covers the last→first wrap pair') : fail('adjacent check covers the last→first wrap pair');

  console.log('validator fails on real-PNG cycle-frame mutations');
  const mutations = [
    // walk_003 replaced by a valid, different pose — a keyframe jump.
    ['keyframe jump', 'smooth-duck_walk_003.png', 'smooth-duck_idle.png'],
    // walk_005 replaced by its neighbour — a duplicate in the loop.
    ['duplicate frame', 'smooth-duck_walk_005.png', 'smooth-duck_walk_006.png'],
  ];
  for (const [label, victim, donor] of mutations) {
    const dir = join(tmp, `mut-${donor.replace(/[^a-z0-9]/gi, '')}`);
    cpSync(join(tmp, 'pack'), dir, { recursive: true });
    writeFileSync(join(dir, victim), readFileSync(join(tmp, 'pack', donor)));
    const r = spawnSync('node', [validate, pack, '--out', dir], { cwd: repoRoot, encoding: 'utf8' });
    r.status === 1 ? pass(`mutated ${victim} rejected (${label})`) : fail(`mutated ${victim} rejected (${label})`, `exit ${r.status}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const failed = results.filter(([, ok]) => !ok);
console.log(`\n${failed.length === 0 ? 'PASS' : 'FAIL'} — ${results.length - failed.length}/${results.length} checks`);
process.exit(failed.length === 0 ? 0 : 1);
