import { createHmac, randomUUID } from "node:crypto";

import {
  WAITLIST_AGE_BANDS,
  WAITLIST_GENDERS,
  WAITLIST_SEEKING,
  channelSourceTag,
  emailLocalPartFits,
  findWaitlistCity,
} from "../../src/waitlist-shared.js";

// Safety model mirrors netlify/functions/contact.js: POST only, bounded body,
// allowed fields only, Turnstile redeemed here, local rate limit, HMAC client
// key (never a raw IP), and fail CLOSED when its settings are missing.
const REQUEST_TIMEOUT_MS = 12000;
const TURNSTILE_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 8 * 1024;
const MAX_EMAIL_LENGTH = 254;
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;
const LOCAL_RATE_WINDOW_MS = 180_000;
const LOCAL_RATE_LIMIT = 3;
const DUPLICATE_WINDOW_MS = 10 * 60_000;
const MAX_LOCAL_CLIENTS = 2000;
const TURNSTILE_ACTION = "waitlist_form";
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const WAITLIST_JOIN_PATH = "/waitlist/join_public";
const EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const ALLOWED_FIELDS = new Set([
  "adult_confirmed",
  "age_band",
  "city_slug",
  "consent",
  "email",
  "gender",
  "seeking",
  "source_tag",
  "turnstile_token",
  "website",
]);
const AGE_BANDS = new Set(WAITLIST_AGE_BANDS.map(([value]) => value));
const GENDERS = new Set(WAITLIST_GENDERS.map(([value]) => value));
const SEEKING = new Set(WAITLIST_SEEKING.map(([value]) => value));

const localAttempts = new Map();
const recentSubmissions = new Map();

function env(name) {
  return globalThis.Netlify?.env?.get(name) ?? process.env[name] ?? "";
}

function cleanUrl(value) {
  return String(value || "").replace(/\/$/, "");
}

function jsonResponse(body, status = 200, correlationId = "") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      ...(correlationId ? { "X-Correlation-Id": correlationId } : {}),
    },
  });
}

// Log lines never carry an email, a raw IP or a tag value.
function securityEvent(event, details = {}) {
  console.info(JSON.stringify({ event, service: "public_waitlist", ...details }));
}

function safeCorrelationId(context) {
  const requestId = String(context?.requestId || "").trim();
  return /^[a-z0-9_-]{8,100}$/i.test(requestId) ? requestId : randomUUID();
}

export function waitlistHmac(secret, namespace, value) {
  return createHmac("sha256", secret)
    .update(`${namespace}:v1:${value}`)
    .digest("hex");
}

export function waitlistSubmissionKey(gatewayKey, fields) {
  return waitlistHmac(
    gatewayKey,
    "waitlist-submission",
    JSON.stringify([
      fields.email,
      fields.city_slug,
      fields.age_band,
      fields.gender,
      fields.seeking,
      fields.source_tag,
    ]),
  );
}

export function waitlistGatewaySignature(
  gatewayKey,
  { clientKey, correlationId, submissionKey, timestamp },
) {
  return waitlistHmac(
    gatewayKey,
    "waitlist-gateway",
    `${timestamp}:${correlationId}:${submissionKey}:${clientKey}`,
  );
}

function stableClientKey(context, gatewayKey) {
  const clientIp = String(context?.ip || "netlify-client-unavailable");
  return waitlistHmac(gatewayKey, "waitlist-client", clientIp);
}

function allowedHostnames() {
  return env("TURNSTILE_ALLOWED_HOSTNAMES")
    .split(/[\s,]+/)
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
}

async function readJson(req) {
  const contentLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { error: "payload_too_large", status: 413 };
  }

  let raw = "";
  try {
    raw = await req.text();
  } catch {
    return { error: "invalid_request", status: 400 };
  }

  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return { error: "payload_too_large", status: 413 };
  }

  try {
    const value = JSON.parse(raw);
    if (!value || Array.isArray(value) || typeof value !== "object") {
      return { error: "invalid_request", status: 400 };
    }
    return { value };
  } catch {
    return { error: "invalid_request", status: 400 };
  }
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateWaitlistPayload(payload) {
  if (Object.keys(payload).some((field) => !ALLOWED_FIELDS.has(field))) {
    return { error: "invalid_request", status: 400 };
  }

  const email = text(payload.email).toLowerCase();
  const citySlug = text(payload.city_slug);
  const ageBand = text(payload.age_band);
  const gender = text(payload.gender);
  const seeking = text(payload.seeking);
  const website = text(payload.website);
  const turnstileToken = text(payload.turnstile_token);

  if (
    !email ||
    email.length > MAX_EMAIL_LENGTH ||
    email.includes("..") ||
    !EMAIL_RE.test(email) ||
    !emailLocalPartFits(email)
  ) {
    return { error: "invalid_email", status: 400 };
  }
  if (
    !findWaitlistCity(citySlug) ||
    !AGE_BANDS.has(ageBand) ||
    !GENDERS.has(gender) ||
    !SEEKING.has(seeking)
  ) {
    return { error: "invalid_request", status: 400 };
  }
  if (payload.adult_confirmed !== true) {
    return { error: "adult_required", status: 400 };
  }
  if (payload.consent !== true) {
    return { error: "consent_required", status: 400 };
  }
  if (payload.source_tag != null && typeof payload.source_tag !== "string") {
    return { error: "invalid_request", status: 400 };
  }
  if (turnstileToken.length > MAX_TURNSTILE_TOKEN_LENGTH) {
    return { error: "anti_bot_invalid", status: 403 };
  }

  return {
    value: {
      age_band: ageBand,
      city_slug: citySlug,
      email,
      gender,
      seeking,
      source_tag: channelSourceTag(payload.source_tag),
      turnstileToken,
      website,
    },
  };
}

function cleanupLocalState(now) {
  for (const [key, attempts] of localAttempts) {
    const active = attempts.filter((timestamp) => now - timestamp < LOCAL_RATE_WINDOW_MS);
    if (active.length) localAttempts.set(key, active);
    else localAttempts.delete(key);
  }
  for (const [key, timestamp] of recentSubmissions) {
    if (now - timestamp >= DUPLICATE_WINDOW_MS) recentSubmissions.delete(key);
  }

  if (localAttempts.size > MAX_LOCAL_CLIENTS) {
    const overflow = localAttempts.size - MAX_LOCAL_CLIENTS;
    [...localAttempts.keys()].slice(0, overflow).forEach((key) => localAttempts.delete(key));
  }
}

function consumeLocalRateLimit(clientKey, now = Date.now()) {
  cleanupLocalState(now);
  const attempts = localAttempts.get(clientKey) || [];
  if (attempts.length >= LOCAL_RATE_LIMIT) return false;
  attempts.push(now);
  localAttempts.set(clientKey, attempts);
  return true;
}

function isDuplicate(submissionKey, now = Date.now()) {
  const timestamp = recentSubmissions.get(submissionKey);
  return timestamp != null && now - timestamp < DUPLICATE_WINDOW_MS;
}

async function verifyTurnstile({ remoteIp, token }) {
  const secret = env("TURNSTILE_SECRET_KEY");
  const hostnames = allowedHostnames();
  if (!secret || !hostnames.length) return { configured: false, success: false };
  if (!token) return { configured: true, success: false };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TURNSTILE_TIMEOUT_MS);
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  form.set("idempotency_key", randomUUID());
  if (remoteIp) form.set("remoteip", remoteIp);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      body: form,
      method: "POST",
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success || result.action !== TURNSTILE_ACTION) {
      return { configured: true, success: false };
    }

    const hostname = String(result.hostname || "").toLowerCase();
    if (!hostnames.includes(hostname)) {
      return { configured: true, success: false };
    }
    return { configured: true, success: true };
  } catch {
    return { configured: true, success: false, unavailable: true };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Xano answers 200 {status:"received"} (also for a repeat sign-up), 400, 401,
// 409, 429. A 409 means the address is already on the list, so the visitor sees
// the same success as a first sign-up; nothing about the list is revealed.
function publicResult(status) {
  if (status >= 200 && status < 300) return { body: { ok: true }, status: 200 };
  if (status === 409) return { body: { ok: true }, status: 200, duplicate: true };
  if (status === 429) return { body: { code: "rate_limited" }, status: 429 };
  if (status === 404) return { body: { code: "endpoint_unavailable" }, status: 503 };
  if (status === 400) return { body: { code: "invalid_request" }, status: 400 };
  return { body: { code: "submit_failed" }, status: 502 };
}

async function forwardJoin(baseUrl, payload, correlationId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${WAITLIST_JOIN_PATH}`, {
      body: JSON.stringify(payload),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Correlation-Id": correlationId,
      },
      method: "POST",
      signal: controller.signal,
    });
    return publicResult(response.status);
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async (req, context = {}) => {
  const correlationId = safeCorrelationId(context);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "X-Correlation-Id": correlationId } });
  }
  if (req.method !== "POST") {
    return jsonResponse({ code: "method_not_allowed" }, 405, correlationId);
  }

  const parsed = await readJson(req);
  if (parsed.error) {
    securityEvent("waitlist_rejected", { code: parsed.error, correlation_id: correlationId });
    return jsonResponse({ code: parsed.error }, parsed.status, correlationId);
  }

  const checked = validateWaitlistPayload(parsed.value);
  if (checked.error) {
    securityEvent("waitlist_rejected", { code: checked.error, correlation_id: correlationId });
    return jsonResponse({ code: checked.error }, checked.status, correlationId);
  }

  const submission = checked.value;
  if (submission.website) {
    securityEvent("waitlist_honeypot", { correlation_id: correlationId });
    return jsonResponse({ ok: true }, 202, correlationId);
  }

  const baseUrl = cleanUrl(env("ANEWLUV_XANO_CONTACT_API_BASE_URL"));
  const gatewayKey = env("WAITLIST_GATEWAY_KEY");
  if (
    !baseUrl ||
    !gatewayKey ||
    !env("TURNSTILE_SECRET_KEY") ||
    !allowedHostnames().length
  ) {
    securityEvent("waitlist_unavailable", { correlation_id: correlationId });
    return jsonResponse({ code: "endpoint_unavailable" }, 503, correlationId);
  }

  const clientKey = stableClientKey(context, gatewayKey);
  if (!consumeLocalRateLimit(clientKey)) {
    securityEvent("waitlist_rate_limited", { client_key: clientKey, correlation_id: correlationId });
    return jsonResponse({ code: "rate_limited" }, 429, correlationId);
  }

  const fields = {
    age_band: submission.age_band,
    city_slug: submission.city_slug,
    email: submission.email,
    gender: submission.gender,
    seeking: submission.seeking,
    source_tag: submission.source_tag,
  };
  const submissionKey = waitlistSubmissionKey(gatewayKey, fields);

  // A repeat inside the window looks like a normal success and sends nothing.
  if (isDuplicate(submissionKey)) {
    securityEvent("waitlist_duplicate", { client_key: clientKey, correlation_id: correlationId });
    return jsonResponse({ ok: true }, 200, correlationId);
  }

  const turnstile = await verifyTurnstile({
    remoteIp: context?.ip,
    token: submission.turnstileToken,
  });
  if (!turnstile.configured || turnstile.unavailable) {
    securityEvent("waitlist_antibot_unavailable", { correlation_id: correlationId });
    return jsonResponse({ code: "endpoint_unavailable" }, 503, correlationId);
  }
  if (!turnstile.success) {
    securityEvent("waitlist_antibot_rejected", { client_key: clientKey, correlation_id: correlationId });
    return jsonResponse({ code: "anti_bot_invalid" }, 403, correlationId);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const trustedPayload = {
    adult_confirmed: true,
    age_band: fields.age_band,
    city_slug: fields.city_slug,
    client_key: clientKey,
    consent: true,
    correlation_id: correlationId,
    email: fields.email,
    gateway_signature: waitlistGatewaySignature(gatewayKey, {
      clientKey,
      correlationId,
      submissionKey,
      timestamp,
    }),
    gateway_timestamp: timestamp,
    gender: fields.gender,
    seeking: fields.seeking,
    source_tag: fields.source_tag,
    submission_key: submissionKey,
  };

  try {
    const result = await forwardJoin(baseUrl, trustedPayload, correlationId);
    if (result.body.ok) {
      recentSubmissions.set(submissionKey, Date.now());
      securityEvent("waitlist_accepted", {
        client_key: clientKey,
        correlation_id: correlationId,
        duplicate: Boolean(result.duplicate),
      });
    }
    return jsonResponse(result.body, result.status, correlationId);
  } catch (error) {
    securityEvent("waitlist_upstream_error", { correlation_id: correlationId });
    return jsonResponse(
      { code: error?.name === "AbortError" ? "timeout" : "network_error" },
      502,
      correlationId,
    );
  }
};

export function resetWaitlistSecurityStateForTests() {
  localAttempts.clear();
  recentSubmissions.clear();
}

export const config = {
  path: "/api/waitlist",
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["ip"],
    windowLimit: 3,
    windowSize: 180,
  },
};
