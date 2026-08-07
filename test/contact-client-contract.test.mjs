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
