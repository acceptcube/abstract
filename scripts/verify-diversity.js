// Proves the 100 works are diverse across every dimension that matters:
// titles, seeds, prompts, palette descriptions, story sentences, and the
// form family distribution (10 each of 10 families with adjacent ids drawn
// from different families).
//
//   node scripts/verify-diversity.js

import fs from "node:fs";
import path from "node:path";
import { PROMPTS, FORM_DESCRIPTIONS } from "../src/prompts.js";

const fails = [];
const ok = (cond, msg) => (cond ? null : fails.push(msg));

const ids = PROMPTS.map((p) => p.id);
const titles = PROMPTS.map((p) => p.title);
const seeds = PROMPTS.map((p) => p.seed);
const prompts = PROMPTS.map((p) => p.prompt);
const stories = PROMPTS.map((p) => p.story);
const palettes = PROMPTS.map((p) => p.palette);
const forms = PROMPTS.map((p) => p.form);

ok(PROMPTS.length === 100, `100 entries (got ${PROMPTS.length})`);
ok(new Set(ids).size === 100, "100 unique ids");
ok(JSON.stringify(ids) === JSON.stringify(Array.from({ length: 100 }, (_, i) => i + 1)),
   "ids are 1..100 sequential");
ok(new Set(titles).size === 100, `100 unique titles (got ${new Set(titles).size})`);
ok(new Set(seeds).size === 100, `100 unique seeds`);
ok(new Set(prompts).size === 100, `100 unique generation prompts`);
ok(new Set(stories).size === 100, `100 unique first-person statements`);

// Seeds match the formula seedFor(id) = 200003 + id*7919
const expectedSeed = (id) => 200003 + id * 7919;
const seedFormulaOk = PROMPTS.every((p) => p.seed === expectedSeed(p.id));
ok(seedFormulaOk, "every seed matches the deterministic formula 200003 + id*7919");

// Form distribution: 10 of each of 10 families
const familyCounts = {};
for (const f of forms) familyCounts[f] = (familyCounts[f] || 0) + 1;
const expectedFamilies = Object.keys(FORM_DESCRIPTIONS);
ok(expectedFamilies.every((f) => familyCounts[f] === 10),
   "form distribution: 10 each of the 10 families");

// Adjacent ids are different form families (interleaving guarantee)
let adjacentDifferent = true;
for (let i = 1; i < forms.length; i++) {
  if (forms[i] === forms[i - 1]) { adjacentDifferent = false; break; }
}
ok(adjacentDifferent, "adjacent ids are drawn from different form families");

// Each prompt contains both the LEAD signature and the per-form description
const LEAD_FRAG = "fuses three visual instincts";
const leadEverywhere = PROMPTS.every((p) => p.prompt.includes(LEAD_FRAG));
ok(leadEverywhere, "every prompt carries the fused-style lead signature");

const formDescEverywhere = PROMPTS.every((p) =>
  p.prompt.includes(FORM_DESCRIPTIONS[p.form])
);
ok(formDescEverywhere, "every prompt embeds its form family description verbatim");

// Stories are not templated
const avgStoryLen = stories.reduce((s, x) => s + x.length, 0) / stories.length;
ok(avgStoryLen >= 40 && avgStoryLen <= 220,
   `story average length sane (${avgStoryLen.toFixed(1)} chars)`);

// Palette diversity: at least 80 distinct palettes (some overlap allowed
// across families is fine, but most must be unique)
const uniquePalettes = new Set(palettes).size;
ok(uniquePalettes >= 80, `at least 80 unique palette descriptors (got ${uniquePalettes})`);

console.log(`${fails.length === 0 ? "PASS" : "FAIL"}: ${(13 - fails.length)} / 13 assertions`);
if (fails.length) for (const f of fails) console.log("  - " + f);

// Distribution table for the proof
const lines = [];
lines.push("# Diversity proof");
lines.push("");
lines.push(`Generated at: ${new Date().toISOString()}`);
lines.push("");
lines.push(`Result: **${13 - fails.length} / 13** assertions passed.`);
lines.push("");
lines.push("## Counts");
lines.push("");
lines.push("| dimension | unique values |");
lines.push("|---|---|");
lines.push(`| ids | ${new Set(ids).size} / 100 |`);
lines.push(`| titles | ${new Set(titles).size} / 100 |`);
lines.push(`| seeds | ${new Set(seeds).size} / 100 (formula: 200003 + id * 7919) |`);
lines.push(`| generation prompts | ${new Set(prompts).size} / 100 |`);
lines.push(`| first-person statements | ${new Set(stories).size} / 100 |`);
lines.push(`| palette descriptors | ${uniquePalettes} / 100 |`);
lines.push("");
lines.push("## Form family distribution");
lines.push("");
lines.push("| family | count |");
lines.push("|---|---|");
for (const f of expectedFamilies) lines.push(`| ${f} | ${familyCounts[f] || 0} |`);
lines.push("");
lines.push("Adjacent ids belong to different form families, so the first qualifiers receive visually distinct pieces.");
lines.push("");
if (fails.length) {
  lines.push("## Failures");
  for (const f of fails) lines.push(`- ${f}`);
}

fs.mkdirSync(path.join("output", "proofs"), { recursive: true });
fs.writeFileSync(path.join("output", "proofs", "DIVERSITY-PROOF.md"), lines.join("\n"));
console.log(`\nProof written to output/proofs/DIVERSITY-PROOF.md`);

if (fails.length) process.exit(1);
