import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderPreview } from "./functions/_lib/preview.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

async function assetResponse(url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  if (pathname === "/") pathname = "/fallback.html";

  const isPublicAsset = ["/fallback.html", "/styles.css", "/script.js"].includes(pathname) ||
    pathname.startsWith("/assets/") ||
    ["/.well-known/apple-app-site-association", "/.well-known/assetlinks.json"].includes(pathname);
  if (!isPublicAsset) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.resolve(ROOT, `.${pathname}`);
  if (!filePath.startsWith(`${ROOT}${path.sep}`)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const body = await readFile(filePath);
    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] ||
      "application/octet-stream";
    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const host = incoming.headers.host || "localhost";
    const scheme = incoming.headers["x-forwarded-proto"] || "http";
    const url = new URL(incoming.url || "/", `${scheme}://${host}`);
    const match = url.pathname.match(/^\/(audio|ayah)\/([^/]+)\/?$/);

    let response;
    if (match && ["GET", "HEAD"].includes(incoming.method)) {
      const request = new Request(url, { method: incoming.method, headers: incoming.headers });
      response = await renderPreview(
        {
          request,
          params: { token: match[2] },
          env: { ASSETS: { fetch: assetRequest => assetResponse(new URL(assetRequest.url)) } }
        },
        match[1]
      );
    } else if (["GET", "HEAD"].includes(incoming.method)) {
      response = await assetResponse(url);
    } else {
      response = new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" }
      });
    }

    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (incoming.method === "HEAD") {
      outgoing.end();
    } else {
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    }
  } catch (error) {
    console.error(error);
    outgoing.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    outgoing.end("Internal server error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Learn Qur'an deep links listening on port ${PORT}`);
});
