#!/usr/bin/env node
// LOCAL TEST TOOLING ONLY (olalawal/AnewluvExpo#520). Not Xano, never deployed.
//
// Implements docs/xano/waitlist-join-public-endpoint.md against a fake local key
// so the site gateway can be exercised end to end without any real service.
// Rows live in memory, every row is marked is_test, and the only read endpoints
// return counts (city x gender x age band x source tag) with no emails.
//
//   node scripts/mock-xano-waitlist.mjs        (PORT, default 8789; HOST 127.0.0.1)
//
// Point the site at it with ANEWLUV_XANO_CONTACT_API_BASE_URL=http://127.0.0.1:8789/api
// and WAITLIST_GATEWAY_KEY=local-test-waitlist-key.

import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

import { WAITLIST_AGE_BANDS, WAITLIST_CITIES, WAITLIST_GENDERS, WAITLIST_SEEKING } from "../src/waitlist-shared.js";
import { renderCountsPage } from "./waitlist-counts-view.mjs";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8789);
const LOCAL_TEST_KEY = process.env.WAITLIST_GATEWAY_KEY || "local-test-waitlist-key";
const MAX_SKEW_SECONDS = 300;
const FIELDS = new Set([
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
const HEX64 = /^[0-9a-f]{64}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const rows = new Map(); // key "email|city" -> row (kept in memory only)

function hmac(namespace, value) {
  return createHmac("sha256", LOCAL_TEST_KEY).update(`${namespace}:v1:${value}`).digest("hex");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Cache-Control": "no-store", "Content-Type": type });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function validate(body) {
  const inList = (pairs, value) => pairs.some(([key]) => key === value);
  if (!body || typeof body !== "object" || Array.isArray(body)) return 400;
  if (Object.keys(body).some((key) => !FIELDS.has(key))) return 400;
  const email = body.email;
  if (typeof email !== "string" || email !== email.trim().toLowerCase()) return 400;
  if (email.length > 254 || !EMAIL.test(email)) return 400;
  if (!WAITLIST_CITIES.some((city) => city.slug === body.city_slug)) return 400;
  if (!inList(WAITLIST_AGE_BANDS, body.age_band)) return 400;
  if (!inList(WAITLIST_GENDERS, body.gender)) return 400;
  if (!inList(WAITLIST_SEEKING, body.seeking)) return 400;
  if (typeof body.source_tag !== "string" || !/^[a-z0-9-]{0,40}$/.test(body.source_tag)) return 400;
  if (body.adult_confirmed !== true || body.consent !== true) return 400;
  if (!HEX64.test(String(body.client_key)) || !HEX64.test(String(body.submission_key))) return 400;
  if (typeof body.correlation_id !== "string" || !body.correlation_id || body.correlation_id.length > 100) {
    return 400;
  }
  return 0;
}

function join(body) {
  if (!body || typeof body !== "object") return 400;
  const timestamp = Number(body.gateway_timestamp);
  if (!Number.isInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > MAX_SKEW_SECONDS) return 401;
  const expectedSignature = hmac(
    "waitlist-gateway",
    `${body.gateway_timestamp}:${body.correlation_id}:${body.submission_key}:${body.client_key}`,
  );
  if (!safeEqual(expectedSignature, body.gateway_signature)) return 401;
  const invalid = validate(body);
  if (invalid) return invalid;
  const expectedSubmission = hmac(
    "waitlist-submission",
    JSON.stringify([body.email, body.city_slug, body.age_band, body.gender, body.seeking, body.source_tag]),
  );
  if (!safeEqual(expectedSubmission, body.submission_key)) return 401;

  const key = `${body.email}|${body.city_slug}`;
  if (!rows.has(key)) {
    rows.set(key, {
      age_band: body.age_band,
      city_slug: body.city_slug,
      gender: body.gender,
      is_test: true,
      seeking: body.seeking,
      source_tag: body.source_tag,
    });
  }
  return 200; // a repeat sign-up is also 200 and changes nothing
}

function counts() {
  const grouped = new Map();
  for (const row of rows.values()) {
    const id = [row.city_slug, row.gender, row.age_band, row.source_tag].join("|");
    const entry = grouped.get(id) || {
      age_band: row.age_band,
      city_slug: row.city_slug,
      count: 0,
      gender: row.gender,
      is_test: true,
      source_tag: row.source_tag,
    };
    entry.count += 1;
    grouped.set(id, entry);
  }
  return {
    all_rows_are_test: [...rows.values()].every((row) => row.is_test === true),
    groups: [...grouped.values()].sort((a, b) =>
      `${a.city_slug}${a.gender}${a.age_band}`.localeCompare(`${b.city_slug}${b.gender}${b.age_band}`),
    ),
    total_rows: rows.size,
  };
}

// The readable counts page is rendered server-side from the same counts JSON.


const server = createServer((req, res) => {
  const { pathname } = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  if (req.method === "GET" && pathname === "/counts") return send(res, 200, counts());
  if (req.method === "GET" && pathname === "/counts-view") return send(res, 200, renderCountsPage(counts()), "text/html; charset=utf-8");
  if (req.method === "POST" && pathname === "/api/waitlist/join_public") {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      let body = null;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        return send(res, 400, { message: "bad json" });
      }
      const status = join(body);
      return send(res, status, status === 200 ? { status: "received" } : { message: "rejected" });
    });
    return undefined;
  }
  return send(res, 404, { message: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`LOCAL TEST Xano waitlist mock: http://${HOST}:${PORT}/ (counts at /counts-view)`);
});
