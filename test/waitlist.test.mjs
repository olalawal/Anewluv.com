import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, test } from "node:test";

import handler, {
  config,
  resetWaitlistSecurityStateForTests,
  waitlistGatewaySignature,
  waitlistSubmissionKey,
} from "../netlify/functions/waitlist.js";
import cities from "../src/data/waitlist-cities.json" with { type: "json" };
import { WAITLIST_CITIES, findWaitlistCity, sanitizeSourceTag } from "../src/waitlist-shared.js";

const ORIGINAL_FETCH = globalThis.fetch;
const ENV_NAMES = [
  "ANEWLUV_XANO_CONTACT_API_BASE_URL",
  "TURNSTILE_ALLOWED_HOSTNAMES",
  "TURNSTILE_SECRET_KEY",
  "WAITLIST_GATEWAY_KEY",
];
const FAKE_KEY = "test-waitlist-gateway-secret";
const validPayload = {
  adult_confirmed: true,
  age_band: "21-29",
  city_slug: "missoula-mt",
  consent: true,
  email: "  Person@Example.com ",
  gender: "woman",
  seeking: "everyone",
  source_tag: "missoula-mt",
  turnstile_token: "valid-token",
  website: "",
};

function setEnv() {
  process.env.ANEWLUV_XANO_CONTACT_API_BASE_URL = "https://xano.example.test/api:contact/";
  process.env.TURNSTILE_ALLOWED_HOSTNAMES = "anewluv.com";
  process.env.TURNSTILE_SECRET_KEY = "test-turnstile-secret";
  process.env.WAITLIST_GATEWAY_KEY = FAKE_KEY;
}

function request(payload, method = "POST") {
  return new Request("https://anewluv.com/api/waitlist", {
    body: method === "POST" ? JSON.stringify(payload) : undefined,
    headers: { "Content-Type": "application/json" },
    method,
  });
}

const context = (ip = "203.0.113.10") => ({ ip, requestId: "req-waitlist-0001" });

function installFetchMock({ turnstileSuccess = true, xanoStatus = 200 } = {}) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    calls.push({ href, options });
    if (href.includes("challenges.cloudflare.com/turnstile")) {
      return Response.json({
        action: "waitlist_form",
        hostname: "anewluv.com",
        success: turnstileSuccess,
      });
    }
    return Response.json({ status: "received" }, { status: xanoStatus });
  };
  return calls;
}

beforeEach(() => {
  resetWaitlistSecurityStateForTests();
  for (const name of ENV_NAMES) delete process.env[name];
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  for (const name of ENV_NAMES) delete process.env[name];
});

test("city data loads from JSON and slugs are unique", () => {
  assert.ok(Array.isArray(cities) && cities.length >= 2);
  assert.deepEqual(WAITLIST_CITIES, cities);
  const slugs = cities.map((city) => city.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const city of cities) {
    assert.match(city.slug, /^[a-z0-9-]+$/);
    assert.ok(city.label.length > 0);
  }
  assert.ok(slugs.includes("other"));
  assert.equal(findWaitlistCity("austin-tx")?.label, "Austin, TX");
  assert.equal(findWaitlistCity("nowhere"), null);
});

test("source_tag is sanitised to [a-z0-9-], max 40 characters", () => {
  assert.equal(sanitizeSourceTag("Missoula-MT"), "missoula-mt");
  assert.equal(sanitizeSourceTag("a b_c.d/e?f=g&h<script>"), "abcdefghscript");
  assert.equal(sanitizeSourceTag("x".repeat(100)), "x".repeat(40));
  assert.equal(sanitizeSourceTag(undefined), "");
  assert.equal(sanitizeSourceTag(null), "");
  assert.equal(sanitizeSourceTag(12345), "12345");
  assert.equal(sanitizeSourceTag("---"), "---");
});

test("submission key and gateway signature match the documented formula", () => {
  const fields = {
    age_band: "21-29",
    city_slug: "missoula-mt",
    email: "person@example.com",
    gender: "woman",
    seeking: "everyone",
    source_tag: "missoula-mt",
  };
  const expectedSubmission = createHmac("sha256", FAKE_KEY)
    .update(
      `waitlist-submission:v1:${JSON.stringify([
        "person@example.com",
        "missoula-mt",
        "21-29",
        "woman",
        "everyone",
        "missoula-mt",
      ])}`,
    )
    .digest("hex");
  const submissionKey = waitlistSubmissionKey(FAKE_KEY, fields);
  assert.equal(submissionKey, expectedSubmission);
  assert.match(submissionKey, /^[0-9a-f]{64}$/);

  const clientKey = "c".repeat(64);
  const correlationId = "11111111-2222-4333-8444-555555555555";
  const expectedSignature = createHmac("sha256", FAKE_KEY)
    .update(`waitlist-gateway:v1:1700000000:${correlationId}:${submissionKey}:${clientKey}`)
    .digest("hex");
  assert.equal(
    waitlistGatewaySignature(FAKE_KEY, {
      clientKey,
      correlationId,
      submissionKey,
      timestamp: 1700000000,
    }),
    expectedSignature,
  );
});

test("a valid sign-up reaches Xano with the exact contract and returns only {ok:true}", async () => {
  setEnv();
  const calls = installFetchMock();
  const response = await handler(request(validPayload), context());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });

  const forwarded = calls.find((call) => call.href.endsWith("/waitlist/join_public"));
  assert.ok(forwarded, "Xano join endpoint called");
  assert.equal(forwarded.href, "https://xano.example.test/api:contact/waitlist/join_public");
  const body = JSON.parse(forwarded.options.body);
  assert.deepEqual(Object.keys(body).sort(), [
    "adult_confirmed",
    "age_band",
    "city_slug",
    "client_key",
    "consent",
    "correlation_id",
    "email",
    "gateway_signature",
    "gateway_timestamp",
    "gender",
    "seeking",
    "source_tag",
    "submission_key",
  ]);
  assert.equal(body.email, "person@example.com");
  assert.equal(body.adult_confirmed, true);
  assert.equal(body.consent, true);
  assert.ok(Number.isInteger(body.gateway_timestamp));
  assert.equal(
    body.client_key,
    createHmac("sha256", FAKE_KEY).update("waitlist-client:v1:203.0.113.10").digest("hex"),
  );
  assert.equal(body.submission_key, waitlistSubmissionKey(FAKE_KEY, body));
  assert.equal(
    body.gateway_signature,
    waitlistGatewaySignature(FAKE_KEY, {
      clientKey: body.client_key,
      correlationId: body.correlation_id,
      submissionKey: body.submission_key,
      timestamp: body.gateway_timestamp,
    }),
  );
  assert.ok(!JSON.stringify(body).includes("203.0.113.10"), "no raw IP is forwarded");
});

test("fields outside the allowed set are rejected before any upstream call", async () => {
  setEnv();
  const calls = installFetchMock();
  for (const extra of [{ user_id: 1 }, { client_key: "x" }, { gateway_signature: "x" }]) {
    const response = await handler(request({ ...validPayload, ...extra }), context());
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { code: "invalid_request" });
  }
  assert.equal(calls.length, 0);
});

test("invalid city, age band, gender, seeking, email and missing confirmations are rejected", async () => {
  setEnv();
  const calls = installFetchMock();
  const cases = [
    [{ city_slug: "atlantis" }, 400],
    [{ age_band: "17-20" }, 400],
    [{ gender: "robot" }, 400],
    [{ seeking: "nobody" }, 400],
    [{ email: "not-an-email" }, 400],
    [{ adult_confirmed: false }, 400],
    [{ consent: "yes" }, 400],
  ];
  for (const [patch, status] of cases) {
    const response = await handler(request({ ...validPayload, ...patch }), context());
    assert.equal(response.status, status, JSON.stringify(patch));
  }
  assert.equal(calls.length, 0);
});

test("oversized bodies and wrong methods are refused", async () => {
  setEnv();
  installFetchMock();
  const big = await handler(request({ ...validPayload, source_tag: "a".repeat(9000) }), context());
  assert.equal(big.status, 413);
  const get = await handler(request(null, "GET"), context());
  assert.equal(get.status, 405);
});

test("fails closed with 503 when its settings are missing", async () => {
  const calls = installFetchMock();
  const none = await handler(request(validPayload), context());
  assert.equal(none.status, 503);
  assert.deepEqual(await none.json(), { code: "endpoint_unavailable" });

  for (const missing of ENV_NAMES) {
    resetWaitlistSecurityStateForTests();
    setEnv();
    delete process.env[missing];
    const response = await handler(request(validPayload), context());
    assert.equal(response.status, 503, `missing ${missing}`);
  }
  assert.equal(calls.length, 0);
});

test("a failed Turnstile check is rejected and nothing reaches Xano", async () => {
  setEnv();
  const calls = installFetchMock({ turnstileSuccess: false });
  const response = await handler(request(validPayload), context());
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { code: "anti_bot_invalid" });
  assert.ok(!calls.some((call) => call.href.endsWith("/waitlist/join_public")));
});

test("a missing Turnstile token is rejected without calling Turnstile or Xano", async () => {
  setEnv();
  const calls = installFetchMock();
  const response = await handler(request({ ...validPayload, turnstile_token: "" }), context());
  assert.equal(response.status, 403);
  assert.equal(calls.length, 0);
});

test("the honeypot answers like a success and sends nothing", async () => {
  setEnv();
  const calls = installFetchMock();
  const response = await handler(request({ ...validPayload, website: "http://spam.test" }), context());
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(calls.length, 0);
});

test("the local rate limit stops the fourth attempt from one client", async () => {
  setEnv();
  installFetchMock();
  const statuses = [];
  for (let index = 0; index < 4; index += 1) {
    const response = await handler(
      request({ ...validPayload, email: `wl-test-${index}@mail.invalid` }),
      context(),
    );
    statuses.push(response.status);
  }
  assert.deepEqual(statuses, [200, 200, 200, 429]);
});

test("Xano answers map to plain codes and never echo data", async () => {
  setEnv();
  const expected = [
    [409, 200, { ok: true }],
    [429, 429, { code: "rate_limited" }],
    [401, 502, { code: "submit_failed" }],
    [400, 400, { code: "invalid_request" }],
  ];
  for (const [xanoStatus, status, body] of expected) {
    resetWaitlistSecurityStateForTests();
    installFetchMock({ xanoStatus });
    const response = await handler(request(validPayload), context());
    assert.equal(response.status, status, `xano ${xanoStatus}`);
    assert.deepEqual(await response.json(), body, `xano ${xanoStatus}`);
  }
});

test("the route config matches the Worker path", () => {
  assert.equal(config.path, "/api/waitlist");
});
