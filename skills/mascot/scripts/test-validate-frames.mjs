// test-validate-frames — black-box regression tests for validate-frames.mjs.
//
//   node test-validate-frames.mjs
//
// Pins the fresh-checkout contract from issue #7: the bare command
// (`validate-frames.mjs <pack>` with no --out) must pass in a fresh git
// clone where the pack directory holds only source files, while the
// explicit --out and frames-present paths keep their old behaviour.

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../../..');
const pack = 'skills/mascot/scripts/packs/duck.mjs';
const validate = 'skills/mascot/scripts/validate-frames.mjs';
const engine = 'skills/mascot/scripts/engine.mjs';

const results = [];
const fail = (name, detail) => {
  results.push([name, false, detail]);
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
};
const pass = (name) => {
  results.push([name, true, '']);
  console.log(`  ✓ ${name}`);
};

function run(cmd, args, cwd) {
  const r = spawnSync('node', [cmd, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

function check(name, want, got, out) {
  got === want ? pass(name) : fail(name, `exit ${got}, want ${want}\n${out.trim().split('\n').slice(-3).join('\n')}`);
}

const tmp = mkdtempSync(join(tmpdir(), 'mascots-test-validate-'));
const before = new Set(readdirSync(tmpdir()).filter((d) => d.startsWith('mascots-validate-')));

try {
  console.log('fresh clone (no render state)');
  const fresh = join(tmp, 'fresh');
  const clone = spawnSync('git', ['clone', '--quiet', '--no-hardlinks', repoRoot, fresh], { encoding: 'utf8' });
  if (clone.status !== 0) {
    fail('fresh git clone', clone.stderr.trim());
  } else {
    const packDir = join(fresh, dirname(pack));
    const pngs = existsSync(packDir) ? readdirSync(packDir).filter((f) => f.endsWith('.png')) : [];
    pngs.length === 0
      ? pass('clone has no rendered frames in the pack dir')
      : fail('clone has no rendered frames in the pack dir', `found ${pngs.join(', ')}`);

    const bare1 = run(validate, [pack], fresh);
    check('bare validate-frames exits 0 on a fresh clone (issue #7 AC1)', 0, bare1.code, bare1.out);

    const bare2 = run(validate, [pack], fresh);
    check('bare validate-frames is repeatable (no state left behind)', 0, bare2.code, bare2.out);

    const eng = run(engine, [pack, '--out', join(tmp, 'check')], fresh);
    check('engine --out exits 0 on a fresh clone (verify_commands[0])', 0, eng.code, eng.out);
  }

  console.log('explicit --out paths (pre-existing behaviour)');
  const rendered = join(tmp, 'rendered');
  const eng2 = run(engine, [pack, '--out', rendered], repoRoot);
  if (eng2.code !== 0) {
    fail('engine --out render for --out tests', eng2.out);
  } else {
    const withFrames = run(validate, [pack, '--out', rendered], repoRoot);
    check('validate --out <dir with frames> exits 0', 0, withFrames.code, withFrames.out);
  }

  const empty = join(tmp, 'empty');
  mkdirSync(empty, { recursive: true });
  const noFrames = run(validate, [pack, '--out', empty], repoRoot);
  check('validate --out <empty dir> still exits 1 (missing files)', 1, noFrames.code, noFrames.out);

  console.log('partial frame state must not be silently re-rendered');
  const partial = join(tmp, 'partial');
  cpSync(join(scriptDir), partial, { recursive: true });
  writeFileSync(join(partial, 'packs', 'duck_idle.png'), 'not a real frame');
  const half = run(join(partial, 'validate-frames.mjs'), [join(partial, 'packs', 'duck.mjs')], repoRoot);
  check('bare validate with some frames present still exits 1', 1, half.code, half.out);

  console.log('temp-dir cleanup');
  const leftover = readdirSync(tmpdir()).filter((d) => d.startsWith('mascots-validate-') && !before.has(d));
  leftover.length === 0
    ? pass('no mascots-validate-* temp dirs left behind')
    : fail('no mascots-validate-* temp dirs left behind', leftover.join(', '));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const failed = results.filter(([, ok]) => !ok);
console.log(`\n${failed.length === 0 ? 'PASS' : 'FAIL'} — ${results.length - failed.length}/${results.length} checks`);
process.exit(failed.length === 0 ? 0 : 1);
