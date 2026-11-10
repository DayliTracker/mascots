// test-smooth-cycles — black-box regression tests for tween cycles + manifest
// v2 (issue #19, contract in research/tween-contract FINDINGS.md).
//
//   node test-smooth-cycles.mjs
//
// Pins: cycle interpolation math, two-run determinism, canonical frames and
// sheet byte-identical with cycles stripped, manifest v2 only when cycles are
// declared, the validator's cycle schema + mutation gates, and the bare
// fresh-render mode.

import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cycleOpts, renderPack } from './smooth-engine.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../../..');
const pack = 'skills/mascot/scripts/packs/smooth-duck.mjs';
const engine = 'skills/mascot/scripts/smooth-engine.mjs';
const validate = 'skills/mascot/scripts/validate-smooth-frames.mjs';

const results = [];
const fail = (name, detail) => {
  results.push([name, false, detail]);
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
};
const pass = (name) => {
  results.push([name, true, '']);
  console.log(`  ✓ ${name}`);
};
const check = (name, want, got, detail) =>
  want === got ? pass(name) : fail(name, `expected ${want}, got ${got}${detail ? ` (${detail})` : ''}`);
const run = (cmd, args) => {
  const r = spawnSync('node', [join(scriptDir, cmd), ...args], { cwd: repoRoot, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
};
const bytesEqual = (a, b) => readFileSync(a).equals(readFileSync(b));

const tmp = mkdtempSync(join(tmpdir(), 'mascots-test-cycles-'));
try {
  const WALK = { fps: 10, keys: [{ feetPhase: 0 }, { feetPhase: 0.5 }], steps: 4, tween: 'linear' };

  console.log('cycle keyframe interpolation (K=2, S=4)');
  const wantPhase = [0, 0.125, 0.25, 0.375, 0.5, 0.375, 0.25, 0.125];
  let phasesOk = true;
  for (let i = 0; i < 8; i++) {
    const got = cycleOpts(WALK, i).feetPhase;
    if (got !== wantPhase[i]) {
      phasesOk = false;
      fail(`sample ${i} lerps feetPhase`, `expected ${wantPhase[i]}, got ${got}`);
    }
  }
  if (phasesOk) pass('samples 0..7 sweep the stride and wrap without repeating the first pose');

  console.log('non-numeric opts hold from the left key');
  const mixed = { fps: 4, keys: [{ eyes: 'open', t: 0 }, { eyes: 'wide', t: 1 }], steps: 2 };
  const mid = cycleOpts(mixed, 1);
  mid.eyes === 'open' && mid.t === 0.5
    ? pass('strings hold, numbers lerp')
    : fail('strings hold, numbers lerp', JSON.stringify(mid));

  console.log('engine: smooth-duck renders 17 files, two runs byte-identical');
  const runA = await renderPack(pack, { out: join(tmp, 'runA') });
  const runB = await renderPack(pack, { out: join(tmp, 'runB') });
  check('cycle pack file count (7 frames + 8 walk + sheet + manifest)', 17, runA.written.length);
  const names = readdirSync(join(tmp, 'runA')).sort();
  const allSame =
    names.length === readdirSync(join(tmp, 'runB')).length &&
    names.every((f) => bytesEqual(join(tmp, 'runA', f), join(tmp, 'runB', f)));
  allSame ? pass('two renders reproduce every file byte-for-byte') : fail('two renders reproduce every file byte-for-byte');

  console.log('manifest v2: cycles + version only when cycles are declared');
  const manifest = JSON.parse(readFileSync(join(tmp, 'runA', 'manifest.json'), 'utf8'));
  manifest.version === 2 ? pass('version: 2') : fail('version: 2', JSON.stringify(manifest.version));
  manifest.cycles?.walk?.fps === 10 ? pass('cycles.walk.fps: 10') : fail('cycles.walk.fps: 10');
  manifest.cycles?.walk?.frames?.length === 8
    ? pass('cycles.walk carries 8 frames')
    : fail('cycles.walk carries 8 frames', String(manifest.cycles?.walk?.frames?.length));
  manifest.cycles?.walk?.frames?.[7]?.file === 'smooth-duck_walk_007.png'
    ? pass('cycle files zero-padded `<name>_<cycle>_<iii>.png`')
    : fail('cycle files zero-padded `<name>_<cycle>_<iii>.png`');
  const canonical = manifest.frames.map((f) => f.file);
  const noCycleLeak = canonical.every((f) => !f.includes('_walk_0'));
  noCycleLeak && canonical.length === 7
    ? pass('manifest.frames stays exactly the 7 canonical frames')
    : fail('manifest.frames stays exactly the 7 canonical frames', JSON.stringify(canonical));

  console.log('canonical bytes: cycles stripped ⇒ identical frames + sheet, v1 manifest');
  writeFileSync(
    join(tmp, 'smooth-duck-nocycles.mjs'),
    `import pack from ${JSON.stringify(pathToFileURL(resolve(repoRoot, pack)).href)};\n` +
      'const { cycles, ...rest } = pack;\nexport default rest;\n'
  );
  const bare = await renderPack(join(tmp, 'smooth-duck-nocycles.mjs'), { out: join(tmp, 'nocycles') });
  check('cycle-less render writes 9 files (v1)', 9, bare.written.length);
  const canonicalFiles = ['smooth-duck_idle', 'smooth-duck_blink', 'smooth-duck_look', 'smooth-duck_walk_a', 'smooth-duck_walk_b', 'smooth-duck_happy', 'smooth-duck_surprised'].map((n) => `${n}.png`);
  const sameBytes = canonicalFiles.every((f) => bytesEqual(join(tmp, 'runA', f), join(tmp, 'nocycles', f)));
  sameBytes ? pass('all 7 canonical PNGs byte-identical with cycles stripped') : fail('all 7 canonical PNGs byte-identical with cycles stripped');
  bytesEqual(join(tmp, 'runA', 'contact_sheet.png'), join(tmp, 'nocycles', 'contact_sheet.png'))
    ? pass('contact sheet byte-identical with cycles stripped')
    : fail('contact sheet byte-identical with cycles stripped');
  const v1 = JSON.parse(readFileSync(join(tmp, 'nocycles', 'manifest.json'), 'utf8'));
  !('version' in v1) && !('cycles' in v1)
    ? pass('cycle-less manifest stays v1 (no version/cycles keys)')
    : fail('cycle-less manifest stays v1 (no version/cycles keys)', Object.keys(v1).join(', '));

  console.log('validator: pass, mutation gate, schema gate');
  const okRun = run('validate-smooth-frames.mjs', [pack, '--out', join(tmp, 'runA')]);
  check('validate-smooth-frames passes the cycle pack', 0, okRun.code, okRun.out.split('\n').filter((l) => l.includes('✗')).join('; '));

  rmSync(join(tmp, 'mutated'), { recursive: true, force: true });
  cpSync(join(tmp, 'runA'), join(tmp, 'mutated'), { recursive: true });
  writeFileSync(join(tmp, 'mutated', 'smooth-duck_walk_003.png'), Buffer.from('corrupted frame'));
  const mutRun = run('validate-smooth-frames.mjs', [pack, '--out', join(tmp, 'mutated')]);
  check('mutated cycle frame fails validation', 1, mutRun.code);

  writeFileSync(join(tmp, 'badfps.mjs'), `import pack from ${JSON.stringify(pathToFileURL(resolve(repoRoot, pack)).href)};\n` +
    'export default { ...pack, cycles: { walk: { ...pack.cycles.walk, fps: 0 } } };\n');
  const bareBad = run('validate-smooth-frames.mjs', [join(tmp, 'badfps.mjs')]);
  check('fps 0 fails the cycle schema gate', 1, bareBad.code, bareBad.out.split('\n').filter((l) => l.includes('✗')).join('; '));

  console.log('bare fresh-render mode still passes (fresh-checkout contract)');
  const bareRun = run('validate-smooth-frames.mjs', [pack]);
  check('bare validate-smooth-frames exits 0', 0, bareRun.code, bareRun.out.split('\n').filter((l) => l.includes('✗')).join('; '));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const failed = results.filter(([, ok]) => !ok);
console.log(`\n${failed.length === 0 ? 'PASS' : 'FAIL'} — ${results.length - failed.length}/${results.length} checks`);
process.exit(failed.length === 0 ? 0 : 1);
