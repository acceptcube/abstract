// Batch art generator. Resume safe (skips existing), small concurrency,
// retries with backoff, writes a manifest.
//   node scripts/generate-art.js --test          # first 5 only
//   node scripts/generate-art.js                 # all 100
//   node scripts/generate-art.js --only 7,12,40  # regenerate specific ids

import fs from "node:fs";
import path from "node:path";
import { config } from "../src/config.js";
import { PROMPTS } from "../src/prompts.js";
import { generateImage } from "../src/lib/openrouter.js";

const args = process.argv.slice(2);
const isTest = args.includes("--test");
const onlyArg = args[args.indexOf("--only") + 1];
const onlyIds = args.includes("--only")
  ? new Set(onlyArg.split(",").map((n) => Number(n.trim())))
  : null;
const CONCURRENCY = 3;
const MAX_RETRIES = 4;

for (const d of Object.values(config.dirs)) fs.mkdirSync(d, { recursive: true });

let targets = PROMPTS;
if (onlyIds) targets = PROMPTS.filter((p) => onlyIds.has(p.id));
else if (isTest) targets = PROMPTS.slice(0, 5);

const pad = (n) => String(n).padStart(3, "0");
const imgPath = (p) => path.join(config.dirs.images, `${pad(p.id)}.png`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function doOne(p) {
  const dest = imgPath(p);
  if (fs.existsSync(dest) && !onlyIds) return { id: p.id, status: "skipped" };
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const buf = await generateImage(p.prompt, { seed: p.seed });
      if (!buf || buf.length < 1000)
        throw new Error(`Suspiciously small image (${buf?.length} bytes)`);
      fs.writeFileSync(dest, buf);
      console.log(`  [${pad(p.id)}] OK  ${p.title}  (${buf.length} bytes)`);
      return { id: p.id, status: "ok", bytes: buf.length };
    } catch (e) {
      const wait = Math.min(2000 * 2 ** (attempt - 1), 20000);
      console.warn(
        `  [${pad(p.id)}] attempt ${attempt}/${MAX_RETRIES} failed: ${e.message}`
      );
      if (attempt === MAX_RETRIES) return { id: p.id, status: "failed", error: e.message };
      await sleep(wait);
    }
  }
}

async function run() {
  console.log(`Generating ${targets.length} image(s) with ${config.openrouter.model}\n`);
  const results = [];
  const queue = [...targets];
  async function worker() {
    while (queue.length) results.push(await doOne(queue.shift()));
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const manifest = targets.map((p) => ({
    id: p.id, title: p.title, form: p.form, palette: p.palette,
    composition: p.composition, tempo: p.tempo, mood: p.mood,
    seed: p.seed, prompt: p.prompt, file: `${pad(p.id)}.png`,
  }));
  fs.writeFileSync(
    path.join(config.dirs.metadata, "prompts-manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  const ok = results.filter((r) => r.status === "ok").length;
  const skip = results.filter((r) => r.status === "skipped").length;
  const fail = results.filter((r) => r.status === "failed");
  console.log(`\nDone. ok=${ok} skipped=${skip} failed=${fail.length}`);
  if (fail.length) {
    console.log("Failed ids:", fail.map((f) => f.id).join(","));
    process.exitCode = 1;
  }
}
run();
