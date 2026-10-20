
import lookup from "./lookup.js";

const KEY = "QFA_DEEPLINK_V1";
const SITE = "https://qfa.alhudapk.com";
const LOGO = `${SITE}/assets/logo-full.png`;

function decodeToken(token) {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - b64.length % 4) % 4);
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);

    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length);
    }

    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function validImage(value) {
  try {
    const url = new URL(value || LOGO);
    return url.protocol === "https:" ? url.href : LOGO;
  } catch {
    return LOGO;
  }
}

export async function renderPreview(context, kind) {
  const { request, params, env } = context;
  const code = decodeToken(params.token);

  let title = "Learn Qur'an";
  let description = "Explore Qur'an, tafsir, and audio.";
  let image = LOGO;

  if (code && kind === "audio" && lookup.audio[code]) {
    const item = lookup.audio[code];
    const parent = lookup.series[item.seriesCode];

    title = item.title || title;
    description = parent
      ? `From the series: ${parent.title}`
      : "Audio lecture — Learn Qur'an";
    image = parent?.image || LOGO;
  }

  if (code && kind === "ayah") {
    // The inspected database has no ayah table.
    // Until verse data is available, use a safe default preview.
    title = "Learn Qur'an";
    description = "Open this Qur'an link in Learn Qur'an.";
  }

  image = validImage(image);

  // Use the existing fallback page for the visible app/store fallback UI.
  if (!env.ASSETS) {
    return new Response(
      "Cloudflare ASSETS binding is not configured.",
      { status: 500 }
    );
  }

  const fallback = await env.ASSETS.fetch(
    new Request(new URL("/fallback.html", request.url))
  );

  if (!fallback.ok) {
    return new Response("Could not load fallback.html", { status: 500 });
  }

  let html = await fallback.text();

  html = html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, "")
    .replace(
      /<meta\b(?=[^>]*(?:property|name)\s*=\s*["'](?:og:[^"']*|twitter:[^"']*)["'])[^>]*>/gi,
      ""
    );

  const metadata = `
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Learn Qur'an">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${escapeHtml(request.url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">`;

  if (!/<\/head>/i.test(html)) {
    return new Response("fallback.html has no closing head tag.", {
      status: 500
    });
  }

  html = html.replace(/<\/head>/i, `${metadata}\n</head>`);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}
