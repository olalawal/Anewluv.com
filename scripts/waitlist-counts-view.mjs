// Counts-only waitlist view (olalawal/AnewluvExpo#520, #521). Pure function:
// takes the counts JSON ({ groups: [{ city_slug, gender, age_band, source_tag,
// count, is_test }] }, the shape the mock and the #521 Xano endpoint return)
// and returns a plain HTML page of tables. It never receives an email.
import { WAITLIST_AGE_BANDS, WAITLIST_CITIES, WAITLIST_GENDERS } from "../src/waitlist-shared.js";

// UNMEASURED guess, not a gate (owner 2026-11-12): shown for reference only.
export const OPENING_GUESS = 300;

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

const cityLabel = (slug) => WAITLIST_CITIES.find((city) => city.slug === slug)?.label || slug;
const genderLabel = (value) => WAITLIST_GENDERS.find(([key]) => key === value)?.[1] || value;

function sum(groups, match) {
  return groups.filter(match).reduce((total, group) => total + (Number(group.count) || 0), 0);
}

function table(caption, head, rows, foot) {
  const cells = (row, tag) => row.map((cell, i) => `<${tag}${i ? ' class="n"' : ""}>${escapeHtml(cell)}</${tag}>`).join("");
  return `<section><h2>${escapeHtml(caption)}</h2><div class="scroll"><table>
<thead><tr>${cells(head, "th")}</tr></thead>
<tbody>${rows.map((row) => `<tr>${cells(row, "td")}</tr>`).join("")}</tbody>
${foot ? `<tfoot><tr>${cells(foot, "th")}</tr></tfoot>` : ""}
</table></div></section>`;
}

export function countsTables(counts) {
  const groups = Array.isArray(counts?.groups) ? counts.groups : [];
  const genders = WAITLIST_GENDERS.map(([key]) => key);
  const bands = WAITLIST_AGE_BANDS.map(([key]) => key);

  const byCity = WAITLIST_CITIES.map((city) => [
    city.label,
    ...genders.map((g) => sum(groups, (x) => x.city_slug === city.slug && x.gender === g)),
    sum(groups, (x) => x.city_slug === city.slug),
  ]);
  const cityFoot = ["All cities", ...genders.map((g) => sum(groups, (x) => x.gender === g)), sum(groups, () => true)];

  const detail = [];
  for (const city of WAITLIST_CITIES) {
    for (const g of genders) {
      const total = sum(groups, (x) => x.city_slug === city.slug && x.gender === g);
      if (!total) continue;
      detail.push([
        `${city.label} · ${genderLabel(g)}`,
        ...bands.map((b) => sum(groups, (x) => x.city_slug === city.slug && x.gender === g && x.age_band === b)),
        total,
      ]);
    }
  }
  const detailFoot = ["All", ...bands.map((b) => sum(groups, (x) => x.age_band === b)), sum(groups, () => true)];

  const channels = [...new Set(groups.map((x) => x.source_tag || "direct"))].sort();
  const tag = (x) => x.source_tag || "direct";
  const byChannel = WAITLIST_CITIES.map((city) => [
    city.label,
    ...channels.map((channel) => sum(groups, (x) => tag(x) === channel && x.city_slug === city.slug)),
    sum(groups, (x) => x.city_slug === city.slug),
  ]);
  const channelFoot = ["All cities", ...channels.map((channel) => sum(groups, (x) => tag(x) === channel)), sum(groups, () => true)];

  return {
    byCity: { head: ["City", ...genders.map(genderLabel), "Total"], rows: byCity, foot: cityFoot },
    detail: { head: ["City · gender", ...bands, "Total"], rows: detail, foot: detailFoot },
    byChannel: { head: ["City", ...channels, "Total"], rows: byChannel, foot: channelFoot },
  };
}

export function renderCountsPage(counts, { testData = true } = {}) {
  const t = countsTables(counts);
  const total = sum(Array.isArray(counts?.groups) ? counts.groups : [], () => true);
  const note = testData ? "Local test data only. " : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Waitlist counts</title>
<style>
:root{--ink:#1d1520;--muted:#6b5d68;--line:#eadde5;--rose:#e8327c;--bg:#fff8fb;--card:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:960px;margin:0 auto;padding:24px 16px 40px}
h1{font-size:24px;margin:0 0 4px}
.sub{color:var(--muted);margin:0 0 18px}
.total{display:inline-block;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 16px;margin-bottom:18px}
.total b{display:block;font-size:30px;color:var(--rose);line-height:1.1}
section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 14px 6px;margin:0 0 16px}
h2{font-size:16px;margin:0 0 10px}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;min-width:100%}
th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}
.n{text-align:right;font-variant-numeric:tabular-nums}
thead th{font-size:13px;color:var(--muted)}
tfoot th{border-bottom:0}
th:first-child,td:first-child{white-space:normal;min-width:96px}
@media (max-width:480px){body{font-size:14px}main{padding:18px 12px 32px}section{padding:12px 10px 4px}th,td{padding:7px 6px}}
</style></head><body><main>
<h1>Waitlist counts</h1>
<p class="sub">${note}Counts only, no emails. Opening number per city: ${OPENING_GUESS} (a guess, not a gate).</p>
<div class="total">Sign-ups<b>${total}</b></div>
${table("By city", t.byCity.head, t.byCity.rows, t.byCity.foot)}
${table("By city, gender and age band", t.detail.head, t.detail.rows, t.detail.foot)}
${table("By channel (the ?src= tag; no tag = direct)", t.byChannel.head, t.byChannel.rows, t.byChannel.foot)}
</main></body></html>`;
}
