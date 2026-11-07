// test-dual-mode-docs — doc-conformance checks for the /mascot dual-mode skill
// (issue #1, QA v2). The docs ACs have no code rung; these checks pin the
// documented contract so a doc edit that drops dual-mode support fails here.
//
//   node test-dual-mode-docs.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(skillDir, p), 'utf8');

const results = [];
const fail = (name, detail) => {
  results.push(false);
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
};
const pass = (name) => {
  results.push(true);
  console.log(`  ✓ ${name}`);
};
const has = (name, hay, ...needles) =>
  needles.every((n) => hay.includes(n)) ? pass(name) : fail(name, `missing one of: ${needles.map((n) => JSON.stringify(n)).join(', ')}`);

let skill, craft, qa, pipeline, recipes;
try {
  skill = read('SKILL.md');
  craft = read('references/craft.md');
  qa = read('references/qa.md');
  pipeline = read('references/pipeline.md');
  recipes = read('references/animal-recipes.md');
} catch (e) {
  console.log(`  ✗ skill files readable — ${e.message}`);
  process.exit(1);
}

console.log('AC1 — SKILL.md documents the smooth pipeline and when to choose each kind');
has('kind-choice table with a "Choose when" row per kind', skill, 'Pack kinds', 'Choose when', 'flagship');
has('smooth pipeline steps name the smooth engine + repo-side render', skill, 'smooth-engine.mjs', 'PNG frames');
has('pixel pipeline steps name the pixel engine + validator', skill, 'engine.mjs', 'validate-frames.mjs');
has('scaffolder documented with both kinds', skill, 'new-pack.mjs', '--kind smooth|pixel');
has('pipeline.md carries smooth rendering + app layout', pipeline, 'smooth', 'manifest.json');

console.log('AC2 — references cover smooth craft and smooth QA');
has('craft.md has the SVG-authoring section', craft, 'Smooth craft — SVG authoring', 'parametric');
has('craft.md bans <text> in SVG frames', craft, 'NEVER `<text>`');
has('craft.md states the alpha gate as the outline discipline', craft, 'alpha gate', 'silhouette()');
has('craft.md keeps the pixel sections', craft, 'Outline, shading, anti-aliasing', 'pixel');
has('qa.md names the smooth validator checks', qa, 'validate-smooth-frames.mjs', 'alpha', 'registration', 'determinism');
has('qa.md documents contact-sheet knobs', qa, 'sheet: { bg, scale, gap, pad }');
has('recipes apply to both kinds', recipes, 'BOTH pack', 'kinds');

console.log('AC5 — NEVERs span pixel maps and SVG; image-gen stays excluded');
has('NEVERs say art is code in BOTH kinds', skill, 'BOTH kinds');
has('NEVERs name hand-written pixel maps AND hand-authored SVG', skill, 'pixel maps', 'hand-authored SVG');
has('NEVERs keep the image-gen exclusion', skill, 'image-gen AI');
has('smooth starter itself says no image generation', read('scripts/new-pack.mjs'), 'no image generation');

const failed = results.filter((ok) => !ok).length;
console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${results.length - failed}/${results.length} checks`);
process.exit(failed === 0 ? 0 : 1);
