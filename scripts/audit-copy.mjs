import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const risky = /\b(token|tokens|crypto|cryptocurrency|ico|presale|coin|wallet|holder|holders|ownership|profit|profitable|profits|investment|investor|payout|payouts|dividend|yield|staking|liquidity|dao)\b|revenue share|revenue sharing|share subscription revenue|share of revenue|market value|investment return|token ownership|Paddle/gi;
const scannedRoots = ["index.html", "src"];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if ([".git", "node_modules", "dist", ".netlify"].includes(entry.name)) return [];
      return walk(full);
    }
    return [full];
  });
}

const scanTargets = scannedRoots.flatMap((entry) => {
  const full = path.join(root, entry);
  if (!fs.existsSync(full)) return [];
  if (fs.statSync(full).isDirectory()) return walk(full);
  return [full];
});

const failures = [];
for (const file of scanTargets) {
  const rel = path.normalize(path.relative(root, file));
  if (!/\.(html|jsx|js|ts|tsx|md|json|toml|css)$/.test(rel)) continue;
  const text = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => !/Stripe is not used to sell/.test(line))
    .join("\n");
  const matches = [...text.matchAll(risky)];
  if (matches.length) failures.push(`${rel}: ${[...new Set(matches.map((m) => m[0]))].join(", ")}`);
}

if (failures.length) {
  console.error("Risky copy found:");
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("No risky public copy found outside allowed audit/spec docs.");
