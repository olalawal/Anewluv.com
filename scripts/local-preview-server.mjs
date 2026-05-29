#!/usr/bin/env node

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import appPreviewHandler from "../netlify/functions/app-preview.js";
import contactHandler from "../netlify/functions/contact.js";
import homepageProfilesHandler from "../netlify/functions/homepage-profiles.js";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8082);
const ROOT = resolve(process.cwd());
const DIST = join(ROOT, "dist");

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = rest.join("=").replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(join(ROOT, ".env"));
loadEnvFile(join(ROOT, ".env.local"));

function toRequest(req, body) {
  return new Request(`http://localhost:${PORT}${req.url}`, {
    body: body.length ? body : undefined,
    headers: req.headers,
    method: req.method,
  });
}

async function sendWebResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function serveFile(res, pathname) {
  const normalized = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(DIST, `.${normalized}`);
  const fallback = join(DIST, "index.html");

  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(content);
  } catch {
    const content = await readFile(fallback);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(content);
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);
    if (url.pathname === "/api/contact") {
      const body = await readBody(req);
      return sendWebResponse(res, await contactHandler(toRequest(req, body)));
    }
    if (url.pathname === "/api/app-preview") {
      const body = await readBody(req);
      return sendWebResponse(res, await appPreviewHandler(toRequest(req, body)));
    }
    if (url.pathname === "/api/homepage-profiles") {
      const body = await readBody(req);
      return sendWebResponse(res, await homepageProfilesHandler(toRequest(req, body)));
    }
    return serveFile(res, url.pathname);
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal server error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Anewluv.com local preview: http://127.0.0.1:${PORT}/`);
});
