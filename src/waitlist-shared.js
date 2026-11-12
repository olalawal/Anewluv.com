// Shared by the /waitlist page (src/main.jsx) and the server function
// (netlify/functions/waitlist.js). Cities live in src/data/waitlist-cities.json:
// change a city there and neither side needs a code change.
import cities from "./data/waitlist-cities.json" with { type: "json" };

export const WAITLIST_CITIES = cities;
export const WAITLIST_AGE_BANDS = [
  ["18-20", "18-20"],
  ["21-29", "21-29"],
  ["30-44", "30-44"],
  ["45+", "45+"],
];
export const WAITLIST_GENDERS = [
  ["woman", "Woman"],
  ["man", "Man"],
  ["nonbinary", "Nonbinary"],
];
export const WAITLIST_SEEKING = [
  ["women", "Women"],
  ["men", "Men"],
  ["everyone", "Everyone"],
];
export const SOURCE_TAG_MAX_LENGTH = 40;

export function findWaitlistCity(slug) {
  return WAITLIST_CITIES.find((city) => city.slug === slug) || null;
}

// Channel tags (`?src=`) keep only [a-z0-9-], max 40.
export function sanitizeSourceTag(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, SOURCE_TAG_MAX_LENGTH);
}

// The channel a sign-up came from (`?src=x`, `?src=reddit` ...). The city has
// its own field, so this tag holds the channel only; no tag means "direct".
export const DIRECT_SOURCE_TAG = "direct";
export function channelSourceTag(value) {
  return sanitizeSourceTag(value) || DIRECT_SOURCE_TAG;
}

// The Xano endpoint refuses a part before the @ longer than 64 characters
// (RFC 5321 limit), so the page and the function refuse it first.
export const EMAIL_LOCAL_PART_MAX_LENGTH = 64;
export function emailLocalPartFits(email) {
  const at = String(email ?? "").lastIndexOf("@");
  return at > 0 && at <= EMAIL_LOCAL_PART_MAX_LENGTH;
}
