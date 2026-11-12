import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, test } from "node:test";

import { resetContactSecurityStateForTests } from "../netlify/functions/contact.js";
import { resetWaitlistSecurityStateForTests } from "../netlify/functions/waitlist.js";
import worker, { requestWithTrustedGeo } from "../worker/index.js";

const ORIGINAL_FETCH = globalThis.fetch;
const ENV_NAMES = [
  "ANEWLUV_XANO_CONTACT_API_BASE_URL",
  "CONTACT_GATEWAY_KEY",
  "TURNSTILE_ALLOWED_HOSTNAMES",
  "TURNSTILE_SECRET_KEY",
  "WAITLIST_GATEWAY_KEY",
];
const contactEnv = {
  ANEWLUV_XANO_CONTACT_API_BASE_URL: "https://xano.example.test/api:contact",
  CONTACT_GATEWAY_KEY: "test-gateway-secret",
  TURNSTILE_ALLOWED_HOSTNAMES: "anewluv.com",
  TURNSTILE_SECRET_KEY: "test-turnstile-secret",
};
const validPayload = {
  email: "person@example.com",
  kind: "contact",
  message: "I need help with my account.",
  name: "Test Person",
  topic: "general_information",
  turnstile_token: "valid-token",
  username: "",
  website: "",
};

function contactRequest({ cf, headers = {}, method = "POST", payload = validPayload } = {}) {
  const request = new Request("https://anewluv.com/api/contact", {
    body: method === "POST" ? JSON.stringify(payload) : undefined,
    headers: {
      "cf-connecting-ip": "203.0.113.10",
      "cf-ray": "8f1c2d3e4a5b6c7d-ORD",
      "content-type": "application/json",
      ...headers,
    },
    method,
  });
  if (cf) request.cf = cf;
  return request;
}

function mockUpstreams() {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const target = String(url);
    calls.push({ init, target });
    if (target.includes("turnstile")) {
      return Response.json({ action: "contact_form", hostname: "anewluv.com", success: true });
    }
    return Response.json({ ok: true });
  };
  return calls;
}

beforeEach(() => {
  resetContactSecurityStateForTests();
  resetWaitlistSecurityStateForTests();
  for (const name of ENV_NAMES) delete process.env[name];
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  for (const name of ENV_NAMES) delete process.env[name];
});

test("unknown API paths return a JSON 404 instead of the page shell", async () => {
  const response = await worker.fetch(new Request("https://anewluv.com/api/nope"), {});
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { code: "not_found" });
});

test("contact fails closed when the Worker has no secrets", async () => {
  const calls = mockUpstreams();
  const response = await worker.fetch(contactRequest(), {});
  assert.equal(response.status, 503);
  assert.equal(calls.length, 0);
});

test("contact reads its settings from Worker bindings and signs the Cloudflare client", async () => {
  const calls = mockUpstreams();
  const response = await worker.fetch(contactRequest({ cf: { country: "US" } }), contactEnv);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-correlation-id"), "8f1c2d3e4a5b6c7d-ORD");

  const forwarded = calls.find((call) => call.target.includes("/feedback/contact_us_public"));
  assert.ok(forwarded, "the Xano public-contact endpoint was called");
  const body = JSON.parse(forwarded.init.body);
  const expectedClientKey = createHmac("sha256", "test-gateway-secret")
    .update("contact-client:v1:203.0.113.10")
    .digest("hex");
  assert.equal(body.client_key, expectedClientKey);
  assert.equal(body.network_country, "US");
  assert.equal(body.correlation_id, "8f1c2d3e4a5b6c7d-ORD");
});

test("the edge rate limiter stops a contact POST before any upstream call", async () => {
  const calls = mockUpstreams();
  const keys = [];
  const env = {
    ...contactEnv,
    CONTACT_RATE_LIMITER: {
      async limit({ key }) {
        keys.push(key);
        return { success: false };
      },
    },
  };
  const response = await worker.fetch(contactRequest(), env);
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { code: "rate_limited" });
  assert.deepEqual(keys, ["203.0.113.10"]);
  assert.equal(calls.length, 0);
});

test("the edge rate limiter is not charged for non-POST requests", async () => {
  let charged = 0;
  const env = {
    CONTACT_RATE_LIMITER: {
      async limit() {
        charged += 1;
        return { success: false };
      },
    },
  };
  const response = await worker.fetch(contactRequest({ method: "GET" }), env);
  assert.equal(response.status, 405);
  assert.equal(charged, 0);
});

test("preview location comes from Cloudflare, never from caller headers", () => {
  const request = new Request("https://anewluv.com/api/app-preview", {
    headers: {
      "cf-ipcity": "Forged City",
      "x-nf-geo-city": "Forged City",
      "x-vercel-ip-country": "ZZ",
    },
  });
  request.cf = { city: "Chicago", country: "US", region: "Illinois", timezone: "America/Chicago" };

  const trusted = requestWithTrustedGeo(request);
  assert.equal(trusted.headers.get("cf-ipcity"), "Chicago");
  assert.equal(trusted.headers.get("cf-region"), "Illinois");
  assert.equal(trusted.headers.get("cf-ipcountry"), "US");
  assert.equal(trusted.headers.get("x-nf-geo-city"), null);
  assert.equal(trusted.headers.get("x-vercel-ip-country"), null);
});

test("preview routes answer through the Worker", async () => {
  for (const path of ["/api/app-preview", "/api/homepage-profiles"]) {
    const response = await worker.fetch(new Request(`https://anewluv.com${path}`), {});
    assert.equal(response.status, 200, path);
    const body = await response.json();
    assert.ok(Array.isArray(body.profiles), path);
  }
});

const waitlistPayload = {
  adult_confirmed: true,
  age_band: "21-29",
  city_slug: "denver-co",
  consent: true,
  email: "wl-test@mail.invalid",
  gender: "man",
  seeking: "women",
  source_tag: "denver-co",
  turnstile_token: "valid-token",
  website: "",
};

function waitlistRequest({ method = "POST" } = {}) {
  return new Request("https://anewluv.com/api/waitlist", {
    body: method === "POST" ? JSON.stringify(waitlistPayload) : undefined,
    headers: {
      "cf-connecting-ip": "203.0.113.20",
      "cf-ray": "8f1c2d3e4a5b6c7d-ORD",
      "content-type": "application/json",
    },
    method,
  });
}

test("the Worker routes /api/waitlist and fails closed without secrets", async () => {
  const calls = mockUpstreams();
  const response = await worker.fetch(waitlistRequest(), {});
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { code: "endpoint_unavailable" });
  assert.equal(calls.length, 0);
});

test("the Worker signs the Cloudflare client for the waitlist", async () => {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ init, target: String(url) });
    if (String(url).includes("turnstile")) {
      return Response.json({ action: "waitlist_form", hostname: "anewluv.com", success: true });
    }
    return Response.json({ status: "received" });
  };
  const env = { ...contactEnv, WAITLIST_GATEWAY_KEY: "test-waitlist-key" };
  const response = await worker.fetch(waitlistRequest(), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  const forwarded = calls.find((call) => call.target.endsWith("/waitlist/join_public"));
  assert.ok(forwarded, "the Xano waitlist endpoint was called");
  const body = JSON.parse(forwarded.init.body);
  const expectedClientKey = createHmac("sha256", "test-waitlist-key")
    .update("waitlist-client:v1:203.0.113.20")
    .digest("hex");
  assert.equal(body.client_key, expectedClientKey);
  assert.equal(body.correlation_id, "8f1c2d3e4a5b6c7d-ORD");
});

test("the waitlist edge limiter stops a POST and is absent-safe for other methods", async () => {
  const calls = mockUpstreams();
  const keys = [];
  const env = {
    ...contactEnv,
    WAITLIST_GATEWAY_KEY: "test-waitlist-key",
    WAITLIST_RATE_LIMITER: {
      async limit({ key }) {
        keys.push(key);
        return { success: false };
      },
    },
  };
  const limited = await worker.fetch(waitlistRequest(), env);
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), { code: "rate_limited" });
  assert.deepEqual(keys, ["203.0.113.20"]);
  assert.equal(calls.length, 0);

  const get = await worker.fetch(waitlistRequest({ method: "GET" }), env);
  assert.equal(get.status, 405);
  assert.equal(keys.length, 1);
});
