# mascots — agent notes

- Skill format follows the Agent Skills spec (agentskills.io): `SKILL.md`
  frontmatter = `name` + keyword-rich `description`; body ≤ 500 lines;
  details in `references/`; deterministic helpers in `scripts/`.
- Author skills for agent consumption: imperative voice, one decision per
  step, routing tables over prose. See the /writing-for-agents skill.
- Changing engine or pack code: re-run
  `node skills/mascot/scripts/engine.mjs skills/mascot/scripts/packs/duck.mjs --out /tmp/check`
  and `node skills/mascot/scripts/validate-frames.mjs ...` — the duck pack
  must stay PASS and its frame PNGs byte-identical (contact sheet may evolve).
- Changing the smooth engine, a smooth pack, or its validator: run
  `node skills/mascot/scripts/smooth-engine.mjs skills/mascot/scripts/packs/smooth-duck.mjs --out /tmp/check-smooth`
  then `node skills/mascot/scripts/validate-smooth-frames.mjs skills/mascot/scripts/packs/smooth-duck.mjs --out /tmp/check-smooth`
  — the smooth-duck pack must stay PASS (frame set, canvas, alpha outside
  silhouette, byte-determinism; `npm ci` first for the pinned rasterizer).
- Commit titles: `<emoji> [type] scope: subject` (✨ feat 🐛 fix 📝 docs 🔧 chore).
