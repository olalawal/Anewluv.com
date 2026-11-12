#!/usr/bin/env node
// LOCAL TEST TOOLING ONLY (olalawal/AnewluvExpo#520). Never deployed.
//
// Starts the normal local preview server with the waitlist wired to the local
// mock Xano (scripts/mock-xano-waitlist.mjs) and Cloudflare's PUBLIC documented
// Turnstile test secret. Cloudflare's testing secret always passes but answers
// without an `action` and with hostname example.com, so this wrapper (not the
// production function) fills those two fields on the siteverify response, and
// only for requests that used the public test secret.
//
//   VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build
//   node scripts/mock-xano-waitlist.mjs &
//   node scripts/local-waitlist-preview.mjs      (PORT, default 8791)

const TEST_SECRET = "1x0000000000000000000000000000000AA";
const MOCK_PORT = process.env.MOCK_PORT || "8789";

process.env.HOST ||= "127.0.0.1";
process.env.PORT ||= "8791";
process.env.TURNSTILE_SECRET_KEY = TEST_SECRET;
process.env.TURNSTILE_ALLOWED_HOSTNAMES = "localhost";
process.env.ANEWLUV_XANO_CONTACT_API_BASE_URL = `http://127.0.0.1:${MOCK_PORT}/api`;
process.env.WAITLIST_GATEWAY_KEY = "local-test-waitlist-key";
process.env.LOCAL_TEST_CLIENT_IP_HEADER = "1";

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const response = await realFetch(url, init);
  const usedTestSecret =
    String(url).includes("challenges.cloudflare.com/turnstile/v0/siteverify") &&
    init?.body instanceof FormData &&
    init.body.get("secret") === TEST_SECRET;
  if (!usedTestSecret) return response;
  const result = await response.json();
  return Response.json({ ...result, action: "waitlist_form", hostname: "localhost" });
};

await import("./local-preview-server.mjs");
