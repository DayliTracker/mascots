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
- Commit titles: `<emoji> [type] scope: subject` (✨ feat 🐛 fix 📝 docs 🔧 chore).
