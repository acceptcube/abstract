import { config } from "../config.js";

// Generate one image via OpenRouter's image-output chat completions endpoint.
// Returns a Buffer of the image bytes. Throws on failure.
export async function generateImage(prompt, { seed, timeoutMs = 120000 } = {}) {
  const body = {
    model: config.openrouter.model,
    modalities: ["image", "text"],
    messages: [{ role: "user", content: prompt }],
  };
  if (seed != null) body.seed = seed;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${config.openrouter.baseUrl}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${config.openrouter.apiKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://haldenvoss.art",
        "X-Title": "abstract",
      },
      body: JSON.stringify(body),
    });
  } finally {
    clearTimeout(t);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${txt.slice(0, 500)}`);
  }

  const json = await res.json();
  const msg = json?.choices?.[0]?.message;
  if (!msg) throw new Error(`Unexpected response: ${JSON.stringify(json).slice(0, 500)}`);

  const url = extractImageUrl(msg);
  if (!url) {
    throw new Error(
      `No image in response: ${JSON.stringify(msg).slice(0, 500)}`
    );
  }
  return urlToBuffer(url);
}

function extractImageUrl(msg) {
  if (Array.isArray(msg.images)) {
    for (const im of msg.images) {
      const u = im?.image_url?.url || im?.url;
      if (u) return u;
    }
  }
  if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (part?.type === "image_url" && part.image_url?.url)
        return part.image_url.url;
      if (part?.type === "output_image" && part.image_url?.url)
        return part.image_url.url;
    }
  }
  return null;
}

async function urlToBuffer(url) {
  if (url.startsWith("data:")) {
    const b64 = url.split(",")[1] || "";
    return Buffer.from(b64, "base64");
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Image fetch failed ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
