import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import handler, {
  config,
  resetContactSecurityStateForTests,
} from "../netlify/functions/contact.js";

const ORIGINAL_FETCH = globalThis.fetch;
const validPayload = {
  email: "Person@Example.com",
  kind: "contact",
  message: "I need help with my account.",
  name: "Test Person",
  turnstile_token: "valid-token",
  username: "",
  website: "",
};

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

test("rejects an oversized body", async () => {
  const calls = installFetchMock();
  const response = await handler(
    request({ ...validPayload, message: "x".repeat(9000) }),
    context(),
  );
  assert.equal(response.status, 413);
  assert.equal((await response.json()).code, "payload_too_large");
  assert.equal(calls.length, 0);
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
  assert.equal(body.source, "anewluv_marketing_site_netlify");
  assert.equal(body.correlation_id, "req-contact-valid-1");
  assert.equal(body.recipient_confirmation_allowed, false);
  assert.match(body.client_key, /^[a-f0-9]{64}$/);
  assert.match(body.gateway_signature, /^[a-f0-9]{64}$/);
  assert.equal(typeof body.gateway_timestamp, "number");
  assert.ok(!("gateway_key" in body));
  assert.ok(!JSON.stringify(body).includes("test-gateway-secret"));
  assert.ok(!JSON.stringify(body).includes("203.0.113.25"));
  assert.ok(!("user_id" in body));
  assert.ok(!("email_verified" in body));
  assert.ok(!("moderation_state" in body));
  assert.ok(!("user_agent" in body));
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
