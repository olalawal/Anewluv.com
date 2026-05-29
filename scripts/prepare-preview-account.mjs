#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

loadEnvFile(join(process.cwd(), ".env"));
loadEnvFile(join(process.cwd(), ".env.local"));

const ACCOUNT_EMAIL =
  process.env.ANEWLUV_SITE_PREVIEW_ACCOUNT_EMAIL;
const ACCOUNT_PASSWORD =
  process.env.ANEWLUV_SITE_PREVIEW_ACCOUNT_PASSWORD;

const AUTH_BASE = cleanUrl(process.env.ANEWLUV_XANO_AUTH_API_BASE_URL);
const DISCOVER_BASE = cleanUrl(process.env.ANEWLUV_XANO_DISCOVER_API_BASE_URL);
const PROFILE_EDIT_BASE = cleanUrl(process.env.ANEWLUV_PROFILE_EDIT_API_BASE_URL);

function cleanUrl(value) {
  return String(value || "").replace(/\/$/, "");
}

async function postJson(url, body, token = "", step = "post") {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!response.ok) {
    const error = new Error(`Request failed (${response.status})`);
    error.status = response.status;
    error.body = json;
    error.step = step;
    throw error;
  }
  return json;
}

function tokenFromLogin(json) {
  return json?.authToken || json?.auth_token || json?.token || "";
}

async function main() {
  if (!ACCOUNT_EMAIL || !ACCOUNT_PASSWORD || !AUTH_BASE || !DISCOVER_BASE || !PROFILE_EDIT_BASE) {
    console.error(
      "Missing preview account env. Set the preview account and Xano API base URL variables.",
    );
    process.exit(1);
  }

  const login = await postJson(
    `${AUTH_BASE}/auth/login`,
    {
      email: ACCOUNT_EMAIL,
      password: ACCOUNT_PASSWORD,
    },
    "",
    "auth_login",
  );
  const token = tokenFromLogin(login);
  if (!token) {
    console.error("Login succeeded but no auth token was returned.");
    process.exit(1);
  }

  await postJson(
    `${PROFILE_EDIT_BASE}/profile/edit/location`,
    {
      city: "New York",
      country: "United States",
      country_iso: "US",
      latitude: 40.7128,
      location_override: true,
      longitude: -74.006,
      override_source: "marketing_site_preview",
      state: "NY",
    },
    token,
    "profile_location",
  );

  await postJson(
    `${DISCOVER_BASE}/discover/settings`,
    {
      discover_gender_ids: [1, 2, 3],
      discover_max_age: 99,
      discover_min_age: 18,
      discover_radius_km: 1609,
    },
    token,
    "discover_settings",
  );

  const feed = await fetch(`${DISCOVER_BASE}/discover/feed?page=1&page_size=8`, {
    headers: {
      Accept: "application/json",
      Authorization: token,
      "Content-Type": "application/json",
    },
  });
  const body = await feed.json().catch(() => ({}));
  const count = Array.isArray(body?.items) ? body.items.length : 0;
  console.log(
    JSON.stringify({
      account: "preview-account",
      discover_feed_items: count,
      location: "New York, United States",
      ok: feed.ok,
      status: feed.status,
    }),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      error: "preview_account_prepare_failed",
      message: error?.body?.message || error?.body?.error || null,
      step: error?.step || null,
      status: error?.status || null,
    }),
  );
  process.exit(1);
});
