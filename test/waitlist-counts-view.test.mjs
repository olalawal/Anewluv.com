import assert from "node:assert/strict";
import { test } from "node:test";

import { OPENING_GUESS, countsTables, renderCountsPage } from "../scripts/waitlist-counts-view.mjs";

const counts = {
  groups: [
    { city_slug: "denver-co", gender: "man", age_band: "30-44", source_tag: "reddit", count: 2, is_test: true },
    { city_slug: "missoula-mt", gender: "woman", age_band: "21-29", source_tag: "x", count: 2, is_test: true },
    { city_slug: "missoula-mt", gender: "woman", age_band: "18-20", source_tag: "", count: 1, is_test: true },
  ],
};

test("by-city table lists every city with gender columns and totals", () => {
  const { byCity } = countsTables(counts);
  assert.deepEqual(byCity.head, ["City", "Woman", "Man", "Nonbinary", "Total"]);
  const missoula = byCity.rows.find((row) => row[0] === "Missoula, MT");
  assert.deepEqual(missoula, ["Missoula, MT", 3, 0, 0, 3]);
  assert.ok(byCity.rows.find((row) => row[0] === "Chico, CA"), "cities with no sign-ups still show");
  assert.deepEqual(byCity.foot, ["All cities", 3, 2, 0, 5]);
});

test("detail table splits city x gender x age band, only rows that have sign-ups", () => {
  const { detail } = countsTables(counts);
  assert.deepEqual(detail.head, ["City · gender", "18-20", "21-29", "30-44", "45+", "Total"]);
  assert.deepEqual(detail.rows, [
    ["Denver, CO · Man", 0, 0, 2, 0, 2],
    ["Missoula, MT · Woman", 1, 2, 0, 0, 3],
  ]);
  assert.deepEqual(detail.foot, ["All", 1, 2, 2, 0, 5]);
});

test("channel table counts the ?src= tag per city; an empty tag counts as direct", () => {
  const { byChannel } = countsTables(counts);
  assert.deepEqual(byChannel.head, ["City", "direct", "reddit", "x", "Total"]);
  assert.deepEqual(byChannel.foot, ["All cities", 1, 2, 2, 5]);
});

test("the page is counts only, escapes text and labels the opening number as a guess", () => {
  const html = renderCountsPage({ groups: [{ ...counts.groups[0], source_tag: "<b>" }] });
  assert.ok(!/[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z]/i.test(html), "no email-like text");
  assert.ok(html.includes("&lt;b&gt;"));
  assert.ok(html.includes(`about ${OPENING_GUESS} (an estimate, not a requirement)`));
  assert.ok(html.includes("Toward the opening estimate"));
  assert.equal(OPENING_GUESS, 300);
});
