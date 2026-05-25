// 1500x500 banner of finished works, 6 wide by 2 tall, no gaps.
// Resume safe: regenerate any time, picks first 12 ids that exist.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PROMPTS } from "../src/prompts.js";

const pad = (n) => String(n).padStart(3, "0");
const imgDir = path.join("output", "images");
const destDir = path.join("output", "brand");
fs.mkdirSync(destDir, { recursive: true });

const have = PROMPTS.filter((p) =>
  fs.existsSync(path.join(imgDir, pad(p.id) + ".png"))
);
if (have.length < 12) {
  console.error(`Need at least 12 generated images, have ${have.length}.`);
  process.exit(1);
}
const picks = have.slice(0, 12);

const TILE = 250;
const COLS = 6;
const ROWS = 2;

const composites = [];
for (let i = 0; i < 12; i++) {
  const id = pad(picks[i].id);
  const file = path.join(imgDir, id + ".png");
  const buf = await sharp(file)
    .resize(TILE, TILE, { fit: "cover", position: "centre" })
    .toBuffer();
  composites.push({
    input: buf,
    left: (i % COLS) * TILE,
    top: Math.floor(i / COLS) * TILE,
  });
}

const dest = path.join(destDir, "banner.png");
await sharp({
  create: {
    width: COLS * TILE,
    height: ROWS * TILE,
    channels: 3,
    background: { r: 255, g: 255, b: 255 },
  },
})
  .composite(composites)
  .png()
  .toFile(dest);

console.log(
  `wrote ${dest} (${COLS * TILE}x${ROWS * TILE}, ${COLS}x${ROWS} tiles of ${TILE}px) from ids: ${picks.map((p) => pad(p.id)).join(",")}`
);
