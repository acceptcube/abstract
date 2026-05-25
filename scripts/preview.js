// Tiny live preview page of everything generated so far. Writes
// output/preview.html and auto reloads every 45s while generation runs.
//
//   node scripts/preview.js

import fs from "node:fs";
import path from "node:path";
import { PROMPTS } from "../src/prompts.js";

const pad = (n) => String(n).padStart(3, "0");
const imgDir = path.join("output", "images");
const have = PROMPTS.filter((p) =>
  fs.existsSync(path.join(imgDir, pad(p.id) + ".png"))
);
const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
  }[c]));

const cards = have
  .map((p) => {
    const id = pad(p.id);
    return `<figure data-src="images/${id}.png" data-cap="#${id} ${esc(p.title)} · ${esc(p.form)}">
  <img loading="lazy" src="images/${id}.png" alt="${esc(p.title)}">
  <figcaption><span class="id">${id}</span>${esc(p.title)}<span class="form">${esc(p.form)}</span></figcaption>
</figure>`;
  })
  .join("\n");

const body = have.length === 0
  ? `<p class="empty">No images written yet. The generator is running. This page reloads every 45s.</p>`
  : `<main class="grid">${cards}</main>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>abstract — generated so far (${have.length} / 100)</title>
<style>
  :root{--bg:#fff;--ink:#0c0c0c;--dim:#7a7a7a;--line:#ececec}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,Arial,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased}
  header{padding:28px 40px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:12px;position:sticky;top:0;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);z-index:5}
  header h1{margin:0;font-size:20px;font-weight:500;letter-spacing:-.01em}
  header .meta{color:var(--dim);font-size:12.5px;font-family:ui-monospace,Consolas,monospace;letter-spacing:.04em}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:22px;padding:32px 40px 96px}
  figure{margin:0;background:#fff;border:1px solid transparent;transition:border-color .2s,transform .2s,box-shadow .2s;cursor:zoom-in}
  figure:hover{border-color:var(--line);transform:translateY(-2px);box-shadow:0 18px 40px rgba(0,0,0,.06)}
  figure img{width:100%;display:block;aspect-ratio:1/1;object-fit:cover;background:#f4f4f4}
  figcaption{padding:12px 6px 0;font-size:13px;line-height:1.4}
  figcaption .id{font-family:ui-monospace,Consolas,monospace;color:var(--dim);margin-right:8px;font-size:12px}
  figcaption .form{color:var(--dim);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;margin-top:6px;display:block}
  .empty{padding:96px 40px;color:var(--dim);text-align:center;font-style:italic}
  .lightbox{position:fixed;inset:0;background:rgba(8,8,8,.94);display:none;align-items:center;justify-content:center;padding:24px;cursor:zoom-out;z-index:50}
  .lightbox.on{display:flex}
  .lightbox img{max-width:96vw;max-height:92vh;object-fit:contain}
  .lcap{position:fixed;bottom:18px;left:0;right:0;text-align:center;color:#eee;font-size:13px;letter-spacing:.04em;font-family:Inter,sans-serif}
  .reload{position:fixed;bottom:14px;right:18px;font-family:ui-monospace,Consolas,monospace;font-size:11px;color:var(--dim);letter-spacing:.04em}
</style>
</head>
<body>
<header>
  <h1>abstract — generated so far</h1>
  <span class="meta">${have.length} / 100 painted</span>
</header>
${body}
<div class="lightbox" id="lb" onclick="lbClose()"><img id="lbi" alt=""><div class="lcap" id="lbc"></div></div>
<div class="reload">auto reload 45s</div>
<script>
document.querySelectorAll('figure[data-src]').forEach(function (f) {
  f.addEventListener('click', function () {
    document.getElementById('lbi').src = f.dataset.src;
    document.getElementById('lbc').textContent = f.dataset.cap;
    document.getElementById('lb').classList.add('on');
  });
});
function lbClose() { document.getElementById('lb').classList.remove('on'); }
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lbClose(); });
setTimeout(function () { location.reload(); }, 45000);
</script>
</body>
</html>`;

fs.writeFileSync(path.join("output", "preview.html"), html);
console.log(`wrote output/preview.html with ${have.length} of 100`);
