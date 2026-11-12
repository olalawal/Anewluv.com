import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const privacy = source.slice(
  source.indexOf("privacy: {"),
  source.indexOf("terms: {", source.indexOf("privacy: {")),
);

test("the privacy page has a Waitlist section covering what, why, how long, removal", () => {
  assert.ok(privacy.includes('["Waitlist", ['), "Waitlist section present");
  for (const phrase of [
    "email address",
    "the city you chose",
    "age range",
    "gender",
    "who you want to meet",
    "link tag",
    "opens in your city",
    "count interest in each city",
    "plus 12 months",
    "ask us to remove",
    "Unsubscribe page or the Contact form",
    "never sell or share",
  ]) {
    assert.ok(privacy.includes(phrase), `missing: ${phrase}`);
  }
});

test("legal sections get anchor ids so /privacy-policy#waitlist works", () => {
  assert.match(source, /id=\{heading\.toLowerCase\(\)\.replace/);
});

test("the waitlist page links to that anchor", () => {
  assert.ok(source.includes('href="/privacy-policy#waitlist"'));
});
