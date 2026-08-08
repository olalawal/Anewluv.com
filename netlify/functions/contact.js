import { createHmac, randomUUID } from "node:crypto";

const REQUEST_TIMEOUT_MS = 12000;
const TURNSTILE_TIMEOUT_MS = 8000;
// Covers worst-case JSON escaping for every bounded field plus the request envelope.
const MAX_BODY_BYTES = 32 * 1024;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_USERNAME_LENGTH = 80;
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;
const MAX_MESSAGE_URLS = 2;
const MAX_DECODE_PASSES = 5;
const LOCAL_RATE_WINDOW_MS = 180_000;
const LOCAL_RATE_LIMIT = 3;
const DUPLICATE_WINDOW_MS = 10 * 60_000;
const MAX_LOCAL_CLIENTS = 2000;
const TURNSTILE_ACTION = "contact_form";
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const PUBLIC_CONTACT_PATH = "/feedback/contact_us_public";
const EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const CONTROL_CHAR_RE =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/;
const DANGEROUS_CONTENT_RE =
  /\b(?:javascript|vbscript)\s*:|\bdata\s*:\s*(?:text\/html|application\/(?:javascript|x-javascript))|\bfile\s*:\/\/|<\s*\/?\s*[a-z][^>]*>|\{\{[^}]+\}\}|\$\{[^}]+\}|(?:'|%27)\s*or\s+(?:1=1|'[^']*'='[^']*)/i;
const URL_RE = /(?:https?:\/\/|www\.)/gi;
const ALLOWED_FIELDS = new Set([
  "email",
  "kind",
  "message",
  "name",
  "turnstile_token",
  "username",
  "website",
]);
const CONTACT_KINDS = {
  contact: {
    category: "general",
    route: "/contact-us",
    subject: "Website contact request",
  },
  unsubscribe: {
    category: "account_help",
    route: "/unsubscribe",
    subject: "Unsubscribe request",
  },
};

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

function securityEvent(event, details = {}) {
  console.info(JSON.stringify({ event, service: "public_contact", ...details }));
}

function safeCorrelationId(context) {
  const requestId = String(context?.requestId || "").trim();
  return /^[a-z0-9_-]{8,100}$/i.test(requestId) ? requestId : randomUUID();
}

function hmac(secret, namespace, value) {
  return createHmac("sha256", secret)
    .update(`${namespace}:v1:${value}`)
    .digest("hex");
}

function stableClientKey(context, gatewayKey) {
  const clientIp = String(context?.ip || "netlify-client-unavailable");
  return hmac(gatewayKey, "contact-client", clientIp);
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

function validatePayload(payload) {
  if (Object.keys(payload).some((field) => !ALLOWED_FIELDS.has(field))) {
    return { error: "invalid_request", status: 400 };
  }

  const kind = typeof payload.kind === "string" ? payload.kind.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  const username = typeof payload.username === "string" ? payload.username.trim() : "";
  const website = typeof payload.website === "string" ? payload.website.trim() : "";
  const turnstileToken =
    typeof payload.turnstile_token === "string" ? payload.turnstile_token.trim() : "";

  if (!CONTACT_KINDS[kind]) return { error: "invalid_request", status: 400 };
  if (
    !email ||
    email.length > MAX_EMAIL_LENGTH ||
    email.includes("..") ||
    !EMAIL_RE.test(email)
  ) {
    return { error: "invalid_email", status: 400 };
  }
  if (
    name.length > MAX_NAME_LENGTH ||
    username.length > MAX_USERNAME_LENGTH ||
    /[\u0000\r\n]/.test(name) ||
    /[\u0000\r\n]/.test(username) ||
    hasDangerousContent(name) ||
    hasDangerousContent(username)
  ) {
    return { error: "invalid_request", status: 400 };
  }
  if (
    message.length < MIN_MESSAGE_LENGTH ||
    message.length > MAX_MESSAGE_LENGTH ||
    CONTROL_CHAR_RE.test(message)
  ) {
    return { error: "invalid_message", status: 400 };
  }
  const messageInspection = inspectText(message);
  const urlCount = messageInspection.text.match(URL_RE)?.length || 0;
  if (
    messageInspection.encodingIncomplete ||
    urlCount > MAX_MESSAGE_URLS ||
    DANGEROUS_CONTENT_RE.test(messageInspection.text)
  ) {
    return { error: "invalid_message", status: 400 };
  }
  if (looksLikeGeneratedFiller(name) && looksLikeGeneratedFiller(message)) {
    return { error: "invalid_message", status: 400 };
  }
  if (turnstileToken.length > MAX_TURNSTILE_TOKEN_LENGTH) {
    return { error: "anti_bot_invalid", status: 403 };
  }

  return {
    value: { email, kind, message, name, turnstileToken, username, website },
  };
}

function inspectText(value) {
  let inspected = String(value || "").normalize("NFKC");
  for (let attempt = 0; attempt < MAX_DECODE_PASSES; attempt += 1) {
    const escapedMalformedPercents = inspected.replace(/%(?![0-9a-f]{2})/gi, "%25");
    let decoded = "";
    try {
      decoded = decodeURIComponent(escapedMalformedPercents).normalize("NFKC");
    } catch {
      decoded = escapedMalformedPercents
        .replace(/%([0-7][0-9a-f])/gi, (_match, hex) =>
          String.fromCharCode(Number.parseInt(hex, 16)),
        )
        .normalize("NFKC");
    }
    if (decoded === inspected) {
      return {
        encodingIncomplete: /%[0-9a-f]{2}/i.test(inspected),
        text: inspected,
      };
    }
    inspected = decoded;
  }
  return {
    encodingIncomplete: /%[0-9a-f]{2}/i.test(inspected),
    text: inspected,
  };
}

function hasDangerousContent(value) {
  const inspection = inspectText(value);
  return inspection.encodingIncomplete || DANGEROUS_CONTENT_RE.test(inspection.text);
}

function looksLikeGeneratedFiller(value) {
  const raw = String(value || "");
  if (/\s/.test(raw)) return false;
  const compact = raw.replace(/[^A-Za-z0-9]/g, "");
  if (!/^[A-Za-z0-9]{12,32}$/.test(compact)) {
    return false;
  }

  const letters = [...compact].filter((character) => /[A-Za-z]/.test(character));
  const upperCount = letters.filter((character) => character === character.toUpperCase()).length;
  const lowerCount = letters.length - upperCount;
  if (
    letters.length < 10 ||
    upperCount < 4 ||
    lowerCount < 4 ||
    Math.min(upperCount, lowerCount) / letters.length < 0.25 ||
    new Set(compact.toLowerCase()).size < 8
  ) {
    return false;
  }

  let transitions = 0;
  for (let index = 1; index < letters.length; index += 1) {
    const previousUpper = letters[index - 1] === letters[index - 1].toUpperCase();
    const currentUpper = letters[index] === letters[index].toUpperCase();
    if (previousUpper !== currentUpper) transitions += 1;
  }
  const camelSegments = raw.match(/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)/g) || [];
  const camelAverage = camelSegments.length
    ? letters.length / camelSegments.length
    : 0;
  const plausibleCamelPhrase =
    /^[A-Za-z]+$/.test(raw) &&
    camelSegments.length >= 2 &&
    camelSegments.filter((segment) => segment.length >= 3).length >= 2 &&
    camelAverage >= 2.75;

  return transitions >= 3 && !plausibleCamelPhrase;
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

function markSubmitted(submissionKey, now = Date.now()) {
  recentSubmissions.set(submissionKey, now);
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

function publicError(status) {
  if (status === 404) return { code: "endpoint_unavailable", status };
  if (status === 409) return { code: "duplicate", status };
  if (status === 429) return { code: "rate_limited", status };
  return { code: "submit_failed", status };
}

async function forwardContact(contactBaseUrl, payload, correlationId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${contactBaseUrl}${PUBLIC_CONTACT_PATH}`, {
      body: JSON.stringify(payload),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Correlation-Id": correlationId,
      },
      method: "POST",
      signal: controller.signal,
    });

    if (response.ok) {
      return { body: { ok: true, correlation_id: correlationId }, status: response.status };
    }
    return { body: publicError(response.status), status: response.status };
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
    securityEvent("contact_rejected", { code: parsed.error, correlation_id: correlationId });
    return jsonResponse({ code: parsed.error }, parsed.status, correlationId);
  }

  const checked = validatePayload(parsed.value);
  if (checked.error) {
    securityEvent("contact_rejected", { code: checked.error, correlation_id: correlationId });
    return jsonResponse({ code: checked.error }, checked.status, correlationId);
  }

  const submission = checked.value;
  if (submission.website) {
    securityEvent("contact_honeypot", { correlation_id: correlationId });
    return jsonResponse({ ok: true, correlation_id: correlationId }, 202, correlationId);
  }

  const contactBaseUrl = cleanUrl(env("ANEWLUV_XANO_CONTACT_API_BASE_URL"));
  const gatewayKey = env("CONTACT_GATEWAY_KEY");
  if (
    !contactBaseUrl ||
    !gatewayKey ||
    !env("TURNSTILE_SECRET_KEY") ||
    !allowedHostnames().length
  ) {
    securityEvent("contact_unavailable", { correlation_id: correlationId });
    return jsonResponse({ code: "endpoint_unavailable" }, 503, correlationId);
  }

  const clientKey = stableClientKey(context, gatewayKey);
  if (!consumeLocalRateLimit(clientKey)) {
    securityEvent("contact_rate_limited", { client_key: clientKey, correlation_id: correlationId });
    return jsonResponse({ code: "rate_limited" }, 429, correlationId);
  }

  const kindConfig = CONTACT_KINDS[submission.kind];
  const description =
    submission.kind === "unsubscribe" && submission.username
      ? `${submission.message}\n\nUsername: ${submission.username}`
      : submission.message;
  if (description.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse({ code: "invalid_message" }, 400, correlationId);
  }
  const submissionKey = hmac(
    gatewayKey,
    "contact-submission",
    JSON.stringify([submission.email, submission.kind, submission.name, description]),
  );

  if (isDuplicate(submissionKey)) {
    securityEvent("contact_duplicate", { client_key: clientKey, correlation_id: correlationId });
    return jsonResponse({ code: "duplicate" }, 409, correlationId);
  }

  const turnstile = await verifyTurnstile({
    remoteIp: context?.ip,
    token: submission.turnstileToken,
  });
  if (!turnstile.configured || turnstile.unavailable) {
    securityEvent("contact_antibot_unavailable", { correlation_id: correlationId });
    return jsonResponse({ code: "endpoint_unavailable" }, 503, correlationId);
  }
  if (!turnstile.success) {
    securityEvent("contact_antibot_rejected", { client_key: clientKey, correlation_id: correlationId });
    return jsonResponse({ code: "anti_bot_invalid" }, 403, correlationId);
  }

  const trustedPayload = {
    app_version: "anewluv-public-site",
    category: kindConfig.category,
    client_key: clientKey,
    correlation_id: correlationId,
    description,
    email: submission.email,
    gateway_timestamp: Math.floor(Date.now() / 1000),
    name: submission.name,
    network_country: String(context?.geo?.country?.code || "").slice(0, 2),
    platform: "web",
    recipient_confirmation_allowed: false,
    route: kindConfig.route,
    source: "public_website",
    subject: kindConfig.subject,
    submission_key: submissionKey,
  };
  trustedPayload.gateway_signature = hmac(
    gatewayKey,
    "contact-gateway",
    `${trustedPayload.gateway_timestamp}:${correlationId}:${submissionKey}:${clientKey}`,
  );

  try {
    const result = await forwardContact(contactBaseUrl, trustedPayload, correlationId);
    if (result.status >= 200 && result.status < 300) {
      markSubmitted(submissionKey);
      securityEvent("contact_accepted", {
        client_key: clientKey,
        correlation_id: correlationId,
        kind: submission.kind,
      });
    }
    return jsonResponse(result.body, result.status, correlationId);
  } catch (error) {
    securityEvent("contact_upstream_error", { correlation_id: correlationId });
    return jsonResponse(
      { code: error?.name === "AbortError" ? "timeout" : "network_error" },
      502,
      correlationId,
    );
  }
};

export function resetContactSecurityStateForTests() {
  localAttempts.clear();
  recentSubmissions.clear();
}

export const config = {
  path: "/api/contact",
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["ip"],
    windowLimit: 3,
    windowSize: 180,
  },
};
