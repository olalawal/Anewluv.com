// Cloudflare Worker entry for anewluv.com.
//
// Static files in dist/ are served by the Workers static-assets layer
// (see wrangler.jsonc). Only /api/* reaches this script. The handlers are the
// same modules Netlify ran, so the security behaviour of the contact form and
// the waitlist stays in reviewed places: netlify/functions/contact.js and
// netlify/functions/waitlist.js.

import appPreviewHandler from "../netlify/functions/app-preview.js";
import contactHandler from "../netlify/functions/contact.js";
import homepageProfilesHandler from "../netlify/functions/homepage-profiles.js";
import waitlistHandler from "../netlify/functions/waitlist.js";

// Location headers a client could forge. Cloudflare sets none of the x-nf-* or
// x-vercel-* names, so anything arriving under them came from the caller.
const UNTRUSTED_GEO_HEADERS = [
  "x-nf-geo-city",
  "x-nf-geo-subdivision",
  "x-nf-geo-country",
  "x-nf-geo-timezone",
  "x-vercel-ip-city",
  "x-vercel-ip-country-region",
  "x-vercel-ip-country",
  "x-vercel-ip-timezone",
  "cf-ipcity",
  "cf-region",
];

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

// The handlers read settings with process.env[name]. With nodejs_compat and a
// current compatibility date Cloudflare already fills process.env from the
// Worker's variables and secrets; copying the string bindings here keeps the
// handlers working if that default ever changes, and in plain Node tests.
function exposeBindings(env) {
  if (typeof process === "undefined" || !process.env || !env) return;
  for (const [name, value] of Object.entries(env)) {
    if (typeof value === "string" && process.env[name] !== value) {
      process.env[name] = value;
    }
  }
}

function clientIp(request) {
  return String(request.headers.get("cf-connecting-ip") || "").trim();
}

// Rebuilds the location headers homepage-profiles.js reads from Cloudflare's own
// request.cf data, so the preview does not depend on a zone setting and cannot
// be steered by caller-supplied headers.
export function requestWithTrustedGeo(request) {
  const headers = new Headers(request.headers);
  for (const name of UNTRUSTED_GEO_HEADERS) headers.delete(name);

  const cf = request.cf || {};
  if (cf.city) headers.set("cf-ipcity", String(cf.city));
  if (cf.region) headers.set("cf-region", String(cf.region));
  if (cf.country) headers.set("cf-ipcountry", String(cf.country));
  // The handler has no Cloudflare name for the timezone; this is the one it reads.
  if (cf.timezone) headers.set("x-nf-geo-timezone", String(cf.timezone));

  return new Request(request, { headers });
}

async function contactRateLimited(request, env) {
  const limiter = env?.CONTACT_RATE_LIMITER;
  if (request.method !== "POST" || typeof limiter?.limit !== "function") return false;
  const { success } = await limiter.limit({ key: clientIp(request) || "unknown-client" });
  return !success;
}

// Edge limiter for the waitlist POST; absent-safe like the contact one, so tests
// and local runs without the binding skip it and the handler's own limit applies.
async function waitlistRateLimited(request, env) {
  const limiter = env?.WAITLIST_RATE_LIMITER;
  if (request.method !== "POST" || typeof limiter?.limit !== "function") return false;
  const { success } = await limiter.limit({ key: clientIp(request) || "unknown-client" });
  return !success;
}

async function handleWaitlist(request, env) {
  if (await waitlistRateLimited(request, env)) {
    return jsonResponse({ code: "rate_limited" }, 429);
  }
  return waitlistHandler(request, {
    ip: clientIp(request),
    requestId: String(request.headers.get("cf-ray") || ""),
  });
}

async function handleContact(request, env) {
  if (await contactRateLimited(request, env)) {
    return jsonResponse({ code: "rate_limited" }, 429);
  }
  return contactHandler(request, {
    geo: { country: { code: String(request.cf?.country || "") } },
    ip: clientIp(request),
    requestId: String(request.headers.get("cf-ray") || ""),
  });
}

export default {
  async fetch(request, env) {
    exposeBindings(env);
    const { pathname } = new URL(request.url);

    if (pathname === "/api/contact") return handleContact(request, env);
    if (pathname === "/api/waitlist") return handleWaitlist(request, env);
    if (pathname === "/api/homepage-profiles") {
      return homepageProfilesHandler(requestWithTrustedGeo(request));
    }
    if (pathname === "/api/app-preview") {
      return appPreviewHandler(requestWithTrustedGeo(request));
    }
    return jsonResponse({ code: "not_found" }, 404);
  },
};
