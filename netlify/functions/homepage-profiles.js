const DEFAULT_APP_BASE_URL = "https://app.anewluv.com";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_FEED_ITEMS = 20;
const MAX_PERSONAL_PREVIEW_ITEMS = 1;
const MAX_PREVIEW_ACCOUNT_ATTEMPTS = 3;
const DISCOVER_PAGE_SIZE = 50;
const DISCOVER_RANDOM_PAGE_MAX = 60;
const SEED_EMAIL_PATTERN = /^seed\d+@seed\.anewluv\.test$/i;
const PREVIEW_SCREEN_DEFS = [
  ["discover", "Discover", "/DiscoverScreen"],
  ["search", "Search", "/AllUsersScreen"],
  ["matches", "Matches", "/MatchesScreen"],
  ["chat", "Chat", "/ChatScreen"],
  ["profileDetail", "Profile Detail", "/ProfileDetailsScreen"],
  ["moderation", "Report and Block", "/ProfileDetailsScreen"],
  ["profile", "My Profile", "/MyProfileNewScreen"],
  ["personality", "Personality", "/PersonalityTestScreen"],
  ["editProfile", "Edit Profile", "/EditProfileScreen"],
  ["rewards", "Rewards", "/RewardsScreen"],
  ["upgrade", "Upgrade", "/InAppScreen"],
  ["entitlements", "Entitlements", "/InAppScreen"],
];
const authTokenCache = new Map();

function env(name) {
  return globalThis.Netlify?.env?.get(name) ?? process.env[name] ?? "";
}

function cleanUrl(value) {
  return String(value || "").replace(/\/$/, "");
}

function slugFor(value) {
  return String(value || "app")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "app";
}

function originFromUrl(value) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function previewLinks(appBaseUrl) {
  return {
    billing: `${appBaseUrl}/InAppScreen`,
    chat: `${appBaseUrl}/ChatScreen`,
    discover: `${appBaseUrl}/DiscoverScreen`,
    editProfile: `${appBaseUrl}/EditProfileScreen`,
    likes: `${appBaseUrl}/LikesScreen`,
    home: appBaseUrl,
    matches: `${appBaseUrl}/MatchesScreen`,
    myProfile: `${appBaseUrl}/MyProfileNewScreen`,
    personality: `${appBaseUrl}/PersonalityTestScreen`,
    profileDetail: `${appBaseUrl}/ProfileDetailsScreen`,
    rewards: `${appBaseUrl}/RewardsScreen`,
    rewardsLeaderboard: `${appBaseUrl}/RewardsLeaderboardScreen`,
    search: `${appBaseUrl}/AllUsersScreen`,
    settings: `${appBaseUrl}/SettingScreen`,
  };
}

function previewScreens(appBaseUrl, profiles = []) {
  const screenshotBaseUrl = cleanUrl(env("ANEWLUV_SITE_APP_SCREENSHOT_BASE_URL"));
  const firstProfileUrl = profiles.find((profile) => profile?.appUrl)?.appUrl || "";

  return PREVIEW_SCREEN_DEFS.map(([key, label, route]) => {
    const slug = slugFor(key);
    return {
      appUrl: key === "profileDetail" && firstProfileUrl ? firstProfileUrl : `${appBaseUrl}${route}`,
      key,
      label,
      previewUrl: `/preview/${slug}`,
      route,
      screenshotUrl: screenshotBaseUrl ? `${screenshotBaseUrl}/${slug}.png` : `/generated/app-screens/${slug}.png`,
    };
  });
}

function fallbackPreviewProfiles(appBaseUrl) {
  const photoUrls = [
    "/assets/dating-cafe-phone.png",
    "/assets/dating-friends-phones.png",
    "/assets/dating-park-friends.png",
  ];
  return [
    {
      age: 31,
      appUrl: `${appBaseUrl}/DiscoverScreen`,
      bio: "Loves weekend markets, easy conversations, and finding new coffee spots.",
      chips: ["Coffee", "Travel", "Music", "Outdoors"],
      city: "New York",
      compat: 86,
      country: "United States",
      distanceMiles: 8,
      genderKey: "female",
      id: "fallback-preview-1",
      interests: ["Coffee", "Travel", "Music", "Outdoors"],
      job: "Creative lead",
      location: "New York, United States",
      name: "Maya",
      photoUrl: photoUrls[0],
      photos: photoUrls,
      prompts: [
        { question: "Perfect first date", answer: "A small place with good music and room to talk." },
      ],
      tier: "Premium",
    },
    {
      age: 35,
      appUrl: `${appBaseUrl}/DiscoverScreen`,
      bio: "Active, direct, and into thoughtful messages more than endless swiping.",
      chips: ["Fitness", "Movies", "Cooking", "Dogs"],
      city: "Brooklyn",
      compat: 79,
      country: "United States",
      distanceMiles: 14,
      genderKey: "male",
      id: "fallback-preview-2",
      interests: ["Fitness", "Movies", "Cooking", "Dogs"],
      job: "Product manager",
      location: "Brooklyn, United States",
      name: "Jordan",
      photoUrl: photoUrls[1],
      photos: [photoUrls[1], photoUrls[2], photoUrls[0]],
      prompts: [
        { question: "I make time for", answer: "Good food, close friends, and getting outside." },
      ],
      tier: "Plus",
    },
    {
      age: 29,
      appUrl: `${appBaseUrl}/DiscoverScreen`,
      bio: "Conversation-first, privacy-aware, and looking for something with real context.",
      chips: ["Books", "Art", "Hiking", "Food"],
      city: "Jersey City",
      compat: 73,
      country: "United States",
      distanceMiles: 18,
      genderKey: "female",
      id: "fallback-preview-3",
      interests: ["Books", "Art", "Hiking", "Food"],
      job: "Designer",
      location: "Jersey City, United States",
      name: "Ari",
      photoUrl: photoUrls[2],
      photos: [photoUrls[2], photoUrls[0], photoUrls[1]],
      prompts: [
        { question: "Green flag", answer: "You ask real questions and remember the answers." },
      ],
      tier: "",
    },
  ];
}

function fallbackPreviewPayload(appBaseUrl, source = "fallback") {
  const profiles = fallbackPreviewProfiles(appBaseUrl);
  const previewProfiles = profiles.slice(0, MAX_PERSONAL_PREVIEW_ITEMS);
  return {
    source,
    generatedAt: new Date().toISOString(),
    links: previewLinks(appBaseUrl),
    profiles,
    previewProfiles,
    screens: previewScreens(appBaseUrl, previewProfiles),
  };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (!response.ok) {
      const error = new Error(`Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parsePreviewAccounts() {
  const accounts = [];
  const sharedPassword = env("ANEWLUV_SITE_PREVIEW_ACCOUNT_PASSWORD");
  const accountsJson = env("ANEWLUV_SITE_PREVIEW_ACCOUNTS_JSON");
  if (accountsJson) {
    try {
      const parsed = JSON.parse(accountsJson);
      if (Array.isArray(parsed)) {
        for (const account of parsed) {
          const normalized = normalizePreviewAccount(account, sharedPassword);
          if (normalized) accounts.push(normalized);
        }
      }
    } catch {
      // Ignore malformed optional account pools and fall back to single-account env.
    }
  }

  const emailPool = env("ANEWLUV_SITE_PREVIEW_ACCOUNT_EMAILS")
    .split(/[,\n|;]/)
    .map((email) => email.trim())
    .filter(Boolean);
  if (emailPool.length && sharedPassword) {
    accounts.push(...emailPool.map((email) => ({ email, password: sharedPassword })));
  }

  const email = env("ANEWLUV_SITE_PREVIEW_ACCOUNT_EMAIL");
  const password = env("ANEWLUV_SITE_PREVIEW_ACCOUNT_PASSWORD");
  if (email && password) accounts.push({ email, password });

  const seen = new Set();
  return accounts.filter((account) => {
    const key = `${account.email}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizePreviewAccount(account, fallbackPassword = "") {
  if (!account) return null;
  const email = String(account.email || "").trim();
  const password = String(account.password || fallbackPassword || "").trim();
  if (!email || !password) return null;
  return {
    city: firstString(account.city, account.City),
    country: firstString(account.country, account.Country),
    email,
    locationText: firstString(account.location_text, account.locationText, account.location),
    password,
    region: firstString(account.region, account.state, account.State),
    timezone: firstString(account.timezone, account.time_zone),
  };
}

async function getAuthToken(authBaseUrl, account) {
  const directCredential = env("ANEWLUV_SITE_DISCOVER_ACCESS_CREDENTIAL");
  if (directCredential) return directCredential;

  const email = account?.email;
  const password = account?.password;

  if (!authBaseUrl || !email || !password) return "";
  const cacheKey = `${authBaseUrl}:${email}`;
  const cached = authTokenCache.get(cacheKey);
  if (cached?.token && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const login = await fetchJson(`${authBaseUrl}/auth/login`, {
    body: JSON.stringify({ email, password }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const token = login?.authToken || login?.auth_token || login?.token || "";
  if (token) {
    authTokenCache.set(cacheKey, {
      expiresAt: Date.now() + 10 * 60 * 1000,
      token,
    });
  }
  return token;
}

function absolutizeAsset(url, assetOrigin) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("/") && assetOrigin) return new URL(url, assetOrigin).href;
  return url;
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function toArray(value) {
  const parsed = parseMaybeJson(value);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.items)) return parsed.items;
  if (Array.isArray(parsed?.data)) return parsed.data;
  if (Array.isArray(parsed?.json)) return parsed.json;
  return [];
}

function uniqueStrings(values, limit = 6) {
  return [
    ...new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
        .filter((value) => !/^(any|not\s*set|notset|undefined|null)$/i.test(value)),
    ),
  ].slice(0, limit);
}

function firstString(...values) {
  return String(values.find((value) => String(value ?? "").trim()) ?? "").trim();
}

function numeric(value, fallback = null) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function stableHash(value) {
  const text = String(value || "preview");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = stableHash(seed) || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function pickSeeded(items, seed = "") {
  if (!items.length) return null;
  const random = seed ? seededRandom(seed) : Math.random;
  return items[Math.floor(random() * items.length)];
}

function shuffleSeeded(items, seed = "") {
  const next = [...items];
  const random = seed ? seededRandom(seed) : Math.random;
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function previewPageNumbers(seed = "") {
  const random = seededRandom(`${seed}:pages`);
  return [1 + Math.floor(random() * DISCOVER_RANDOM_PAGE_MAX)];
}

function previewLocationText(...sources) {
  for (const source of sources) {
    const direct = firstString(source?.locationText, source?.location_text, source?.location);
    if (direct) return direct;
    const city = firstString(source?.city, source?.City);
    const region = firstString(source?.region, source?.state, source?.State);
    const country = firstString(source?.country, source?.Country);
    const joined = [city, region, country].filter(Boolean).join(", ");
    if (joined) return joined;
  }
  return "";
}

function previewAccountLocationScore(account, visitorLocation) {
  if (!account || !visitorLocation) return 0;
  let score = 0;
  if (account.country && visitorLocation.country && account.country.toLowerCase() === visitorLocation.country.toLowerCase()) {
    score += 1;
  }
  if (account.region && visitorLocation.region && account.region.toLowerCase() === visitorLocation.region.toLowerCase()) {
    score += 2;
  }
  if (account.city && visitorLocation.city && account.city.toLowerCase() === visitorLocation.city.toLowerCase()) {
    score += 4;
  }
  if (account.timezone && visitorLocation.timezone && account.timezone === visitorLocation.timezone) {
    score += 1;
  }
  return score;
}

function selectPreviewAccount(accounts, sessionId, visitorLocation) {
  if (!accounts.length) return null;
  const scored = accounts.map((account) => ({
    account,
    score: previewAccountLocationScore(account, visitorLocation),
  }));
  const bestScore = Math.max(...scored.map((item) => item.score));
  const pool = bestScore > 0 ? scored.filter((item) => item.score === bestScore).map((item) => item.account) : accounts;
  return pickSeeded(pool, sessionId || previewLocationText(visitorLocation));
}

function samePreviewAccount(left, right) {
  return Boolean(left?.email && right?.email && left.email === right.email);
}

function orderedPreviewAccounts(accounts, sessionId, visitorLocation) {
  if (!accounts.length) return [null];
  const primary = selectPreviewAccount(accounts, sessionId, visitorLocation);
  const ordered = [];
  for (const account of [primary, accounts[0], ...shuffleSeeded(accounts, `${sessionId}:accounts`)]) {
    if (!account || ordered.some((existing) => samePreviewAccount(existing, account))) continue;
    ordered.push(account);
    if (ordered.length >= MAX_PREVIEW_ACCOUNT_ATTEMPTS) break;
  }
  return ordered;
}

function headerText(headers, names) {
  for (const name of names) {
    const value = headers.get(name);
    if (value) {
      const text = String(value).trim();
      try {
        return decodeURIComponent(text);
      } catch {
        return text;
      }
    }
  }
  return "";
}

function visitorLocationFromRequest(req) {
  const requestUrl = new URL(req.url);
  const city = firstString(
    requestUrl.searchParams.get("city"),
    headerText(req.headers, ["x-nf-geo-city", "x-vercel-ip-city", "cf-ipcity"]),
  );
  const region = firstString(
    requestUrl.searchParams.get("region"),
    requestUrl.searchParams.get("state"),
    headerText(req.headers, ["x-nf-geo-subdivision", "x-vercel-ip-country-region", "cf-region"]),
  );
  const country = firstString(
    requestUrl.searchParams.get("country"),
    headerText(req.headers, ["x-nf-geo-country", "x-vercel-ip-country", "cf-ipcountry"]),
  );
  const timezone = firstString(
    requestUrl.searchParams.get("timezone"),
    headerText(req.headers, ["x-nf-geo-timezone", "x-vercel-ip-timezone"]),
  );
  const locationText = firstString(requestUrl.searchParams.get("location_text"), [city, region, country].filter(Boolean).join(", "));
  return { city, country, locationText, region, timezone };
}

function firstNumber(...values) {
  for (const value of values) {
    const next = numeric(value, null);
    if (next != null) return next;
  }
  return null;
}

function genderKeyFrom(...sources) {
  const label = firstString(
    ...sources.flatMap((source) => [
      source?.gender,
      source?.Gender,
      source?.gender_name,
      source?.GenderName,
      source?.sex,
      source?.Sex,
    ]),
  ).toLowerCase();

  if (/\b(female|woman|women)\b/.test(label)) return "female";
  if (/\b(male|man|men)\b/.test(label)) return "male";
  if (/\b(nonbinary|non-binary|other|lgbtq)\b/.test(label)) return "other";

  const id = firstNumber(
    ...sources.flatMap((source) => [
      source?.gender_id,
      source?.GenderID,
      source?.genderid,
      source?.genderId,
      source?.gender?.id,
    ]),
  );

  if (id === 1) return "male";
  if (id === 2) return "female";
  if (id === 3) return "other";
  return "";
}

function labelFor(item) {
  if (typeof item === "string") return item;
  return firstString(
    item?.label,
    item?.name,
    item?.title,
    item?.InterestName,
    item?.Description,
    item?.Name,
    item?.answer_text,
    item?.answer,
    item?.value,
  );
}

function photoUrlFrom(value, assetOrigin) {
  if (!value) return "";
  if (typeof value === "string") return absolutizeAsset(value, assetOrigin);
  return absolutizeAsset(
    value.url || value.path || value.src || value.photo_url || value.PhotoUrl,
    assetOrigin,
  );
}

function extractPhotos(assetOrigin, ...sources) {
  const urls = [];
  for (const source of sources) {
    if (!source) continue;
    urls.push(photoUrlFrom(source?.PhotoData, assetOrigin));
    urls.push(photoUrlFrom(source?.photo, assetOrigin));
    urls.push(photoUrlFrom(source?.photo_url, assetOrigin));
    urls.push(photoUrlFrom(source?.PhotoUrl, assetOrigin));
    urls.push(photoUrlFrom(source?.profile_photo, assetOrigin));
    urls.push(photoUrlFrom(source?.main_photo, assetOrigin));
    for (const item of toArray(source?.photos)) urls.push(photoUrlFrom(item, assetOrigin));
    for (const item of toArray(source?.gallery)) urls.push(photoUrlFrom(item, assetOrigin));
    for (const item of toArray(source?.profile_photos)) urls.push(photoUrlFrom(item, assetOrigin));
  }
  return uniqueStrings(urls, 8);
}

function extractInterests(...sources) {
  const labels = [];
  for (const source of sources) {
    if (!source) continue;
    for (const key of [
      "interests",
      "hobbies",
      "user_interests",
      "selected_interests",
      "profile_interests",
      "interestslifestyle",
      "interestssports",
      "interestspassions",
      "hot_features",
      "heroChips",
    ]) {
      labels.push(...toArray(source?.[key]).map(labelFor));
    }
  }
  return uniqueStrings(labels, 24).slice(0, 6);
}

function extractPrompts(detail) {
  const prompts = toArray(detail?.prompts || detail?.profile_prompts || detail?.prompt_cards);
  return prompts
    .map((prompt) => ({
      answer: firstString(prompt?.answer_text, prompt?.answer, prompt?.value),
      question: firstString(prompt?.question, prompt?.prompt, prompt?.prompt_text, prompt?.title),
    }))
    .filter((prompt) => prompt.question && prompt.answer)
    .slice(0, 2);
}

function publicProfileFromItem(item, detail, appBaseUrl, assetOrigin) {
  const preview = item?.profile_preview ?? item?.profile ?? {};
  const merged = { ...item, ...preview, ...(detail || {}) };
  const id = item?.other_user_id ?? item?.user_id ?? preview?.user_id ?? detail?.user_id ?? item?.id;
  if (!id) return null;

  const firstName = firstString(merged.first_name, merged.FirstName);
  const lastName = firstString(merged.last_name, merged.LastName);
  const screenName = firstString(merged.screen_name, merged.ScreenName, merged.name);
  const fullName = firstString(screenName, [firstName, lastName].filter(Boolean).join(" "));
  const score = numeric(item?.compatibility_percent ?? item?.score ?? detail?.compatibility_percent, 0);
  const distanceKm = numeric(item?.distance_km, null);
  const distanceMiles =
    numeric(item?.distance_miles, null) ??
    (distanceKm == null ? null : Math.max(0, Math.round(distanceKm * 0.621371)));
  const photos = extractPhotos(assetOrigin, merged, preview, detail);

  return {
    age: numeric(merged.age, null),
    appUrl: `${appBaseUrl}/ProfileDetailsScreen?targetUserId=${encodeURIComponent(id)}`,
    bio: firstString(merged.bio_preview, merged.bio, merged.Bio_TEXT).slice(0, 180),
    chips: extractInterests(merged, preview, detail).slice(0, 4),
    city: firstString(merged.city, merged.City),
    compat: Math.max(0, Math.min(100, Math.round(score))),
    country: firstString(merged.country, merged.Country),
    distanceMiles,
    genderKey: genderKeyFrom(item, preview, detail, merged),
    id,
    interests: extractInterests(merged, preview, detail),
    job: firstString(merged.job, merged.occupation, merged.OccupationName, merged.work),
    location: firstString(
      merged.location,
      [firstString(merged.city, merged.City), firstString(merged.country, merged.Country)]
        .filter(Boolean)
        .join(", "),
    ),
    name: fullName || "Anewluv member",
    photoUrl: photos[0] || "",
    photos,
    prompts: extractPrompts(detail),
    tier: firstString(merged.tier),
  };
}

function isTruthyFlag(value) {
  return value === true || value === 1 || String(value).toLowerCase() === "true";
}

function hasSeedEmailIdentity(...sources) {
  const emailFields = [
    "email",
    "Email",
    "partner_email",
    "PartnerEmail",
    "user_email",
    "UserEmail",
    "account_email",
    "AccountEmail",
    "profile_email",
    "ProfileEmail",
  ];

  return sources.some((source) =>
    emailFields.some((field) => {
      const value = String(source?.[field] || "").toLowerCase();
      return SEED_EMAIL_PATTERN.test(value.trim());
    }),
  );
}

function isSeedPreviewAccount(account) {
  return hasSeedEmailIdentity(account);
}

function hasGeneratedPreviewFlag(item) {
  const preview = item?.profile_preview ?? item?.profile ?? {};
  return (
    [item, preview].some((source) =>
      isTruthyFlag(source?.is_ai_agent) ||
      isTruthyFlag(source?.is_seed) ||
      isTruthyFlag(source?.is_preview) ||
      isTruthyFlag(source?.is_test) ||
      isTruthyFlag(source?.is_generated),
    ) || hasSeedEmailIdentity(item, preview)
  );
}

function previewItemId(item) {
  const preview = item?.profile_preview ?? item?.profile ?? {};
  return item?.other_user_id ?? item?.user_id ?? preview?.user_id ?? item?.id;
}

function publicDiscoveryItems(items) {
  return Array.isArray(items) ? items : [];
}

function personalPreviewItems(items, allowedIds) {
  if (!Array.isArray(items)) return [];
  if (allowedIds.size) {
    return items.filter((item) => allowedIds.has(String(previewItemId(item))));
  }
  return items.filter(hasGeneratedPreviewFlag);
}

function allowedPreviewProfileIds() {
  return new Set(
    env("ANEWLUV_SITE_PREVIEW_PROFILE_IDS")
      .split(/[,\n|;]/)
      .map((id) => String(id).trim())
      .filter(Boolean),
  );
}

function uniqueItemsById(items) {
  const seen = new Set();
  return items.filter((item) => {
    const id = previewItemId(item);
    const key = id == null ? JSON.stringify(item) : String(id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function loadSearchItems(discoverBaseUrl, authHeaders, visitorLocation, previewAccount, sessionId = "") {
  const locationText = previewLocationText(visitorLocation, previewAccount);
  const pages = previewPageNumbers(`${sessionId}:search`);
  try {
    const results = await Promise.allSettled(
      pages.map((page) =>
        fetchJson(`${discoverBaseUrl}/search/quick`, {
          body: JSON.stringify({
            age_max: 99,
            age_min: 18,
            distance_miles: 1000,
            filter_mode: "all",
            interested_in: "both",
            interested_in_gender_ids: [1, 2, 3],
            location_text: locationText,
            page,
            page_size: DISCOVER_PAGE_SIZE,
            sort_mode: "distance_asc",
          }),
          headers: authHeaders,
          method: "POST",
        }),
      ),
    );
    const items = uniqueItemsById(
      results.flatMap((result) => publicDiscoveryItems(result.status === "fulfilled" ? result.value?.items : [])),
    );
    if (items.length || pages.includes(1)) return items;
    const firstPage = await fetchJson(`${discoverBaseUrl}/search/quick`, {
      body: JSON.stringify({
        age_max: 99,
        age_min: 18,
        distance_miles: 1000,
        filter_mode: "all",
        interested_in: "both",
        interested_in_gender_ids: [1, 2, 3],
        location_text: locationText,
        page: 1,
        page_size: DISCOVER_PAGE_SIZE,
        sort_mode: "distance_asc",
      }),
      headers: authHeaders,
      method: "POST",
    });
    return uniqueItemsById(publicDiscoveryItems(firstPage?.items));
  } catch {
    return [];
  }
}

async function loadFeedItems(discoverBaseUrl, authHeaders, sessionId = "") {
  const pages = previewPageNumbers(`${sessionId}:feed`);
  try {
    const results = await Promise.allSettled(
      pages.map((page) =>
        fetchJson(`${discoverBaseUrl}/discover/feed?page=${page}&page_size=${DISCOVER_PAGE_SIZE}`, {
          headers: authHeaders,
        }),
      ),
    );
    const items = uniqueItemsById(
      results.flatMap((result) => publicDiscoveryItems(result.status === "fulfilled" ? result.value?.items : [])),
    );
    if (items.length || pages.includes(1)) return items;
    const firstPage = await fetchJson(`${discoverBaseUrl}/discover/feed?page=1&page_size=${DISCOVER_PAGE_SIZE}`, {
      headers: authHeaders,
    });
    return uniqueItemsById(publicDiscoveryItems(firstPage?.items));
  } catch {
    return [];
  }
}

async function loadDiscoverPreviewForAccount({
  appBaseUrl,
  assetOrigin,
  authBaseUrl,
  discoverBaseUrl,
  previewAccount,
  sessionId = "",
  visitorLocation,
}) {
  const token = await getAuthToken(authBaseUrl, previewAccount);
  if (!token) {
    return null;
  }

  const authHeaders = {
    Accept: "application/json",
    Authorization: token,
    "Content-Type": "application/json",
  };
  const allowedIds = allowedPreviewProfileIds();
  let source = "live-search";
  let items = await loadSearchItems(discoverBaseUrl, authHeaders, visitorLocation, previewAccount, sessionId);
  let publicItems = shuffleSeeded(
    items,
    `${sessionId}:search`,
  ).slice(0, MAX_FEED_ITEMS + MAX_PERSONAL_PREVIEW_ITEMS);
  if (!publicItems.length) {
    source = "live";
    items = await loadFeedItems(discoverBaseUrl, authHeaders, sessionId);
    publicItems = shuffleSeeded(items, `${sessionId}:feed`).slice(0, MAX_FEED_ITEMS + MAX_PERSONAL_PREVIEW_ITEMS);
  }
  const previewItems = isSeedPreviewAccount(previewAccount)
    ? shuffleSeeded(personalPreviewItems(items, allowedIds), `${sessionId}:preview`).slice(0, MAX_PERSONAL_PREVIEW_ITEMS)
    : [];

  const publicProfilePool = publicItems
    .map((item) =>
      publicProfileFromItem(item, null, appBaseUrl, assetOrigin),
    )
    .filter(Boolean);
  const previewProfiles = previewItems
    .map((item) =>
      publicProfileFromItem(item, null, appBaseUrl, assetOrigin),
    )
    .filter(Boolean)
    .filter((profile) => !allowedIds.size || allowedIds.has(String(profile.id)))
    .slice(0, MAX_PERSONAL_PREVIEW_ITEMS);

  if (!publicProfilePool.length) {
    return null;
  }
  const fallbackFrameProfiles = publicProfilePool.slice(1, 1 + MAX_PERSONAL_PREVIEW_ITEMS);
  const frameProfiles = previewProfiles.length
    ? previewProfiles
    : fallbackFrameProfiles.length
      ? fallbackFrameProfiles
      : publicProfilePool.slice(0, MAX_PERSONAL_PREVIEW_ITEMS);
  const frameProfileIds = new Set(frameProfiles.map((profile) => String(profile.id)).filter(Boolean));
  const profiles = publicProfilePool
    .filter((profile) => !frameProfileIds.has(String(profile.id)))
    .slice(0, MAX_FEED_ITEMS);
  if (!profiles.length) {
    return null;
  }

  return {
    source,
    generatedAt: new Date().toISOString(),
    links: previewLinks(appBaseUrl),
    profiles,
    previewProfiles: frameProfiles,
    screens: previewScreens(appBaseUrl, frameProfiles),
  };
}

async function loadDiscoverPreview({ appBaseUrl, assetOrigin, authBaseUrl, discoverBaseUrl, sessionId = "", visitorLocation }) {
  if (!discoverBaseUrl) {
    return fallbackPreviewPayload(appBaseUrl, "fallback-unconfigured");
  }

  const previewAccounts = orderedPreviewAccounts(parsePreviewAccounts(), sessionId, visitorLocation);
  for (const previewAccount of previewAccounts) {
    try {
      const payload = await loadDiscoverPreviewForAccount({
        appBaseUrl,
        assetOrigin,
        authBaseUrl,
        discoverBaseUrl,
        previewAccount,
        sessionId,
        visitorLocation,
      });
      if (payload) return payload;
    } catch {
      // Try the next configured preview account before falling back.
    }
  }

  return fallbackPreviewPayload(appBaseUrl, "fallback-empty");
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const appBaseUrl = cleanUrl(env("ANEWLUV_APP_BASE_URL")) || DEFAULT_APP_BASE_URL;
  const authBaseUrl = cleanUrl(env("ANEWLUV_XANO_AUTH_API_BASE_URL"));
  const discoverBaseUrl = cleanUrl(env("ANEWLUV_XANO_DISCOVER_API_BASE_URL"));
  const assetOrigin = originFromUrl(discoverBaseUrl || authBaseUrl);
  const requestUrl = new URL(req.url);
  const sessionId =
    requestUrl.searchParams.get("refresh_id") ||
    requestUrl.searchParams.get("session_id") ||
    `${Date.now()}:${Math.random()}`;
  const visitorLocation = visitorLocationFromRequest(req);

  try {
    return jsonResponse(
      await loadDiscoverPreview({
        appBaseUrl,
        assetOrigin,
        authBaseUrl,
        discoverBaseUrl,
        sessionId,
        visitorLocation,
      }),
    );
  } catch {
    return jsonResponse(fallbackPreviewPayload(appBaseUrl, "fallback-error"));
  }
};

export const config = {
  path: "/api/homepage-profiles",
};
