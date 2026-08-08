import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("browser timeout exceeds the sequential backend request budgets", async () => {
  const [clientSource, functionSource] = await Promise.all([
    readFile(new URL("../src/main.jsx", import.meta.url), "utf8"),
    readFile(new URL("../netlify/functions/contact.js", import.meta.url), "utf8"),
  ]);
  const clientTimeout = Number(
    clientSource.match(/const CONTACT_SUBMIT_TIMEOUT_MS = (\d+);/)?.[1],
  );
  const xanoTimeout = Number(functionSource.match(/const REQUEST_TIMEOUT_MS = (\d+);/)?.[1]);
  const turnstileTimeout = Number(
    functionSource.match(/const TURNSTILE_TIMEOUT_MS = (\d+);/)?.[1],
  );

  assert.ok(Number.isFinite(clientTimeout));
  assert.ok(Number.isFinite(xanoTimeout));
  assert.ok(Number.isFinite(turnstileTimeout));
  assert.ok(clientTimeout > xanoTimeout + turnstileTimeout);
});

test("public contact UI separates public inquiries from app support and Bug Reports", async () => {
  const source = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");

  for (const label of [
    "General information",
    "Advertising",
    "Partnership",
    "Press",
    "Website question",
  ]) {
    assert.match(source, new RegExp(`\\[\"[^\"]+\", \"${label}\"\\]`));
  }
  assert.match(source, /Member support and Bug Reports belong inside the Anewluv app\./);
  assert.doesNotMatch(source, /Questions about billing, privacy, profile support, or the app/);
  assert.doesNotMatch(source, /Email admin@anewluv\.com directly/);
  assert.match(source, /Requests enter the Anewluv Admin Console first\./);
});
