// test-new-pack — black-box regression tests for new-pack.mjs (issue #1).
//
//   node test-new-pack.mjs
//
// Pins the dual-kind scaffolder contract: `--kind smooth` is the default and
// `--kind pixel` is explicit; both starters pass their kind's validator
// as-is; the same animal name scaffolds byte-identically (per-name seed);
// bad names, taken names and bad kinds refuse with the documented exits.

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../../..');

const results = [];
const skipped = [];
const fail = (name, detail) => {
  results.push([name, false, detail]);
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
};
const pass = (name) => {
  results.push([name, true, '']);
  console.log(`  ✓ ${name}`);
};
const skip = (name, why) => {
  skipped.push([name, why]);
  console.log(`  ⊘ ${name} — skipped: ${why}`);
};

function run(cmd, args, cwd) {
  const r = spawnSync('node', [cmd, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

function check(name, want, got, out) {
  got === want ? pass(name) : fail(name, `exit ${got}, want ${want}\n${out.trim().split('\n').slice(-3).join('\n')}`);
}

// A stand-alone copy of scripts/ with a packs/ dir — the scaffolder writes
// next to itself, so tests run against copies, never the working tree.
function scriptsCopy(name) {
  const dir = join(tmp, name);
  cpSync(scriptDir, dir, { recursive: true });
  for (const stale of readdirSync(join(dir, 'packs'))) rmSync(join(dir, 'packs', stale));
  return dir;
}

const tmp = mkdtempSync(join(tmpdir(), 'mascots-test-new-pack-'));

try {
  console.log('kind selection');
  const a = scriptsCopy('kind-a');
  const def = run(join(a, 'new-pack.mjs'), ['qa-default'], repoRoot);
  check('scaffold with no --kind exits 0', 0, def.code, def.out);
  existsSync(join(a, 'packs', 'qa-default.mjs'))
    ? pass('scaffold writes packs/qa-default.mjs')
    : fail('scaffold writes packs/qa-default.mjs');
  readFileSync(join(a, 'packs', 'qa-default.mjs'), 'utf8').includes("kind: 'smooth'")
    ? pass('default kind is smooth (flagship per ADR 0001)')
    : fail('default kind is smooth (flagship per ADR 0001)');

  const sm = run(join(a, 'new-pack.mjs'), ['qa-smooth', '--kind', 'smooth'], repoRoot);
  check('--kind smooth exits 0', 0, sm.code, sm.out);
  readFileSync(join(a, 'packs', 'qa-smooth.mjs'), 'utf8').includes('smooth-engine.mjs')
    ? pass('--kind smooth starter references the smooth engine')
    : fail('--kind smooth starter references the smooth engine');

  const px = run(join(a, 'new-pack.mjs'), ['qa-pixel', '--kind', 'pixel'], repoRoot);
  check('--kind pixel exits 0', 0, px.code, px.out);
  readFileSync(join(a, 'packs', 'qa-pixel.mjs'), 'utf8').includes('grid: 25')
    ? pass('--kind pixel starter is a 25-grid pixel pack')
    : fail('--kind pixel starter is a 25-grid pixel pack');

  console.log('refusals (usage, taken name, bad kind)');
  const noname = run(join(a, 'new-pack.mjs'), [], repoRoot);
  check('missing name exits 2 with usage', 2, noname.code, noname.out);
  const bad = run(join(a, 'new-pack.mjs'), ['Bad Name'], repoRoot);
  check('invalid name exits 2', 2, bad.code, bad.out);
  const taken = run(join(a, 'new-pack.mjs'), ['qa-smooth'], repoRoot);
  check('existing pack name exits 1', 1, taken.code, taken.out);
  const kind = run(join(a, 'new-pack.mjs'), ['qa-x', '--kind', 'bogus'], repoRoot);
  check('unknown kind exits 2', 2, kind.code, kind.out);

  console.log('determinism (per-name seed)');
  const b = scriptsCopy('kind-b');
  run(join(b, 'new-pack.mjs'), ['qa-smooth'], repoRoot);
  const bytesA = readFileSync(join(a, 'packs', 'qa-smooth.mjs'));
  const bytesB = readFileSync(join(b, 'packs', 'qa-smooth.mjs'));
  bytesA.equals(bytesB)
    ? pass('same name scaffolds byte-identically in a fresh dir')
    : fail('same name scaffolds byte-identically in a fresh dir');
  run(join(b, 'new-pack.mjs'), ['qa-pixel', '--kind', 'pixel'], repoRoot);
  !readFileSync(join(b, 'packs', 'qa-pixel.mjs')).equals(bytesA)
    ? pass('different name or kind scaffolds differently')
    : fail('different name or kind scaffolds differently');

  console.log('pixel starter passes its validator as-is (fresh render, zero deps)');
  const pixel = run(join(a, 'engine.mjs'), [join(a, 'packs', 'qa-pixel.mjs'), '--out', join(tmp, 'pixel-render')], repoRoot);
  if (pixel.code !== 0) {
    fail('pixel starter renders with engine.mjs', pixel.out);
  } else {
    pass('pixel starter renders with engine.mjs');
    const v = run(join(a, 'validate-frames.mjs'), [join(a, 'packs', 'qa-pixel.mjs')], repoRoot);
    check('pixel starter passes validate-frames.mjs as-is', 0, v.code, v.out);
  }

  console.log('smooth starter passes its validator as-is (pinned rasterizer)');
  const requireFromRepo = createRequire(join(repoRoot, 'package.json'));
  let resvg = false;
  try {
    requireFromRepo.resolve('@resvg/resvg-js');
    resvg = true;
  } catch {}
  if (!resvg) {
    skip('smooth starter renders + passes validate-smooth-frames.mjs as-is', '@resvg/resvg-js not installed (npm ci first)');
  } else {
    const s = scriptsCopy('smooth-full');
    cpSync(join(repoRoot, 'node_modules'), join(s, 'node_modules'), { recursive: true });
    const scaffolded = run(join(s, 'new-pack.mjs'), ['qa-smooth'], repoRoot);
    if (scaffolded.code !== 0) {
      fail('smooth starter scaffolds into a fresh scripts copy', scaffolded.out);
    }
    const rendered = run(join(s, 'smooth-engine.mjs'), [join(s, 'packs', 'qa-smooth.mjs'), '--out', join(tmp, 'smooth-render')], repoRoot);
    if (rendered.code !== 0) {
      fail('smooth starter renders with smooth-engine.mjs', rendered.out);
    } else {
      pass('smooth starter renders with smooth-engine.mjs');
      const v = run(join(s, 'validate-smooth-frames.mjs'), [join(s, 'packs', 'qa-smooth.mjs')], repoRoot);
      check('smooth starter passes validate-smooth-frames.mjs as-is', 0, v.code, v.out);
    }
  }

  console.log('temp-dir cleanup');
  const leftover = readdirSync(tmpdir()).filter((d) => d.startsWith('mascots-test-new-pack-') && join(tmpdir(), d) !== tmp);
  leftover.length === 0
    ? pass('no mascots-test-new-pack-* temp dirs left behind')
    : fail('no mascots-test-new-pack-* temp dirs left behind', leftover.join(', '));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const failed = results.filter(([, ok]) => !ok);
console.log(`\n${failed.length === 0 ? 'PASS' : 'FAIL'} — ${results.length - failed.length}/${results.length} checks${skipped.length ? ` · ${skipped.length} skipped` : ''}`);
process.exit(failed.length === 0 ? 0 : 1);
