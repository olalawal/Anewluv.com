import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { beforeEach, test } from "node:test";

import handler, {
  config,
  resetContactSecurityStateForTests,
} from "../netlify/functions/contact.js";

const ORIGINAL_FETCH = globalThis.fetch;
const encodeThreeTimes = (value) =>
  encodeURIComponent(encodeURIComponent(encodeURIComponent(value)));
const validPayload = {
  email: "Person@Example.com",
  kind: "contact",
  message: "I need help with my account.",
  name: "Test Person",
  turnstile_token: "valid-token",
  username: "",
  website: "",
};

function gatewaySignature(body, clientKey = body.client_key) {
  return createHmac("sha256", "test-gateway-secret")
    .update(
      `contact-gateway:v1:${body.gateway_timestamp}:${body.correlation_id}:${body.submission_key}:${clientKey}`,
    )
    .digest("hex");
}

function context(ip = "203.0.113.10", requestId = "req-contact-0001") {
  return {
    geo: { country: { code: "US" } },
    ip,
    requestId,
  };
}

function request(payload, headers = {}) {
  return new Request("https://anewluv.com/api/contact", {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json", ...headers },
    method: "POST",
  });
}

function installFetchMock({ turnstileSuccess = true, xanoStatus = 200 } = {}) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    calls.push({ href, options });
    if (href.includes("challenges.cloudflare.com/turnstile")) {
      return Response.json({
        action: "contact_form",
        hostname: "anewluv.com",
        success: turnstileSuccess,
      });
    }
    return Response.json(
      xanoStatus >= 200 && xanoStatus < 300 ? { ok: true, ticket_id: 1 } : { code: "error" },
      { status: xanoStatus },
    );
  };
  return calls;
}

beforeEach(() => {
  resetContactSecurityStateForTests();
  globalThis.fetch = ORIGINAL_FETCH;
  process.env.ANEWLUV_XANO_CONTACT_API_BASE_URL = "https://xano.example/api:contact";
  process.env.CONTACT_GATEWAY_KEY = "test-gateway-secret";
  process.env.TURNSTILE_ALLOWED_HOSTNAMES = "anewluv.com,deploy-preview.example.netlify.app";
  process.env.TURNSTILE_SECRET_KEY = "test-turnstile-secret";
});

test("rejects malformed email and forged trusted fields without side effects", async () => {
  const calls = installFetchMock();
  const malformed = await handler(
    request({ ...validPayload, email: "victim@example" }),
    context(),
  );
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).code, "invalid_email");

  const forged = await handler(
    request({ ...validPayload, email_verified: true, user_id: 123 }),
    context(),
  );
  assert.equal(forged.status, 400);
  assert.equal((await forged.json()).code, "invalid_request");
  assert.equal(calls.length, 0);
});

test("rejects missing or invalid anti-bot proof before Xano", async () => {
  const calls = installFetchMock({ turnstileSuccess: false });
  const missing = await handler(
    request({ ...validPayload, turnstile_token: "" }),
    context(),
  );
  assert.equal(missing.status, 403);
  assert.equal((await missing.json()).code, "anti_bot_invalid");

  resetContactSecurityStateForTests();
  const invalid = await handler(request(validPayload), context());
  assert.equal(invalid.status, 403);
  assert.equal((await invalid.json()).code, "anti_bot_invalid");
  assert.equal(calls.filter((call) => call.href.includes("xano.example")).length, 0);
});

test("honeypot submissions create no ticket or email", async () => {
  const calls = installFetchMock();
  const response = await handler(
    request({ ...validPayload, turnstile_token: "", website: "https://spam.example" }),
    context(),
  );
  assert.equal(response.status, 202);
  assert.equal((await response.json()).ok, true);
  assert.equal(calls.length, 0);
});

test("rejects the observed mixed-case filler attack before Turnstile or Xano", async () => {
  const calls = installFetchMock();
  const contact = await handler(
    request({
      ...validPayload,
      message: "aBcDeFgHiJkLmNoPqRsT",
      name: "ZaQwSxEdCrFvTgByHnUj",
    }),
    context(),
  );
  assert.equal(contact.status, 400);
  assert.equal((await contact.json()).code, "invalid_message");

  resetContactSecurityStateForTests();
  const unsubscribe = await handler(
    request({
      ...validPayload,
      kind: "unsubscribe",
      message: "qWeRtYuIoPaSdFgHjKlZ",
      name: "MnBvCxZaSdFgHjKlQwEr",
      username: "PoIuYtReWqAsDfGhJkLz",
    }),
    context(),
  );
  assert.equal(unsubscribe.status, 400);
  assert.equal((await unsubscribe.json()).code, "invalid_message");
  assert.equal(calls.length, 0);
});

test("rejects small mutations of the observed filler signature", async () => {
  const calls = installFetchMock();
  const mutations = [
    ["ZaQwSxEdCrFvTgB", "aBcDeFgHiJkLmNo"],
    ["ZaQwSxEdCrFvTgByHnUjKlmNo", "aBcDeFgHiJkLmNoPqRsTuVwXy"],
    ["ZaQwSxEdCrFvTgByHnUj1", "aBcDeFgHiJkLmNoPqRsT1"],
    ["ZaQwSxEd-CrFvTgByHnUj", "aBcDeFg-HiJkLmNoPqRsT"],
  ];

  for (const [index, [name, message]] of mutations.entries()) {
    resetContactSecurityStateForTests();
    const response = await handler(
      request({ ...validPayload, name, message, turnstile_token: `mutation-${index}` }),
      context(`203.0.113.${index + 40}`),
    );
    assert.equal(response.status, 400, `${name} / ${message}`);
    assert.equal((await response.json()).code, "invalid_message");
  }
  assert.equal(calls.length, 0);
});

test("rejects dangerous or excessive URLs before Turnstile or Xano", async () => {
  const calls = installFetchMock();
  const attacks = [
    "javascript:alert(document.cookie)",
    "%3Cscript%3Ealert(1)%3C%2Fscript%3E",
    "%3Cscript%3Ealert(1)%3C%2Fscript%3E stray%",
    "${process.env.SECRET} please help",
    "https://one.invalid https://two.invalid https://three.invalid",
    "https%3A%2F%2Fone.invalid https%3A%2F%2Ftwo.invalid https%3A%2F%2Fthree.invalid",
    "https://one.invalid,https://two.invalid,https://three.invalid",
    encodeThreeTimes("<script>alert(1)</script>"),
    ["https://one.invalid", "https://two.invalid", "https://three.invalid"]
      .map(encodeThreeTimes)
      .join(" "),
    "Unable to upload the screenshot %FF after signup.",
    "person@example.com' OR 1=1 -- account help",
  ];

  for (const [index, message] of attacks.entries()) {
    resetContactSecurityStateForTests();
    const response = await handler(
      request({ ...validPayload, message, turnstile_token: `attack-${index}` }),
      context(`203.0.113.${index + 20}`),
    );
    assert.equal(response.status, 400, message);
    assert.equal((await response.json()).code, "invalid_message");
  }
  assert.equal(calls.length, 0);
});

test("rejects dangerous content in name and unsubscribe username", async () => {
  const calls = installFetchMock();
  const unsafeName = await handler(
    request({ ...validPayload, name: "<script>alert(1)</script>" }),
    context(),
  );
  assert.equal(unsafeName.status, 400);
  assert.equal((await unsafeName.json()).code, "invalid_request");

  resetContactSecurityStateForTests();
  const unsafeUsername = await handler(
    request({
      ...validPayload,
      kind: "unsubscribe",
      username: "${process.env.SECRET}",
    }),
    context(),
  );
  assert.equal(unsafeUsername.status, 400);
  assert.equal((await unsafeUsername.json()).code, "invalid_request");
  assert.equal(calls.length, 0);
});

test("allows a human support message containing one ordinary https URL", async () => {
  const calls = installFetchMock();
  const response = await handler(
    request({
      ...validPayload,
      message: "My profile shows an error at https://anewluv.com/help when I sign in.",
    }),
    context(),
  );
  assert.equal(response.status, 200);
  assert.equal(calls.filter((call) => call.href.includes("xano.example")).length, 1);
});

test("allows ordinary file and onboarding support language", async () => {
  const calls = installFetchMock();
  const messages = [
    "File: the app screenshot will not upload from My Photos.",
    "Onboarding = stuck after I choose my city and press Continue.",
  ];

  for (const [index, message] of messages.entries()) {
    resetContactSecurityStateForTests();
    const response = await handler(
      request({ ...validPayload, message, turnstile_token: `normal-${index}` }),
      context(`203.0.113.${index + 60}`),
    );
    assert.equal(response.status, 200, message);
  }
  assert.equal(calls.filter((call) => call.href.includes("xano.example")).length, 2);
});

test("allows plausible multi-word human names and messages", async () => {
  const calls = installFetchMock();
  const response = await handler(
    request({
      ...validPayload,
      name: "Mary Jo Ann Bell McKay",
      message: "Please Help My Bad Login",
    }),
    context(),
  );
  assert.equal(response.status, 200);
  assert.equal(calls.filter((call) => call.href.includes("xano.example")).length, 1);
});

test("rejects an oversized body", async () => {
  const calls = installFetchMock();
  const response = await handler(
    request({ ...validPayload, message: "x".repeat(40_000) }),
    context(),
  );
  assert.equal(response.status, 413);
  assert.equal((await response.json()).code, "payload_too_large");
  assert.equal(calls.length, 0);
});

test("accepts a maximum multibyte unsubscribe form above the former 8 KB cap", async () => {
  const calls = installFetchMock();
  const payload = {
    ...validPayload,
    kind: "unsubscribe",
    message: "界".repeat(1908),
    name: "界".repeat(100),
    turnstile_token: "t".repeat(2048),
    username: "界".repeat(80),
  };
  const encodedBytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  assert.ok(encodedBytes > 8192);
  assert.ok(encodedBytes <= 32 * 1024);

  const response = await handler(request(payload), context());

  assert.equal(response.status, 200);
  const xanoCall = calls.find((call) => call.href.includes("xano.example"));
  assert.ok(xanoCall);
  assert.equal(JSON.parse(xanoCall.options.body).description.length, 2000);
});

test("suppresses a duplicate contact pair", async () => {
  const calls = installFetchMock();
  const first = await handler(request(validPayload), context());
  assert.equal(first.status, 200);

  const duplicate = await handler(
    request({ ...validPayload, turnstile_token: "second-valid-token" }),
    context(),
  );
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).code, "duplicate");
  assert.equal(calls.filter((call) => call.href.includes("xano.example")).length, 1);
});

test("blocks a same-client burst after three accepted attempts", async () => {
  const calls = installFetchMock();
  for (let index = 0; index < 3; index += 1) {
    const response = await handler(
      request({
        ...validPayload,
        email: `person${index}@example.com`,
        message: `Unique account help message ${index}.`,
        turnstile_token: `valid-token-${index}`,
      }),
      context(),
    );
    assert.equal(response.status, 200);
  }

  const blocked = await handler(
    request({
      ...validPayload,
      email: "person4@example.com",
      message: "A fourth unique account help message.",
      turnstile_token: "valid-token-4",
    }),
    context(),
  );
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).code, "rate_limited");
  assert.equal(calls.filter((call) => call.href.includes("xano.example")).length, 3);
});

test("valid submission forwards only server-controlled metadata to the safe endpoint", async () => {
  const calls = installFetchMock();
  const response = await handler(
    request({ ...validPayload, kind: "unsubscribe", username: "member-name" }),
    context("203.0.113.25", "req-contact-valid-1"),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-correlation-id"), "req-contact-valid-1");
  const xanoCall = calls.find((call) => call.href.includes("xano.example"));
  assert.ok(xanoCall);
  assert.ok(xanoCall.href.endsWith("/feedback/contact_us_public"));

  const body = JSON.parse(xanoCall.options.body);
  assert.equal(body.email, "person@example.com");
  assert.equal(body.subject, "Unsubscribe request");
  assert.equal(body.category, "account_help");
  assert.equal(body.route, "/unsubscribe");
  assert.equal(body.source, "public_website");
  assert.equal(body.app_version, "anewluv-public-site");
  assert.equal(body.correlation_id, "req-contact-valid-1");
  assert.equal(body.recipient_confirmation_allowed, false);
  assert.match(body.client_key, /^[a-f0-9]{64}$/);
  assert.match(body.gateway_signature, /^[a-f0-9]{64}$/);
  assert.equal(body.gateway_signature, gatewaySignature(body));
  assert.notEqual(body.gateway_signature, gatewaySignature(body, "0".repeat(64)));
  assert.equal(typeof body.gateway_timestamp, "number");
  assert.ok(!("gateway_key" in body));
  assert.ok(!JSON.stringify(body).includes("test-gateway-secret"));
  assert.ok(!JSON.stringify(body).includes("203.0.113.25"));
  assert.ok(!("user_id" in body));
  assert.ok(!("email_verified" in body));
  assert.ok(!("moderation_state" in body));
  assert.ok(!("user_agent" in body));
});

test("uses a dedicated UUID for Turnstile idempotency", async () => {
  const calls = installFetchMock();
  const requestId = "req-contact-not-a-uuid";
  const response = await handler(request(validPayload), context("203.0.113.25", requestId));

  assert.equal(response.status, 200);
  const turnstileCall = calls.find((call) => call.href.includes("challenges.cloudflare.com"));
  assert.ok(turnstileCall);
  const idempotencyKey = turnstileCall.options.body.get("idempotency_key");
  assert.match(
    idempotencyKey,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  assert.notEqual(idempotencyKey, requestId);
});

test("rejects unsubscribe descriptions that exceed the Xano limit", async () => {
  const calls = installFetchMock();
  const response = await handler(
    request({
      ...validPayload,
      kind: "unsubscribe",
      message: "x".repeat(2000),
      username: "member-name",
    }),
    context(),
  );

  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "invalid_message");
  assert.equal(calls.length, 0);
});

test("accepts an unsubscribe description exactly at the Xano limit", async () => {
  const calls = installFetchMock();
  const username = "member-name";
  const suffix = `\n\nUsername: ${username}`;
  const response = await handler(
    request({
      ...validPayload,
      kind: "unsubscribe",
      message: "x".repeat(2000 - suffix.length),
      username,
    }),
    context(),
  );

  assert.equal(response.status, 200);
  const xanoCall = calls.find((call) => call.href.includes("xano.example"));
  assert.ok(xanoCall);
  assert.equal(JSON.parse(xanoCall.options.body).description.length, 2000);
});

test("fails closed when security secrets are not configured", async () => {
  const calls = installFetchMock();
  delete process.env.CONTACT_GATEWAY_KEY;
  delete process.env.TURNSTILE_SECRET_KEY;
  const response = await handler(request(validPayload), context());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "endpoint_unavailable");
  assert.equal(calls.length, 0);
});

test("exports Netlify native IP rate limiting", () => {
  assert.deepEqual(config.rateLimit, {
    action: "rate_limit",
    aggregateBy: ["ip"],
    windowLimit: 3,
    windowSize: 180,
  });
});
