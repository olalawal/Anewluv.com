import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const bundledModules = process.env.CODEX_NODE_MODULES;
if (!bundledModules) throw new Error("CODEX_NODE_MODULES is required");
const { chromium } = require(`${bundledModules}/playwright`);

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE,
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const requests = [];
const errors = [];
page.on("request", (request) => requests.push(request.url()));
page.on("pageerror", (error) => errors.push(String(error)));

await page.goto("http://127.0.0.1:8082/contact-us");
await page.waitForLoadState("networkidle");
await page.getByLabel("Name", { exact: true }).fill("Random User");
await page.getByLabel("Email", { exact: true }).fill("target@example.com");
await page
  .getByLabel("Message", { exact: true })
  .fill("https://evil.invalid/%3Cscript%3E random-token-7f8b2a");

if (!(await page.getByRole("button", { name: "Send" }).isDisabled())) {
  throw new Error("Send must fail closed without human verification");
}
await page.getByText("Security verification is unavailable.", { exact: false }).waitFor();
if (requests.some((url) => url.includes("/api/contact"))) {
  throw new Error("Contact page sent /api/contact without human verification");
}

await page.goto("http://127.0.0.1:8082/unsubscribe");
await page.waitForLoadState("networkidle");
await page.getByLabel("Email", { exact: true }).fill("victim@example.com");
await page.getByLabel("Username", { exact: true }).fill("xYzQpL9");
await page
  .getByLabel("Message", { exact: true })
  .fill("rAnDoM filler https://bad.invalid");
if (!(await page.getByRole("button", { name: "Send" }).isDisabled())) {
  throw new Error("Unsubscribe must fail closed without human verification");
}
if (requests.some((url) => url.includes("/api/contact"))) {
  throw new Error("Unsubscribe page sent /api/contact without human verification");
}
if (errors.length) throw new Error(`Unexpected browser errors: ${errors.join(" | ")}`);

console.log("PASS contact/unsubscribe fail closed; zero /api/contact requests");
await browser.close();
