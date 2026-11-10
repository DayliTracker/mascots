// test-scaffold-flow — end-to-end regression for the documented /mascot
// scaffold flow (SKILL.md steps 2–5) inside an app dir reached through a
// symlinked path (issue #14).
//
//   node test-scaffold-flow.mjs
//
// Vendors the engine per references/pipeline.md into a fixture app, renders
// the duck pack per SKILL.md GATE 1, then runs validate-frames.mjs per the
// pipeline delivery gate. GATE 2 must report "PASS — 0 problem(s)". The old
// CLI guard silently no-oped here: exit 0, no output, zero files, and GATE 2
// failed with 20 missing-file problems. Also pins the percent-encoded entry
// path claim from the fix (pathToFileURL round-trips, so a space in the app
// path still matches import.meta.url).

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillDir = join(scriptDir, '..');

const results = [];
const fail = (name, detail) => {
  results.push([name, false, detail]);
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
};
const pass = (name) => {
  results.push([name, true, '']);
  console.log(`  ✓ ${name}`);
};

function run(args, cwd) {
  const r = spawnSync('node', args, { cwd, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

// A base directory whose own path is a symlink, so argv[1] as typed never
// equals node's realpath'd import.meta.url. Uses /tmp on macOS (→/private/tmp);
// elsewhere wraps a temp dir in a symlink so the regression runs anywhere.
function makeSymlinkedBase() {
  const t = '/tmp';
  if (realpathSync(t) !== t) return { base: t, cleanup: null };
  const real = mkdtempSync(join(tmpdir(), 'mascots-scaffold-real-'));
  const link = `${real}-link`;
  try {
    symlinkSync(real, link, 'dir');
  } catch {
    return { base: real, cleanup: null }; // host forbids symlinks; direct temp dir
  }
  return {
    base: link,
    cleanup: () => {
      rmSync(link, { force: true });
      rmSync(real, { recursive: true, force: true });
    },
  };
}

// Vendor per references/pipeline.md "Vendoring" (SKILL.md step 2), with the
// duck pack standing in for the designed pack (SKILL.md step 3).
function vendor(app) {
  mkdirSync(join(app, 'scripts/mascots/packs'), { recursive: true });
  mkdirSync(join(app, 'assets/mascots'), { recursive: true });
  mkdirSync(join(app, 'components'), { recursive: true });
  cpSync(join(skillDir, 'scripts/engine.mjs'), join(app, 'scripts/mascots/engine.mjs'));
  cpSync(join(skillDir, 'scripts/validate-frames.mjs'), join(app, 'scripts/mascots/validate-frames.mjs'));
  cpSync(join(skillDir, 'assets/palettes.json'), join(app, 'scripts/mascots/palettes.json'));
  cpSync(join(skillDir, 'scripts/packs/duck.mjs'), join(app, 'scripts/mascots/packs/duck.mjs'));
  cpSync(join(skillDir, '../../react-native/PixelPet.tsx'), join(app, 'components/PixelPet.tsx'));
}

const pngCount = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.png')).length : 0;
const tail = (out) => out.trim().split('\n').slice(-3).join('\n');

const { base, cleanup } = makeSymlinkedBase();
console.log('documented scaffold flow (SKILL.md steps 2–5) in an app dir under a symlinked base');
const tmp = mkdtempSync(join(base, 'mascots-scaffold-'));
try {
  const app = join(tmp, 'app');
  vendor(app);

  const out = join(app, 'assets/mascots/duck');
  const render = run(
    ['scripts/mascots/engine.mjs', 'scripts/mascots/packs/duck.mjs', '--out', 'assets/mascots/duck'],
    app
  );
  render.code === 0 && render.out.includes('Wrote 10 files') && pngCount(out) === 10
    ? pass('GATE 1 renders 10 files, exit 0')
    : fail('GATE 1 renders 10 files, exit 0', `exit ${render.code}, ${pngCount(out)} pngs\n${tail(render.out)}`);

  const gate = run(
    ['scripts/mascots/validate-frames.mjs', 'scripts/mascots/packs/duck.mjs', '--out', 'assets/mascots/duck'],
    app
  );
  gate.code === 0 && gate.out.includes('PASS — 0 problem(s)')
    ? pass('GATE 2 validate-frames PASS — 0 problem(s)')
    : fail('GATE 2 validate-frames PASS — 0 problem(s)', `exit ${gate.code}\n${tail(gate.out)}`);

  console.log('entry path containing a space (percent-encoded URL round-trip)');
  const spaced = join(tmp, 'app with space');
  vendor(spaced);
  const out2 = join(spaced, 'assets/mascots/duck');
  const r2 = run(
    ['scripts/mascots/engine.mjs', 'scripts/mascots/packs/duck.mjs', '--out', 'assets/mascots/duck'],
    spaced
  );
  r2.code === 0 && pngCount(out2) === 10
    ? pass('renders 10 files, exit 0')
    : fail('renders 10 files, exit 0', `exit ${r2.code}, ${pngCount(out2)} pngs\n${tail(r2.out)}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
  if (cleanup) cleanup();
}

const failed = results.filter(([, ok]) => !ok);
console.log(`\n${failed.length === 0 ? 'PASS' : 'FAIL'} — ${results.length - failed.length}/${results.length} checks`);
process.exit(failed.length === 0 ? 0 : 1);
