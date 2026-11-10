// test-engine-entry — black-box regression tests for engine.mjs's CLI entry.
//
//   node test-engine-entry.mjs
//
// Pins the symlink contract from issue #14: the engine must render when
// invoked through a symlinked path (macOS /tmp → /private/tmp, agent scratch
// dirs, CI sandboxes). Node reports the main module's import.meta.url via
// realpath while argv[1] stays as typed, so the old raw string compare
// silently matched nothing — exit 0, no output, zero files written.

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));

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

// Vendored-app fixture per references/pipeline.md: a scripts/mascots/ copy of
// the engine plus a self-contained pack, rendered with relative paths from
// the app root.
const tmp = mkdtempSync(join(tmpdir(), 'mascots-entry-'));
try {
  const app = join(tmp, 'app');
  mkdirSync(join(app, 'scripts/mascots/packs'), { recursive: true });
  cpSync(join(scriptDir, 'engine.mjs'), join(app, 'scripts/mascots/engine.mjs'));
  cpSync(join(scriptDir, 'packs/duck.mjs'), join(app, 'scripts/mascots/packs/duck.mjs'));

  const pngCount = (dir) =>
    existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.png')).length : 0;
  const tail = (out) => out.trim().split('\n').slice(-3).join('\n');

  console.log('engine via an absolute path through a symlinked dir (issue #14)');
  const link = join(tmp, 'app-link');
  let symlinkOK = true;
  try {
    symlinkSync(app, link, 'dir');
  } catch {
    symlinkOK = false;
  }
  if (!symlinkOK) {
    console.log('  - symlink creation unsupported on this host; skipping');
  } else {
    const out = join(app, 'assets/duck-link');
    const r = run([join(link, 'scripts/mascots/engine.mjs'), 'scripts/mascots/packs/duck.mjs', '--out', 'assets/duck-link'], app);
    r.code === 0 && r.out.includes('Wrote 10 files') && pngCount(out) === 10
      ? pass('renders 10 files, exit 0')
      : fail('renders 10 files, exit 0', `exit ${r.code}, ${pngCount(out)} pngs\n${tail(r.out)}`);
  }

  console.log('engine via a direct absolute path (no symlink)');
  const direct = join(app, 'assets/duck-direct');
  const r2 = run([join(app, 'scripts/mascots/engine.mjs'), 'scripts/mascots/packs/duck.mjs', '--out', 'assets/duck-direct'], app);
  r2.code === 0 && pngCount(direct) === 10
    ? pass('renders 10 files, exit 0')
    : fail('renders 10 files, exit 0', `exit ${r2.code}, ${pngCount(direct)} pngs\n${tail(r2.out)}`);

  console.log('engine via a relative path from the app root (SKILL.md GATE 1)');
  const rel = join(app, 'assets/duck-rel');
  const r3 = run(['scripts/mascots/engine.mjs', 'scripts/mascots/packs/duck.mjs', '--out', 'assets/duck-rel'], app);
  r3.code === 0 && pngCount(rel) === 10
    ? pass('renders 10 files, exit 0')
    : fail('renders 10 files, exit 0', `exit ${r3.code}, ${pngCount(rel)} pngs\n${tail(r3.out)}`);

  console.log('importing engine.mjs must not render');
  const r4 = run(['-e', `import(${JSON.stringify(join(app, 'scripts/mascots/engine.mjs'))})`], app);
  r4.code === 0 && !r4.out.includes('Wrote')
    ? pass('exits 0, no render output')
    : fail('exits 0, no render output', `exit ${r4.code}\n${tail(r4.out)}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const failed = results.filter(([, ok]) => !ok);
console.log(`\n${failed.length === 0 ? 'PASS' : 'FAIL'} — ${results.length - failed.length}/${results.length} checks`);
process.exit(failed.length === 0 ? 0 : 1);
