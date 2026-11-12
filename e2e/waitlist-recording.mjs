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
mkdirSync(OUT_DIR, { recursive: true });

const profiles = [
  { name: "desktop", viewport: { width: 1280, height: 800 }, ip: "198.51.100.11", mobile: false },
  { name: "phone", viewport: { width: 390, height: 844 }, ip: "198.51.100.12", mobile: true },
];
const signups = [
  { city: "missoula-mt", label: "Missoula, MT", email: "wl-test-{p}-1@mail.invalid", age: "21-29", gender: "woman", seeking: "men" },
  { city: "denver-co", label: "Denver, CO", email: "wl-test-{p}-2@mail.invalid", age: "30-44", gender: "man", seeking: "women" },
];

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, headless: true });

for (const profile of profiles) {
  const videoDir = join(OUT_DIR, `_raw-${profile.name}`);
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-local-test-client-ip": profile.ip },
    hasTouch: profile.mobile,
    isMobile: profile.mobile,
    recordVideo: { dir: videoDir, size: profile.viewport },
    viewport: profile.viewport,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));

  for (const [index, signup] of signups.entries()) {
    await page.goto(`${SITE}/waitlist?city=${signup.city}`);
    await page.locator('select[name="city_slug"]').waitFor();
    if (index === 0) {
      await page.getByRole("button", { name: "Accept" }).click().catch(() => {});
    }
    const selected = await page.locator('select[name="city_slug"]').inputValue();
    if (selected !== signup.city) throw new Error(`city preselect failed: ${selected}`);
    await page.locator("form").scrollIntoViewIfNeeded();
    await pause(900);

    await page.locator('input[name="email"]').pressSequentially(
      signup.email.replace("{p}", profile.name),
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
    await page.waitForFunction(
      () => {
        const button = [...document.querySelectorAll("button")].find((b) =>
          b.textContent.includes("Join the waitlist"),
        );
        return button && !button.disabled;
      },
      null,
      { timeout: 20000 },
    );
    await submit.scrollIntoViewIfNeeded();
    await pause(500);
    await submit.click();
    const success = page.getByText(`You're on the list for ${signup.label}.`);
    await success.waitFor({ timeout: 15000 });
    await success.scrollIntoViewIfNeeded();
    await pause(2500);
  }

  await page.goto(`${MOCK}/counts-view`);
  await page.waitForFunction(() => !document.getElementById("out").textContent.includes("loading"));
  await pause(4000);
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);

  const video = page.video();
  await context.close();
  const recorded = await video.path();
  renameSync(recorded, join(OUT_DIR, `${profile.name}.webm`));
  console.log(`RECORDED ${profile.name}.webm`);
}

await browser.close();
