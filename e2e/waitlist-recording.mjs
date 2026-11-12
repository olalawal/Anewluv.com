// LOCAL RECORDING for olalawal/AnewluvExpo#520. Test data only; no real service.
//
// Needs: scripts/mock-xano-waitlist.mjs and scripts/local-waitlist-preview.mjs
// running (see the header of the latter), CODEX_NODE_MODULES pointing at a
// node_modules folder that holds `playwright`, and BROWSER_EXECUTABLE.
// Writes desktop.webm and phone.webm into OUT_DIR.
import { createRequire } from "node:module";
import { mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const modules = process.env.CODEX_NODE_MODULES;
if (!modules) throw new Error("CODEX_NODE_MODULES is required");
const { chromium } = require(`${modules}/playwright`);

const SITE = process.env.SITE_URL || "http://127.0.0.1:8791";
const MOCK = process.env.MOCK_URL || "http://127.0.0.1:8789";
const OUT_DIR = process.env.OUT_DIR || "H:/Temp/anewluv/waitlist-clips";
// LOOK=a|b|c records one candidate design; it also shortens the run to one
// sign-up with no counts view, for side-by-side comparison clips.
const LOOK = process.env.LOOK || "";
const IP_OFFSET = Number(process.env.IP_OFFSET || 0);
mkdirSync(OUT_DIR, { recursive: true });

const profiles = [
  { name: "desktop", viewport: { width: 1280, height: 800 }, ip: "198.51.100.11", mobile: false },
  { name: "phone", viewport: { width: 390, height: 844 }, ip: "198.51.100.12", mobile: true },
];
const allSignups = [
  { city: "missoula-mt", src: "x", label: "Missoula, MT", email: "wl-test-{p}-1@mail.invalid", age: "21-29", gender: "woman", seeking: "men" },
  { city: "denver-co", src: "reddit", label: "Denver, CO", email: "wl-test-{p}-2@mail.invalid", age: "30-44", gender: "man", seeking: "women" },
];
const signups = LOOK ? allSignups.slice(0, 1) : allSignups;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, headless: true });

for (const profile of profiles) {
  const videoDir = join(OUT_DIR, `_raw-${profile.name}`);
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "x-local-test-client-ip": profile.ip.replace(/\d+$/, (n) => String(Number(n) + IP_OFFSET)),
    },
    hasTouch: profile.mobile,
    isMobile: profile.mobile,
    recordVideo: { dir: videoDir, size: profile.viewport },
    viewport: profile.viewport,
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: SITE });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));

  for (const [index, signup] of signups.entries()) {
    const look = LOOK ? `&look=${LOOK}` : "";
    await page.goto(`${SITE}/waitlist?city=${signup.city}&src=${signup.src}${look}`);
    await page.locator('select[name="city_slug"]').waitFor();
    if (index === 0) {
      await page.getByRole("button", { name: "Accept" }).click().catch(() => {});
    }
    const selected = await page.locator('select[name="city_slug"]').inputValue();
    if (selected !== signup.city) throw new Error(`city preselect failed: ${selected}`);
    // The phone cookie banner sits at the end of the page; start from the top.
    await page.evaluate(() => window.scrollTo(0, 0));
    await pause(1600);
    if (index === 0) {
      // Show the error state once: pressing Join with no email names the field.
      await page.getByRole("button", { name: "Join the waitlist" }).click();
      await page.locator(".waitlist-field-error").waitFor();
      await pause(1400);
    }

    await page.locator('input[name="email"]').pressSequentially(
      signup.email.replace("{p}", `${profile.name}${LOOK}${Date.now() % 100000}`),
      { delay: 45 },
    );
    await page.locator('select[name="age_band"]').selectOption(signup.age);
    await pause(250);
    await page.locator('select[name="gender"]').selectOption(signup.gender);
    await pause(250);
    await page.locator('select[name="seeking"]').selectOption(signup.seeking);
    await pause(250);
    await page.locator('input[name="adult_confirmed"]').check();
    await pause(500);

    const submit = page.getByRole("button", { name: "Join the waitlist" });
    await submit.scrollIntoViewIfNeeded();
    await pause(500);
    const success = page.getByText(`You're on the list for ${signup.label}.`);
    // The button is always enabled; if the security check has no token yet
    // the page says so, and the click is repeated once it is ready.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await submit.click();
      const done = await success.waitFor({ timeout: 2500 }).then(() => true, () => false);
      if (done) break;
    }
    await success.waitFor({ timeout: 15000 });
    await pause(1500);
    await page.getByRole("button", { name: "Copy link" }).click();
    await page.getByRole("button", { name: "Copied" }).waitFor();
    await pause(1500);
  }

  if (!LOOK) {
    await page.goto(`${MOCK}/counts-view`);
    await page.locator("table").first().waitFor();
    await pause(2500);
    await page.mouse.wheel(0, 700);
    await pause(1500);
  }
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);

  const video = page.video();
  await context.close();
  const recorded = await video.path();
  renameSync(recorded, join(OUT_DIR, `${profile.name}.webm`));
  console.log(`RECORDED ${profile.name}.webm`);
}

await browser.close();
