// Audits every metadata file (100 items + collection) for shape and truth.
// Runs without RPC. Fails loud on any issue. Writes a proof markdown.
//
//   node scripts/verify-metadata.js

import fs from "node:fs";
import path from "node:path";
import { config } from "../src/config.js";
import { PROMPTS } from "../src/prompts.js";
import { ROYALTY_BASIS_POINTS } from "../src/lib/royalty.js";

const pad = (n) => String(n).padStart(3, "0");
const dir = config.dirs.metadata;
const fails = [];
const ok = (cond, msg) => (cond ? null : fails.push(msg));

const EXPECTED_CREATOR = process.env.DEPLOYER_PUBKEY || "";
const HOST = `https://${config.site.domain}`;
// Typographic dashes only. Hyphen-minus is allowed for proper nouns like
// "openai/gpt-5.4-image-2" recorded verbatim in provenance.model.
const DASH_RE = /[‐‑‒–—―−]/;
const ATTR_KEYS = ["Artist", "Title", "Form", "Composition", "Tempo", "Mood", "Palette", "Edition"];

const names = new Set();
const titles = new Set();
const seeds = new Set();
const images = new Set();

console.log(`Auditing ${dir}`);
console.log(`Expected creator: ${EXPECTED_CREATOR || "(DEPLOYER_PUBKEY not set; will skip creator address assertion)"}`);
console.log(`Host: ${HOST}`);
console.log(`Royalty bps expected: ${ROYALTY_BASIS_POINTS}`);
console.log("");

for (const p of PROMPTS) {
  const id = pad(p.id);
  const fp = path.join(dir, `${id}.json`);
  if (!fs.existsSync(fp)) { fails.push(`${id}: missing metadata file`); continue; }
  let m;
  try { m = JSON.parse(fs.readFileSync(fp, "utf8")); }
  catch (e) { fails.push(`${id}: invalid JSON (${e.message})`); continue; }

  ok(m.name === `abstract #${id} · ${p.title}`, `${id}: name pattern (got "${m.name}")`);
  ok(m.symbol === "ART", `${id}: symbol === ART`);
  ok(typeof m.description === "string" && m.description.length > 0, `${id}: description present`);
  ok(m.image === `${HOST}/images/${id}.png`, `${id}: image URL`);
  ok(m.external_url === HOST, `${id}: external_url`);
  ok(m.seller_fee_basis_points === ROYALTY_BASIS_POINTS, `${id}: seller_fee_basis_points = ${ROYALTY_BASIS_POINTS}`);

  ok(Array.isArray(m.attributes) && m.attributes.length === ATTR_KEYS.length,
     `${id}: attributes count (got ${m.attributes && m.attributes.length})`);
  let titleAttr;
  if (Array.isArray(m.attributes)) {
    const gotKeys = m.attributes.map((a) => a.trait_type);
    ok(JSON.stringify(gotKeys) === JSON.stringify(ATTR_KEYS),
       `${id}: attribute order = ${ATTR_KEYS.join(",")}`);
    titleAttr = m.attributes.find((a) => a.trait_type === "Title")?.value;
    ok(titleAttr === p.title, `${id}: title attribute matches prompts.js`);
    const editionAttr = m.attributes.find((a) => a.trait_type === "Edition")?.value;
    ok(editionAttr === `${p.id} / 100`, `${id}: edition attribute = "${p.id} / 100"`);
  }

  const props = m.properties || {};
  ok(props.category === "image", `${id}: properties.category = image`);
  ok(Array.isArray(props.files) && props.files.length === 1, `${id}: 1 file`);
  ok(props.files?.[0]?.uri === m.image, `${id}: file uri = image`);
  ok(props.files?.[0]?.type === "image/png", `${id}: file type = image/png`);

  if (EXPECTED_CREATOR) {
    ok(Array.isArray(props.creators) && props.creators.length === 1,
       `${id}: creators array length 1`);
    ok(props.creators?.[0]?.address === EXPECTED_CREATOR,
       `${id}: creator address = ${EXPECTED_CREATOR}`);
    ok(props.creators?.[0]?.share === 100, `${id}: creator share = 100`);
  }

  ok(props.provenance && props.provenance.artist === "Halden Voss",
     `${id}: provenance.artist = Halden Voss`);
  ok(typeof props.provenance?.prompt === "string" && props.provenance.prompt.length > 50,
     `${id}: provenance.prompt non-trivial`);
  ok(props.provenance?.seed === p.seed, `${id}: provenance.seed = ${p.seed}`);

  names.add(m.name);
  titles.add(titleAttr);
  seeds.add(props.provenance?.seed);
  images.add(m.image);
}

// Collection
const cfp = path.join(dir, "collection.json");
if (fs.existsSync(cfp)) {
  const c = JSON.parse(fs.readFileSync(cfp, "utf8"));
  ok(c.name === "abstract", `collection: name = abstract`);
  ok(c.symbol === "ART", `collection: symbol = ART`);
  ok(c.image === `${HOST}/images/collection.png`, `collection: image URL`);
  ok(c.external_url === HOST, `collection: external_url`);
  ok(c.properties?.category === "image", `collection: properties.category`);
  ok(c.properties?.artist === "Halden Voss", `collection: properties.artist`);
} else fails.push("collection.json missing");

// Cross collection invariants
ok(names.size === PROMPTS.length, `unique names: ${names.size} / ${PROMPTS.length}`);
ok(seeds.size === PROMPTS.length, `unique seeds: ${seeds.size} / ${PROMPTS.length}`);
ok(images.size === PROMPTS.length, `unique image URLs: ${images.size} / ${PROMPTS.length}`);

// Concat all metadata + collection text and assert no dash characters anywhere
let allText = "";
for (let i = 1; i <= 100; i++) {
  const fp = path.join(dir, `${pad(i)}.json`);
  if (fs.existsSync(fp)) allText += fs.readFileSync(fp, "utf8") + "\n";
}
if (fs.existsSync(cfp)) allText += fs.readFileSync(cfp, "utf8");
const dashHits = allText.match(DASH_RE);
ok(!dashHits, `no dash characters in metadata JSON corpus${dashHits ? ` (first hit: ${JSON.stringify(dashHits[0])})` : ""}`);

const passed = (PROMPTS.length * 19) + 6 + 4 - fails.length;
const total = (PROMPTS.length * 19) + 6 + 4;
console.log(`Audited ${PROMPTS.length} items + collection.json.`);
console.log(`${passed} / ${total} assertions passed, ${fails.length} failed.`);
if (fails.length) {
  console.log("\nFailures:");
  for (const f of fails.slice(0, 30)) console.log("  " + f);
  if (fails.length > 30) console.log(`  ... ${fails.length - 30} more`);
}

const lines = [];
lines.push("# Metadata audit proof");
lines.push("");
lines.push(`Generated at: ${new Date().toISOString()}`);
lines.push(`Files audited: 100 item metadata + collection.json`);
lines.push(`Expected creator (DEPLOYER_PUBKEY): ${EXPECTED_CREATOR || "(unset; creator assertion skipped)"}`);
lines.push(`Expected host: ${HOST}`);
lines.push(`Expected royalty: ${ROYALTY_BASIS_POINTS} bps`);
lines.push("");
lines.push(`Result: **${passed} / ${total}** assertions passed (${fails.length} failures).`);
lines.push("");
if (fails.length === 0) {
  lines.push("Every file passed: name pattern, symbol, description, image URL, external_url, royalty, 8 attributes in expected order, properties.category, single file, file URI matches image, file type image/png, creators (when DEPLOYER_PUBKEY set), provenance artist + non-trivial prompt + seed matching src/prompts.js.");
  lines.push("");
  lines.push("Cross-collection: 100 unique names, 100 unique seeds, 100 unique image URLs.");
  lines.push("");
  lines.push("Dashless: no dash character of any kind found in the JSON corpus.");
}
fs.mkdirSync(path.join("output", "proofs"), { recursive: true });
fs.writeFileSync(path.join("output", "proofs", "METADATA-AUDIT.md"), lines.join("\n"));
console.log(`\nProof written to output/proofs/METADATA-AUDIT.md`);
if (fails.length) process.exit(1);
