import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const purchaseCopy =
  "Paid purchases provide access to subscriptions, premium memberships, Hearts in-app credit, and optional digital features delivered inside Anewluv.";

const CONTACT_ENDPOINT = "/api/contact";
const CONTACT_SUBMIT_TIMEOUT_MS = 12000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MESSAGE_LENGTH = 10;
const APP_BASE_URL = "https://app.anewluv.com";
const APP_PREVIEW_ENDPOINT = "/api/app-preview";
const THEME_STORAGE_KEY = "anewluv-site-theme";
const COOKIE_STORAGE_KEY = "anewluv-site-cookie-ok";
const APP_PREVIEW_CACHE_PREFIX = "anewluv-site-preview:";
const USE_LIVE_APP_EMBEDS = import.meta.env.VITE_ANEWLUV_LIVE_APP_EMBEDS === "true";
const USE_LIVE_HOME_EMBED = import.meta.env.VITE_ANEWLUV_LIVE_HOME_EMBED !== "false";
const APP_PREVIEW_MODE = import.meta.env.VITE_ANEWLUV_APP_PREVIEW_MODE || "internal-iframes";
const USE_INTERNAL_PREVIEW_IFRAMES = APP_PREVIEW_MODE === "internal-iframes";
const USE_APP_SCREENSHOTS = APP_PREVIEW_MODE === "screenshots";
const APP_SCREENSHOT_BASE_URL = (
  import.meta.env.VITE_ANEWLUV_APP_SCREENSHOT_BASE_URL || "/generated/app-screens"
).replace(/\/$/, "");
const socialLinks = [
  ["X", import.meta.env.VITE_ANEWLUV_X_URL || "https://x.com/AnewluvDGOD", "x"],
  ["TikTok", import.meta.env.VITE_ANEWLUV_TIKTOK_URL || "https://www.tiktok.com/@anewluv4", "tiktok"],
];
let appPreviewPageSeed = "";
let appPreviewRefreshSeed = "";

const defaultPreviewLinks = {
  discover: `${APP_BASE_URL}/DiscoverScreen`,
  editProfile: `${APP_BASE_URL}/EditProfileScreen`,
  billing: `${APP_BASE_URL}/InAppScreen`,
  chat: `${APP_BASE_URL}/ChatScreen`,
  likes: `${APP_BASE_URL}/LikesScreen`,
  home: APP_BASE_URL,
  matches: `${APP_BASE_URL}/MatchesScreen`,
  myProfile: `${APP_BASE_URL}/MyProfileNewScreen`,
  personality: `${APP_BASE_URL}/PersonalityTestScreen`,
  profileDetail: `${APP_BASE_URL}/ProfileDetailsScreen`,
  pricing: "/pricing",
  rewards: `${APP_BASE_URL}/RewardsScreen`,
  rewardsLeaderboard: `${APP_BASE_URL}/RewardsLeaderboardScreen`,
  search: `${APP_BASE_URL}/AllUsersScreen`,
  settings: `${APP_BASE_URL}/SettingScreen`,
};

const primaryNavItems = [
  ["Home", "/"],
  ["Pricing", "/pricing"],
  ["Privacy", "/privacy-policy"],
  ["Terms", "/terms-of-service"],
  ["Guidelines", "/community-guidelines"],
  ["Contact", "/contact-us"],
];

const footerNavItems = [
  ...primaryNavItems,
  ["Refunds", "/refunds"],
  ["Unsubscribe", "/unsubscribe"],
];

const logoSrc = "/assets/anewluv-logo.png";

const lifestyleImages = {
  cafe: "/assets/dating-cafe-phone.png",
  friends: "/assets/dating-friends-phones.png",
  park: "/assets/dating-park-friends.png",
};

const featureCards = [
  ["Profile detail previews", "Photos, prompts, location context, interests, and compatibility signals make each profile feel easier to read."],
  ["Discover controls", "Filters, boosts, visibility tools, and premium discovery settings help members shape who they see."],
  ["Built-in safety", "Reporting, appeals, moderation review, and community standards keep the dating experience accountable."],
];

const appExperienceCards = [
  {
    title: "Discover with real profile context",
    body: "Live profile cards show photos, prompts, distance context, and compatibility cues before a member opens the full profile.",
    image: lifestyleImages.friends,
    label: "Discover",
    linkKey: "discover",
  },
  {
    title: "Build a profile that feels complete",
    body: "My Profile keeps prompts, media, personality sections, and reward progress close to the action instead of buried in settings.",
    image: lifestyleImages.cafe,
    label: "My Profile",
    linkKey: "myProfile",
  },
  {
    title: "Perks stay inside the app experience",
    body: "Hearts, boosts, profile visibility, and premium perks are positioned as digital app benefits for members, not financial products.",
    image: lifestyleImages.park,
    label: "Rewards",
    linkKey: "rewards",
  },
];

const pricingExperienceCards = [
  {
    title: "Membership checkout",
    body: "Premium purchases are positioned as software access and optional digital app features delivered through the member account.",
    image: lifestyleImages.cafe,
    label: "Membership",
    linkKey: "billing",
  },
  {
    title: "Perks dashboard",
    body: "Hearts, boosts, super-likes, profile visibility, and catalog perks stay framed as in-app benefits.",
    image: lifestyleImages.park,
    label: "Perks",
    linkKey: "rewards",
  },
  {
    title: "Safety controls",
    body: "Settings, reporting, moderation, and support links are part of the product story, not hidden legal footnotes.",
    image: lifestyleImages.friends,
    label: "Settings",
    linkKey: "settings",
  },
];

const appTourItems = [
  {
    type: "phone",
    title: "Discover",
    body: "Browse profile cards with photos, distance context, and compatibility signals before opening a profile.",
    label: "Discover",
    linkKey: "discover",
    tilt: "-4deg",
    variant: "discover",
  },
  {
    type: "copy",
    kicker: "Less random swiping",
    title: "Anewluv gives each profile more context before the first tap.",
    body: "Profiles, prompts, preferences, and personality details work together so members can decide faster without turning dating into a guessing game.",
  },
  {
    type: "phone",
    title: "Search / Browse All",
    body: "Search controls and browse views help members widen the pool without losing the dating-first experience.",
    label: "Browse All",
    linkKey: "search",
    tilt: "3deg",
    variant: "search",
  },
  {
    type: "phone",
    title: "Matches",
    body: "Likes, matches, chats, and profile actions stay close so the next step is clear.",
    label: "Matches",
    linkKey: "matches",
    tilt: "-2deg",
    variant: "matches",
  },
  {
    type: "phone",
    title: "Chat",
    body: "Messages keep match context visible so a conversation can move from profile detail into a real thread.",
    label: "Chat",
    linkKey: "chat",
    tilt: "3deg",
    variant: "chat",
  },
  {
    type: "copy",
    kicker: "More than a profile card",
    title: "Open the full profile when the quick preview looks promising.",
    body: "Profile detail pages bring together photos, prompts, interests, and safety actions so members can move forward with better information.",
  },
  {
    type: "phone",
    title: "Profile detail",
    body: "A fuller profile page gives members richer context before they like, message, or move on.",
    getHref: (links, profiles) => profiles.find((profile) => profile.appUrl)?.appUrl || links.profileDetail || links.discover,
    label: "Profile Detail",
    tilt: "4deg",
    variant: "profileDetail",
  },
  {
    type: "phone",
    title: "Report and block",
    body: "Safety actions use the same bottom sheet pattern members see from profile detail and chat.",
    label: "Moderation",
    linkKey: "profileDetail",
    tilt: "-2deg",
    variant: "moderation",
  },
  {
    type: "phone",
    title: "My Profile",
    body: "Members can improve photos, prompts, personality answers, and profile completeness from one hub.",
    label: "My Profile",
    linkKey: "myProfile",
    tilt: "-3deg",
    variant: "profile",
  },
  {
    type: "phone",
    title: "Personality",
    body: "Personality sections add background, attachment, values, communication style, and matching context to the profile.",
    label: "Personality",
    linkKey: "personality",
    tilt: "2deg",
    variant: "personality",
  },
  {
    type: "phone",
    title: "Edit Profile",
    body: "Profile sections make it clear what is complete, what can improve, and where personality details fit.",
    label: "Edit Profile",
    linkKey: "editProfile",
    tilt: "3deg",
    variant: "editProfile",
  },
  {
    type: "phone",
    title: "Rewards",
    body: "Rewards, Hearts, boosts, and premium app benefits stay framed as digital in-app perks.",
    label: "Rewards",
    linkKey: "rewards",
    tilt: "-2deg",
    variant: "rewards",
  },
  {
    type: "phone",
    title: "Targeted upgrades",
    body: "Members can apply Hearts or points toward boosts, a la carte tools, short premium passes, and subscription upgrades.",
    label: "Upgrade",
    linkKey: "billing",
    tilt: "3deg",
    variant: "upgrade",
  },
  {
    type: "phone",
    title: "Entitlements",
    body: "Members can review active membership access, Hearts balance, boosts, super-likes, and account perks in one place.",
    label: "Entitlements",
    linkKey: "billing",
    tilt: "-2deg",
    variant: "entitlements",
  },
];

const matchMoments = [
  ["Discover", "Browse profile cards with photos, interests, prompts, and compatibility context."],
  ["Connect", "Move from a quick match preview into richer profile detail before the first message."],
  ["Grow", "Use personality insights, profile boosts, Hearts, and premium tools as your dating style changes."],
];

const heroCards = [
  {
    label: "Start",
    title: "Open app",
    body: "Log in, browse, match, and message.",
    linkKey: "home",
    icon: "arrow",
  },
  {
    label: "Discover",
    title: "Find profiles",
    body: "Swipe through people with useful context.",
    linkKey: "discover",
    icon: "spark",
  },
  {
    label: "Personality",
    title: "Add depth",
    body: "Complete profile sections that improve context.",
    linkKey: "personality",
    icon: "heart",
  },
  {
    label: "Plans",
    title: "Pricing",
    body: "See free and premium app options.",
    linkKey: "pricing",
    icon: "card",
  },
];

function isValidEmail(value) {
  return typeof value === "string" && EMAIL_RE.test(value.trim());
}

function buildContactMetadata({ email, name }) {
  const viewport =
    typeof window !== "undefined" && window.innerWidth
      ? `${window.innerWidth}x${window.innerHeight}`
      : "";
  const userAgent =
    typeof navigator !== "undefined" && navigator.userAgent
      ? String(navigator.userAgent)
      : "";

  return {
    app_version: "marketing-site",
    authenticated: false,
    email,
    email_verified: null,
    moderation_state: null,
    name: name || null,
    platform: "web",
    route: typeof window !== "undefined" ? window.location.pathname : "/contact-us",
    source: "anewluv_marketing_site",
    submitted_at: new Date().toISOString(),
    user_agent: userAgent,
    viewport,
  };
}

function getAppPreviewSessionId() {
  if (typeof window === "undefined") return "server";
  try {
    const querySession = new URLSearchParams(window.location.search).get("session_id");
    if (querySession) return querySession;
    if (appPreviewPageSeed) return appPreviewPageSeed;
    const browserRandom = window[["cry", "pto"].join("")]?.randomUUID?.();
    appPreviewPageSeed =
      browserRandom ||
      `preview-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return appPreviewPageSeed;
  } catch {
    if (!appPreviewPageSeed) appPreviewPageSeed = `preview-${Date.now()}`;
    return appPreviewPageSeed;
  }
}

function getAppPreviewRefreshId() {
  if (typeof window === "undefined") return "server";
  try {
    const queryRefresh = new URLSearchParams(window.location.search).get("refresh_id");
    if (queryRefresh) return queryRefresh;
    if (appPreviewRefreshSeed) return appPreviewRefreshSeed;
    const browserRandom = window[["cry", "pto"].join("")]?.randomUUID?.();
    appPreviewRefreshSeed =
      browserRandom || `refresh-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return appPreviewRefreshSeed;
  } catch {
    if (!appPreviewRefreshSeed) {
      appPreviewRefreshSeed = `refresh-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return appPreviewRefreshSeed;
  }
}

function previewCacheKey(refreshId = getAppPreviewRefreshId()) {
  return `${APP_PREVIEW_CACHE_PREFIX}${refreshId}`;
}

function readCachedPreviewPayload(refreshId = getAppPreviewRefreshId()) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(previewCacheKey(refreshId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCachedPreviewPayload(payload, refreshId = getAppPreviewRefreshId()) {
  if (typeof window === "undefined" || !payload) return;
  try {
    window.sessionStorage.setItem(previewCacheKey(refreshId), JSON.stringify(payload));
  } catch {
    // Preview cache is an optimization; rendering still works without storage.
  }
}

function getAppPreviewTimezone() {
  try {
    const queryTimezone = new URLSearchParams(window.location.search).get("timezone");
    if (queryTimezone) return queryTimezone;
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

function getCurrentSiteTheme() {
  if (typeof window === "undefined") return "light";
  try {
    const queryTheme = new URLSearchParams(window.location.search).get("theme");
    if (queryTheme === "dark" || queryTheme === "light") return queryTheme;
    const documentTheme = document.documentElement.dataset.theme;
    if (documentTheme === "dark" || documentTheme === "light") return documentTheme;
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
  } catch {
    // Fall through to the default light preview theme.
  }
  return "light";
}

function applySiteTheme(theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme persistence is optional.
  }
}

async function submitContactUsPOST({ subject, category, description, metadata }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONTACT_SUBMIT_TIMEOUT_MS);

  try {
    const response = await fetch(CONTACT_ENDPOINT, {
      body: JSON.stringify({
        subject,
        category,
        description,
        ...metadata,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 404) {
      return { ok: false, status: 404, code: "endpoint_unavailable" };
    }
    if (response.status === 429) {
      return { ok: false, status: 429, code: "rate_limited" };
    }

    let body = null;
    try {
      body = await response.json();
    } catch {
      // Status is enough for the user-facing message if the backend returns no JSON.
    }

    if (response.status >= 200 && response.status < 300) {
      return { ok: true, status: response.status, body };
    }
    return { ok: false, status: response.status, body, code: "submit_failed" };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error?.name === "AbortError") {
      return { ok: false, code: "timeout" };
    }
    return { ok: false, code: "network_error" };
  }
}

const pricingTiers = [
  ["Free", "$0", "Daily discovery caps, basic matching, profile creation, messaging, ads, and standard community access."],
  ["Plus", "$4.99/week", "Higher daily caps, rewind swipes, more likes, weekly premium access, and fewer ads."],
  ["Premium", "$14.99/mo", "See likes, advanced filters, profile priority, boosts, more super-likes, and ad-free access."],
  ["VIP", "$29.99/mo", "Expanded caps, read receipts, incognito mode, message-before-match, and stronger visibility tools."],
];

const planComparisonCards = [
  {
    badge: "",
    cadence: "Core features",
    cta: "Get Started",
    features: [
      "Create your profile",
      "Take the personality quiz",
      "Basic discovery features",
      "Collect in-app Hearts",
      "Profile context visible to premium members",
    ],
    name: "Basic",
    price: "Free",
    tone: "basic",
  },
  {
    badge: "Plus",
    cadence: "Billed weekly",
    cta: "Start Plus",
    features: [
      "Everything in Basic",
      "Personality blending in matching",
      "Personality-first sort option",
      "View personality summaries",
      "Priority support",
    ],
    name: "Plus",
    price: "$4.99",
    suffix: "/week",
    tone: "plus",
  },
  {
    badge: "Most Popular",
    cadence: "Billed monthly",
    cta: "Go Premium",
    features: [
      "Everything in Plus",
      "See who likes you",
      "Unlimited likes",
      "Personality type search filter",
      "Advanced compatibility insights",
    ],
    name: "Premium",
    price: "$14.99",
    suffix: "/month",
    tone: "premium",
  },
  {
    badge: "VIP",
    cadence: "Billed monthly",
    cta: "Go VIP",
    features: [
      "Everything in Premium",
      "Exclusive VIP profile badge",
      "Priority profile visibility",
      "Early access to new features",
      "VIP support SLA",
    ],
    name: "VIP",
    price: "$29.99",
    suffix: "/month",
    tone: "vip",
  },
];

const heartsPacks = [
  ["Starter", "10,000 Hearts", "$0.99"],
  ["Mini", "25,000 Hearts + bonus", "$1.99"],
  ["Plus", "60,000 Hearts + bonus", "$4.99"],
  ["Pro", "140,000 Hearts + bonus", "$9.99"],
  ["Mega", "320,000 Hearts + bonus", "$19.99"],
];

const alaCarte = [
  "Profile Boost",
  "Super-Likes",
  "Extra Likes",
  "Extra Swipes",
  "Message Openings",
  "Profile Review",
];

const guidelineGroups = [
  ["Be real", "Use your own photos, represent yourself honestly, and keep one account per person."],
  ["Be respectful", "No harassment, threats, hate speech, stalking, or unwanted repeated contact."],
  ["Stay safe", "No scams, payment requests, impersonation, explicit unwanted content, or attempts to move people off-platform too early."],
  ["Use the appeal flow", "Warnings, suspensions, and bans can be appealed from inside the app when eligible."],
];

function App() {
  const [theme, toggleTheme] = useThemeMode();
  const path = normalizePath(window.location.pathname);
  if (path.startsWith("/preview/")) {
    return <PreviewFramePage screenKey={path.replace(/^\/preview\//, "") || "discover"} />;
  }
  const page = routeFor(path);

  return (
    <>
      <SiteHeader onToggleTheme={toggleTheme} theme={theme} />
      {page}
      <Footer />
      <CookieNotice />
    </>
  );
}

function normalizePath(path) {
  if (path === "/terms-of-service-1") return "/terms-of-service";
  if (path === "/unsubscribe-1") return "/unsubscribe";
  return path;
}

function routeFor(path) {
  if (path === "/pricing") return <PricingPage />;
  if (path === "/privacy-policy") return <LegalPage type="privacy" />;
  if (path === "/terms-of-service") return <LegalPage type="terms" />;
  if (path === "/refunds") return <LegalPage type="refunds" />;
  if (path === "/community-guidelines") return <GuidelinesPage />;
  if (path === "/contact-us") return <ContactPage />;
  if (path === "/unsubscribe") return <UnsubscribePage />;
  return <HomePage />;
}

function SiteHeader({ onToggleTheme, theme }) {
  return (
    <header className="site-header">
      <a className="brand" href="/">
        <img className="brand-mark" src={logoSrc} alt="" />
        <span>Anewluv</span>
      </a>
      <nav aria-label="Main navigation">
        {primaryNavItems.map(([label, href]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </nav>
      <div className="header-actions">
        <SocialLinks compact label="Social links" />
        <button
          className="theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch site and app previews to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch site and app previews to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <IconGlyph type={theme === "dark" ? "sun" : "moon"} />
        </button>
        <a className="header-cta" href={APP_BASE_URL}>
          Open app
        </a>
      </div>
    </header>
  );
}

function SocialLinks({ compact = false, label = "Follow Anewluv" }) {
  return (
    <div className={`social-links${compact ? " compact" : ""}`} aria-label={label}>
      {!compact ? <span>Follow</span> : null}
      {socialLinks.map(([name, href, icon]) => (
        <a href={href} key={name} rel="noreferrer" target="_blank" title={`Anewluv on ${name}`}>
          <SocialBrandIcon type={icon} />
          <span>{name}</span>
        </a>
      ))}
    </div>
  );
}

function SocialBrandIcon({ type }) {
  if (type === "tiktok") {
    return (
      <svg className="social-brand-icon tiktok-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path className="tiktok-cyan" d="M14.7 4.1v9.9a4.9 4.9 0 1 1-4.9-4.9c.4 0 .8 0 1.1.1v2.8a2.1 2.1 0 1 0 1.2 1.9V2.6h2.6Z" />
        <path className="tiktok-pink" d="M16.3 5.5c.8 1.6 2.2 2.7 4 3v2.9c-2.2-.1-4.2-1-5.6-2.5V5.5Z" />
        <path className="tiktok-dark" d="M14.7 2.6c.5 2.7 2.3 4.7 5.6 5.2v2.9c-2.1-.1-4-1-5.6-2.4V14a4.9 4.9 0 1 1-4.9-4.9c.4 0 .8 0 1.1.1v2.8a2.1 2.1 0 1 0 1.2 1.9V2.6h2.6Z" />
      </svg>
    );
  }

  return (
    <svg className="social-brand-icon x-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M17.4 3h3.1l-6.8 7.8 8 10.2h-6.2l-4.9-6.2L5 21H1.9l7.3-8.3L1.5 3h6.4l4.4 5.7L17.4 3Zm-1.1 16.2H18L7 4.7H5.1l11.2 14.5Z" />
    </svg>
  );
}

function HomePage() {
  const discoverPreview = useDiscoverPreview();
  const links = discoverPreview.links;
  const [selectedHeart, setSelectedHeart] = React.useState(null);

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-logo-lockup" aria-hidden="true">
            <span className="logo-pulse" />
            <img src={logoSrc} alt="" />
          </div>
          <p className="eyebrow">Dating and social networking</p>
          <h1>Find meaningful connections with Anewluv</h1>
          <p>
            Meet people through colorful profiles, better discovery, personality
            context, media, messaging, and premium app features built for modern
            dating.
          </p>
          <div className="action-row">
            <a className="button primary" href={links.home}>
              Open the app
            </a>
            <a className="button secondary" href="/pricing">
              View pricing
            </a>
          </div>
          <div className="hero-card-row" aria-label="Quick actions">
            {heroCards.map((card) => (
              <a
                className="hero-action-card"
                href={resolvePreviewLink(links, card.linkKey)}
                key={card.title}
              >
                <span className={`hero-icon ${card.icon}`} aria-hidden="true">
                  <IconGlyph type={card.icon} />
                </span>
                <span className="hero-card-text">
                  <small>{card.label}</small>
                  <strong>{card.title}</strong>
                  <span>{card.body}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
        <HeroHeartScatter
          links={links}
          onSelect={setSelectedHeart}
          profiles={discoverPreview.profiles}
        />
        <AppShowcase onHeartSelect={setSelectedHeart} preview={discoverPreview} />
      </section>

      <WhyAnewluvSection links={links} profiles={discoverPreview.profiles} />

      <AppExperienceSection
        links={links}
        previewProfiles={discoverPreview.previewProfiles}
        profiles={discoverPreview.profiles}
        screens={discoverPreview.screens}
      />

      <PlanComparisonSection links={links} />

      <ContactSection />
      <HeartProfileModal links={links} onClose={() => setSelectedHeart(null)} profile={selectedHeart} />
    </main>
  );
}

function WhyAnewluvSection({ links, profiles = [] }) {
  const pool = previewPool(profiles);
  const primary = pool[0] || null;
  const secondary = pool.find((profile) => profile.id !== primary?.id) || pool[1] || null;
  const tertiary = pool.find((profile) => profile.id !== primary?.id && profile.id !== secondary?.id) || pool[2] || null;
  const chips = primary?.chips?.length ? primary.chips : ["Coffee", "Travel", "Fitness", "Music"];
  const featureTiles = [
    ["Discover", "Profile cards show photos, match context, and interests before the first tap.", "search"],
    ["Daily matches", "Fresh profile picks and daily app bonuses keep discovery moving.", "spark"],
    ["Personality", "Section answers add context for prompts, profile detail, and better openers.", "chat"],
    ["Hearts", "Use app credit on boosts, super-likes, extra swipes, message openings, and passes.", "heart"],
    ["Safety", "Report, block, privacy, and support actions stay close to member interactions.", "shield"],
    ["Profile detail", "Open the full profile for prompts, vibe, lifestyle, safety context, and next actions.", "person"],
    ["Plus value", "Anewluv Plus starts at $4.99/week instead of burying useful controls behind a heavy upgrade path.", "card"],
    ["Premium clarity", "Premium is listed at $14.99/month with likes visibility, advanced filters, boosts, and priority tools.", "spark"],
    ["Points into perks", "Sign-ins, messages, photos, prompts, and profile work earn points toward boosts and message openers.", "heart"],
    ["Robust profiles", "Photos, prompts, personality, interests, and profile depth make each member feel less generic.", "edit"],
  ];

  return (
    <section className="section app-proof-section">
      <div className="app-proof-copy">
        <p className="eyebrow">Why Anewluv</p>
        <h2>Profiles, perks, chat, and safety in one app flow.</h2>
        <p>
          Anewluv connects the pieces members use every day: discovery cards,
          profile depth, personality context, chat, Hearts, premium tools, and
          clear safety controls.
        </p>
        <div className="app-proof-people-card">
          <img src={lifestyleImages.friends} alt="" />
          <div>
            <strong>Matching that has context</strong>
            <p>
              Daily recommendations combine profile details, personality
              sections, interests, and app activity so members see more than a
              random swipe stack.
            </p>
          </div>
        </div>
        <div className="app-proof-feature-grid">
          {featureTiles.map(([title, body, icon]) => (
            <article key={title}>
              <span><IconGlyph type={icon} /></span>
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="app-proof-actions">
          <a className="button primary" href={links.home}>Open the app</a>
          <a className="button secondary" href="/pricing">View perks and pricing</a>
        </div>
      </div>

      <div className="app-proof-studio" aria-label="Anewluv app feature preview">
        <article className="app-proof-photo-card app-proof-photo-card-one">
          <img src={lifestyleImages.cafe} alt="" />
          <span>Real app moments</span>
        </article>
        <article className="app-proof-phone" aria-label="Discover profile preview">
          <div className="app-proof-phone-top">
            <img src={logoSrc} alt="" />
            <strong>Discover</strong>
            <span>PLUS</span>
          </div>
          <div className="app-proof-profile-card">
            <img src={profilePhoto(primary, lifestyleImages.friends)} alt="" />
            <div className="app-proof-profile-shade" />
            <div className="app-proof-action-rail">
              {["heart", "star", "close", "bolt"].map((icon) => (
                <span key={icon}><IconGlyph type={icon} /></span>
              ))}
            </div>
            <div className="app-proof-profile-copy">
              <span>{primary?.compat || 84}% match</span>
              <h3>{profileNameAge(primary, "Anewluv member, 30")}</h3>
              <p>{profileLocation(primary)}</p>
              <div>
                {chips.slice(0, 4).map((chip) => <em key={chip}>{chip}</em>)}
              </div>
            </div>
          </div>
          <div className="app-proof-bottom-nav">
            {["home", "heart", "users", "chat", "search", "person"].map((icon, index) => (
              <span className={index === 0 ? "active" : ""} key={icon}><IconGlyph type={icon} /></span>
            ))}
          </div>
        </article>

        <article className="app-proof-panel app-proof-rewards-panel">
          <div className="app-proof-panel-head">
            <span><IconGlyph type="heart" /></span>
            <strong>Hearts and perks</strong>
          </div>
          <div className="app-proof-points-card">
            <small>Available app credit</small>
            <strong>18,420</strong>
            <em>Hearts</em>
          </div>
          {[
            ["Boost", "Profile visibility"],
            ["Super-like", "Stand out"],
            ["Premium pass", "Try advanced tools"],
          ].map(([title, body], index) => (
            <div className="app-proof-perk-row" key={title}>
              <span>{index + 1}</span>
              <div><strong>{title}</strong><small>{body}</small></div>
              <em>{[250, 120, 900][index]}</em>
            </div>
          ))}
        </article>

        <article className="app-proof-panel app-proof-personality-screen-card">
          <div className="app-proof-mini-top">
            <img src={logoSrc} alt="" />
            <strong>Personality</strong>
            <span><IconGlyph type="moon" /></span>
          </div>
          <div className="app-proof-personality-hero-card">
            <small>Profile depth</small>
            <strong>64%</strong>
            <p>Sections add context to prompts, matching, and better openers.</p>
            <i />
          </div>
          <div className="app-proof-personality-list">
            {[
              ["Background", "Complete", "check"],
              ["Personality", "In progress", "spark"],
              ["Attachment", "Last opened", "heart"],
              ["Love language", "Needs detail", "chat"],
            ].map(([title, status, icon], index) => (
              <div className={index === 2 ? "active" : ""} key={title}>
                <span><IconGlyph type={icon} /></span>
                <div><strong>{title}</strong><small>{status}</small></div>
                <em>{index === 0 ? "5/5" : index === 1 ? "14/18" : index === 2 ? "8/12" : "6/10"}</em>
              </div>
            ))}
          </div>
          <div className="app-proof-personality-question">
            <small>Open section</small>
            <strong>How do you prefer someone checks in?</strong>
            <span>Small check-ins during the day.</span>
          </div>
        </article>

        <article className="app-proof-panel app-proof-chat-panel">
          <div className="app-proof-panel-head">
            <img src={profilePhoto(secondary, lifestyleImages.cafe)} alt="" />
            <div><strong>{secondary?.name || "Match"}</strong><small>{secondary?.compat || 77}% match</small></div>
          </div>
          <p className="bubble them">Your profile prompts actually helped.</p>
          <p className="bubble me">Same. I noticed the personality section first.</p>
          <div className="app-proof-composer"><span>Message...</span><strong>Send</strong></div>
        </article>

        <article className="app-proof-photo-card app-proof-photo-card-two">
          <img src={lifestyleImages.park} alt="" />
          <span>Couples and community</span>
        </article>

        <article className="app-proof-panel app-proof-personality-panel">
          <div className="app-proof-panel-head">
            <span><IconGlyph type="spark" /></span>
            <strong>Profile depth</strong>
          </div>
          <div className="app-proof-progress">
            <strong>64%</strong>
            <span><i /></span>
          </div>
          <div className="app-proof-section-pills">
            {["Background", "Personality", "Attachment", "Love language"].map((item, index) => (
              <span className={index === 2 ? "active" : ""} key={item}>{item}</span>
            ))}
          </div>
        </article>

        <article className="app-proof-panel app-proof-safety-panel">
          <div className="app-proof-panel-head">
            <span><IconGlyph type="shield" /></span>
            <strong>Safety nearby</strong>
          </div>
          <div className="app-proof-safety-row"><IconGlyph type="block" /><span>Block user</span></div>
          <div className="app-proof-safety-row"><IconGlyph type="report" /><span>Report profile</span></div>
          <div className="app-proof-safety-row"><IconGlyph type="chat" /><span>Support and appeals</span></div>
        </article>

        <div className="app-proof-floating-member">
          <img src={profilePhoto(tertiary, lifestyleImages.park)} alt="" />
          <div>
            <span>Live preview data</span>
            <strong>{tertiary?.name || "Anewluv member"}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function useThemeMode() {
  const [theme, setTheme] = React.useState(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // The system preference fallback is enough if storage is unavailable.
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  });

  React.useEffect(() => {
    applySiteTheme(theme);
  }, [theme]);

  const toggleTheme = React.useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      applySiteTheme(next);
      return next;
    });
  }, []);

  return [theme, toggleTheme];
}

function useDiscoverPreview() {
  const [state, setState] = React.useState({
    generatedAt: "",
    links: defaultPreviewLinks,
    previewProfiles: [],
    profiles: [],
    screens: [],
    source: "loading",
    status: "loading",
  });

  React.useEffect(() => {
    const controller = new AbortController();
    const refreshId = getAppPreviewRefreshId();
    const cached = readCachedPreviewPayload(refreshId);
    if (cached) {
      setState({
        ...normalizeDiscoverPreview(cached),
        status: "ready",
      });
      return () => controller.abort();
    }
    const url = new URL(APP_PREVIEW_ENDPOINT, window.location.href);
    url.searchParams.set("refresh_id", refreshId);
    const timezone = getAppPreviewTimezone();
    if (timezone) url.searchParams.set("timezone", timezone);

    async function loadPreview() {
      try {
        const response = await fetch(url.href, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "homepage_profiles_unavailable");
        }
        writeCachedPreviewPayload(payload, refreshId);
        setState({
          ...normalizeDiscoverPreview(payload),
          status: "ready",
        });
      } catch (error) {
        if (error?.name === "AbortError") return;
        setState({
          generatedAt: "",
          links: defaultPreviewLinks,
          previewProfiles: [],
          profiles: [],
          screens: [],
          source: "error",
          status: "error",
        });
      }
    }

    loadPreview();
    return () => controller.abort();
  }, []);

  return state;
}

function normalizeDiscoverPreview(payload) {
  const links = {
    ...defaultPreviewLinks,
    ...(payload?.links || {}),
    home: defaultPreviewLinks.home,
    pricing: "/pricing",
  };
  const profiles = Array.isArray(payload?.profiles)
    ? payload.profiles.map(normalizePreviewProfile).filter(Boolean).slice(0, 8)
    : [];
  const previewProfiles = Array.isArray(payload?.previewProfiles)
    ? payload.previewProfiles.map(normalizePreviewProfile).filter(Boolean).slice(0, 8)
    : profiles;

  return {
    generatedAt: payload?.generatedAt || "",
    links,
    previewProfiles,
    profiles,
    screens: Array.isArray(payload?.screens) ? payload.screens.map(normalizePreviewScreen) : [],
    source: payload?.source || (profiles.length ? "live" : "unconfigured"),
  };
}

function normalizePreviewScreen(screen) {
  return {
    appUrl: String(screen?.appUrl || screen?.url || "").trim(),
    key: String(screen?.key || screen?.id || "").trim(),
    label: String(screen?.label || "").trim(),
    route: String(screen?.route || "").trim(),
    screenshotUrl: String(screen?.screenshotUrl || screen?.imageUrl || "").trim(),
    title: String(screen?.title || screen?.label || "").trim(),
  };
}

function normalizePreviewProfile(profile) {
  if (!profile?.id && !profile?.appUrl) return null;
  return {
    age: profile.age ?? null,
    appUrl: profile.appUrl || defaultPreviewLinks.home,
    bio: String(profile.bio || "").trim(),
    chips: normalizeLabelList(profile.chips || profile.interests).slice(0, 4),
    city: String(profile.city || "").trim(),
    compat: clampPercent(profile.compat),
    country: String(profile.country || "").trim(),
    distanceMiles: Number.isFinite(Number(profile.distanceMiles))
      ? Math.round(Number(profile.distanceMiles))
      : null,
    id: profile.id,
    interests: normalizeLabelList(profile.interests || profile.chips).slice(0, 6),
    job: String(profile.job || "").trim(),
    location: String(profile.location || "").trim(),
    name: String(profile.name || "Anewluv member").trim(),
    photoUrl: String(profile.photoUrl || "").trim(),
    photos: Array.isArray(profile.photos) ? profile.photos.filter(Boolean).slice(0, 6) : [],
    prompts: Array.isArray(profile.prompts) ? profile.prompts.slice(0, 2) : [],
    tier: String(profile.tier || "").trim(),
  };
}

function normalizeLabelList(values) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map((item) => {
          if (typeof item === "string") return item;
          return item?.label || item?.name || item?.title || "";
        })
        .map((item) => String(item).trim())
        .filter(Boolean),
    ),
  ];
}

function clampPercent(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return 0;
  return Math.max(0, Math.min(100, Math.round(next)));
}

function resolvePreviewLink(links, key) {
  return links?.[key] || defaultPreviewLinks[key] || defaultPreviewLinks.home;
}

function appEmbedUrl(url) {
  const next = new URL(url || defaultPreviewLinks.home, window.location.href);
  next.searchParams.set("embed", "marketing");
  next.searchParams.set("theme", getCurrentSiteTheme());
  return next.href;
}

function shuffledProfiles(values) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function profileGenderKey(profile) {
  return String(profile?.genderKey || profile?.gender || "unknown").toLowerCase();
}

function selectHeartProfiles(profiles = [], limit = 5) {
  const photoProfiles = profiles.filter((profile) => profile?.photoUrl);
  const source = photoProfiles.length ? photoProfiles : profiles.filter(Boolean);
  const groups = new Map();

  shuffledProfiles(source).forEach((profile) => {
    const key = profileGenderKey(profile);
    const group = groups.get(key) || [];
    group.push(profile);
    groups.set(key, group);
  });

  const orderedGroups = shuffledProfiles([...groups.values()]).map(shuffledProfiles);
  const selected = [];

  while (selected.length < limit && orderedGroups.some((group) => group.length)) {
    orderedGroups.forEach((group) => {
      if (selected.length < limit && group.length) selected.push(group.shift());
    });
  }

  return selected;
}

function HeroHeartScatter({ links, onSelect, profiles }) {
  const fallbackHearts = [
    { id: "hero-discover", label: "Discover", appUrl: links.discover },
    { id: "hero-profile", label: "Profile", appUrl: links.myProfile },
    { id: "hero-personality", label: "Personality", appUrl: links.personality },
    { id: "hero-rewards", label: "Perks", appUrl: links.rewards },
    { id: "hero-open", label: "Open app", appUrl: links.home },
  ];
  const visibleProfiles = React.useMemo(() => selectHeartProfiles(profiles, 5), [profiles]);
  const hearts = visibleProfiles.length >= 3 ? visibleProfiles : fallbackHearts;

  return (
    <div className="hero-heart-scatter" aria-label="Anewluv quick profile shortcuts">
      {hearts.slice(0, 5).map((profile, index) => (
        <button
          className={`floating-heart hero-orbit-heart hero-orbit-${index + 1}`}
          type="button"
          key={profile.id || profile.name || profile.label}
          onClick={() => onSelect(profile)}
          aria-label={`Preview ${profile.name || profile.label} in Anewluv`}
        >
          <HeartSvg profile={profile} id={`hero-heart-${index}`} />
          <span>
            {profile.name || profile.label}
            {profile.compat ? <strong> {profile.compat}%</strong> : null}
          </span>
        </button>
      ))}
    </div>
  );
}

function FloatingHeartField({ links, onSelect, profiles }) {
  const fallbackHearts = [
    { id: "open-app", label: "Open app", appUrl: links.home },
    { id: "discover", label: "Discover", appUrl: links.discover },
    { id: "personality", label: "Personality", appUrl: links.personality },
    { id: "pricing", label: "Pricing", appUrl: links.pricing },
  ];
  const visibleProfiles = React.useMemo(() => selectHeartProfiles(profiles, 4), [profiles]);
  const hearts = visibleProfiles.length ? visibleProfiles : fallbackHearts;

  return (
    <div className="showcase-heart-field" aria-label="Anewluv app shortcuts">
      {hearts.map((profile, index) => (
        <button
          className={`floating-heart heart-${index + 1}`}
          type="button"
          key={profile.id || profile.name || profile.label}
          onClick={() => onSelect(profile)}
          aria-label={`Preview ${profile.name || profile.label} in Anewluv`}
        >
          <HeartSvg profile={profile} id={`float-heart-${index}`} />
          <span>
            {profile.name || profile.label}
            {profile.compat ? <strong> {profile.compat}%</strong> : null}
          </span>
        </button>
      ))}
    </div>
  );
}

function HeartSvg({ profile, id }) {
  const clipId = `${id}-clip`;
  const hasPhoto = Boolean(profile.photoUrl);
  return (
    <svg viewBox="0 0 100 100" focusable="false">
      <defs>
        <clipPath id={clipId}>
          <path d="M50,92 C18,72 2,50 2,30 C2,13 14,4 27,4 C37,4 45,10 50,18 C55,10 63,4 73,4 C86,4 98,13 98,30 C98,50 82,72 50,92 Z" />
        </clipPath>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffc2dd" />
          <stop offset="100%" stopColor="#e52f7e" />
        </linearGradient>
      </defs>
      <path
        d="M50,92 C18,72 2,50 2,30 C2,13 14,4 27,4 C37,4 45,10 50,18 C55,10 63,4 73,4 C86,4 98,13 98,30 C98,50 82,72 50,92 Z"
        fill={`url(#${id}-rim)`}
      />
      {hasPhoto ? (
        <image
          href={profile.photoUrl}
          x="5"
          y="5"
          width="90"
          height="86"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <>
          <circle cx="50" cy="42" r="15" fill="rgba(255,255,255,0.9)" />
          <path
            d="M23 78c6-14 18-22 27-22s21 8 27 22"
            fill="rgba(255,255,255,0.76)"
          />
        </>
      )}
      <path
        d="M50,92 C18,72 2,50 2,30 C2,13 14,4 27,4 C37,4 45,10 50,18 C55,10 63,4 73,4 C86,4 98,13 98,30 C98,50 82,72 50,92 Z"
        fill="none"
        stroke="rgba(255,255,255,0.86)"
        strokeWidth="2"
      />
    </svg>
  );
}

function AppShowcase({ onHeartSelect, preview }) {
  const links = preview.links || defaultPreviewLinks;
  const profiles = preview.profiles || [];
  const frames = [
    {
      className: "discover-preview",
      href: links.discover,
      label: "Discover",
      loading: "eager",
      surfaceKey: "discover",
      title: "Anewluv Discover app page",
      usePublicProfiles: true,
    },
    {
      className: "home-preview",
      href: links.home || defaultPreviewLinks.home,
      label: "app.anewluv",
      loading: "lazy",
      surfaceKey: "home",
      title: "Anewluv app home page",
    },
    {
      className: "myprofile-preview",
      href: links.myProfile || links.editProfile,
      label: "My Profile",
      loading: "lazy",
      surfaceKey: "profile",
      title: "Anewluv My Profile app page",
    },
  ];

  return (
    <div className="app-showcase" aria-label="Embedded Anewluv app pages">
      <FloatingHeartField links={links} onSelect={onHeartSelect} profiles={profiles} />
      {frames.map((frame) => (
        <PhoneFrame
          {...frame}
          key={frame.label}
          profiles={profiles}
        />
      ))}
    </div>
  );
}

function PhoneFrame({ className, href, label, profiles = [], surfaceKey }) {
  return (
    <div className={`phone-frame ${className}`}>
      <div className="phone-topbar">
        <img src={logoSrc} alt="" />
        <span>{label}</span>
        <a href={href}>Open</a>
      </div>
      <div className="app-embed-shell">
        <LiveOrPreviewSurface
          forceLive={surfaceKey === "home" && USE_LIVE_HOME_EMBED}
          href={href}
          label={label}
          profiles={profiles}
          title={`${label} app preview`}
          variant={surfaceKey || className}
        />
      </div>
    </div>
  );
}

function screenShotSlug(variant, label) {
  const raw = String(variant || label || "app").replace(/([a-z])([A-Z])/g, "$1-$2");
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";
}

function screenShotUrlFor(variant, label) {
  return `${APP_SCREENSHOT_BASE_URL}/${screenShotSlug(variant, label)}.png`;
}

function internalPreviewUrlFor(variant, label) {
  const url = new URL(`/preview/${screenShotSlug(variant, label)}`, window.location.href);
  const refreshId = getAppPreviewRefreshId();
  url.searchParams.set("session_id", refreshId);
  url.searchParams.set("refresh_id", refreshId);
  url.searchParams.set("theme", getCurrentSiteTheme());
  url.searchParams.set("density", "2");
  const timezone = getAppPreviewTimezone();
  if (timezone) url.searchParams.set("timezone", timezone);
  return url.href;
}

function LiveOrPreviewSurface({ forceLive = false, href, label, profiles, screenshotUrl, title, variant }) {
  if (forceLive || USE_LIVE_APP_EMBEDS) {
    return (
      <div className="app-embed-stage">
        <iframe
          className="app-embed"
          src={appEmbedUrl(href)}
          title={title}
          loading="eager"
        />
        <div aria-hidden="true" className="app-embed-loader">
          <img src={logoSrc} alt="" />
          <span>{label}</span>
          <strong>Loading app screen</strong>
        </div>
      </div>
    );
  }
  if (USE_INTERNAL_PREVIEW_IFRAMES) {
    const hasPreviewPayload = profiles.length > 0 || Boolean(readCachedPreviewPayload(getAppPreviewRefreshId()));
    if (!hasPreviewPayload) {
      return (
        <div className="app-embed-stage">
          <div aria-hidden="true" className="app-embed-loader">
            <img src={logoSrc} alt="" />
            <span>{label}</span>
            <strong>Loading app screen</strong>
          </div>
        </div>
      );
    }
    return (
      <div className="app-embed-stage high-res-preview">
        <iframe
          className="app-embed app-preview-iframe"
          src={internalPreviewUrlFor(variant, label)}
          title={title}
          loading="eager"
        />
      </div>
    );
  }
  if (USE_APP_SCREENSHOTS) {
    return (
      <ScreenshotPreviewSurface
        fallback={<AppSurfacePreview label={label} profiles={profiles} variant={variant} />}
        label={label}
        screenshotUrl={screenshotUrl || screenShotUrlFor(variant, label)}
      />
    );
  }
  return <AppSurfacePreview label={label} profiles={profiles} variant={variant} />;
}

function PreviewFramePage({ screenKey }) {
  const preview = useDiscoverPreview();
  const variant = variantFromPreviewKey(screenKey);
  const highDensity = new URLSearchParams(window.location.search).get("density") === "2";
  React.useEffect(() => {
    applySiteTheme(getCurrentSiteTheme());
  }, []);
  const item =
    appTourItems.find((entry) => entry.variant === variant || screenShotSlug(entry.variant, entry.label) === screenKey) ||
    appTourItems.find((entry) => entry.type === "phone") ||
    {};

  return (
    <main className={`preview-frame-page${highDensity ? " high-density-preview" : ""}`}>
      <AppSurfacePreview
        label={item.label || variant}
        profiles={preview.profiles}
        variant={variant}
      />
    </main>
  );
}

function variantFromPreviewKey(screenKey) {
  const normalized = String(screenKey || "").toLowerCase();
  if (normalized === "profile-detail") return "profileDetail";
  if (normalized === "edit-profile") return "editProfile";
  if (normalized === "my-profile") return "profile";
  return normalized.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function ScreenshotPreviewSurface({ fallback, label, screenshotUrl }) {
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [screenshotUrl]);

  if (!screenshotUrl || failed) return fallback;

  return (
    <div className="app-screenshot-surface">
      <img alt={`${label} app preview`} onError={() => setFailed(true)} src={screenshotUrl} />
    </div>
  );
}

function profileNameAge(profile, fallback = "Profile") {
  if (!profile) return fallback;
  return `${profile.name || "Anewluv member"}${profile.age ? `, ${profile.age}` : ""}`;
}

function profileLocation(profile) {
  if (!profile) return "New York, United States";
  return profile.location || [profile.city, profile.country].filter(Boolean).join(", ") || "New York, United States";
}

function profilePhoto(profile, fallback = lifestyleImages.friends) {
  return profile?.photoUrl || profile?.photos?.[0] || fallback;
}

function previewPool(profiles) {
  const withPhotos = profiles.filter((profile) => profile?.photoUrl);
  return withPhotos.length ? withPhotos : profiles;
}

function profileIdentity(profile) {
  return String(profile?.id || profile?.user_id || profile?.name || profile?.photoUrl || "");
}

function sameProfile(left, right) {
  if (!left || !right) return false;
  const leftKey = profileIdentity(left);
  const rightKey = profileIdentity(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

function uniquePreviewPool(profiles) {
  const seen = new Set();
  return previewPool(profiles).filter((profile) => {
    const key = profileIdentity(profile);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function DiscoverPreviewScreen({ chips = [], profile }) {
  const [notice, setNotice] = React.useState("");
  const displayChips = [
    `${profile?.distanceMiles ?? 234} mi away`,
    profileLocation(profile),
    ...(chips.length ? chips : ["Creative", "Outdoors", "Music", "Travel"]),
  ].filter(Boolean);
  const handleAction = (action) => {
    const messages = {
      bolt: "Boost preview opened. Members can use app credit for profile visibility.",
      close: "Skipped this preview profile.",
      heart: "Like saved. Sign in to match from Discover.",
      info: "Open the full profile for prompts and details.",
      star: "Super-like preview selected.",
      timer: "Daily match timer and fresh picks are visible here.",
    };
    setNotice(messages[action] || "Discover action selected.");
  };

  return (
    <div className="app-surface-preview real-app-screen real-discover-screen">
      <img className="real-discover-photo" src={profilePhoto(profile, lifestyleImages.cafe)} alt="" />
      <div className="real-discover-topbar">
        <button aria-label="Open Discover settings" type="button"><IconGlyph type="gear" /></button>
        <button aria-label="Open Discover usage" className="real-discover-usage" type="button">
          <IconGlyph type="filter" />
          <strong>Usage</strong>
          <span>{profile?.compat ? Math.max(1, Math.round(profile.compat / 6)) : 14}/15</span>
          <em><IconGlyph type="bolt" /> 2 boosts</em>
          <IconGlyph type="arrow" />
        </button>
        <button aria-label="Report a bug" type="button"><IconGlyph type="bug" /></button>
        <button aria-label="Toggle dark mode" type="button"><IconGlyph type="moon" /></button>
      </div>
      <div className="real-action-rail" aria-label="Discover actions">
        {["heart", "star", "close", "timer", "info", "bolt"].map((item) => (
          <button
            aria-label={`Preview ${item} action`}
            key={item}
            onClick={() => handleAction(item)}
            type="button"
          >
            <IconGlyph type={item} />
          </button>
        ))}
      </div>
      {notice ? <div className="real-discover-toast">{notice}</div> : null}
      <div className="real-discover-info">
        <button className="real-match-pill" onClick={() => handleAction("info")} type="button">
          <IconGlyph type="heart" /> {profile?.compat || 80}% match <IconGlyph type="arrow" />
        </button>
        <h3>{profileNameAge(profile, "Anewluv member, 30")}</h3>
        <p>
          <span className="real-location-pin" /> {displayChips[0] || "Nearby"} &bull; {profileLocation(profile)}
          <br />
          {profile?.bio || "Big on travel, playlists, and people who can laugh at themselves."}
        </p>
        <div className="real-chip-row">
          {displayChips.slice(2, 5).map((chip) => <span key={chip}>{chip}</span>)}
        </div>
      </div>
    </div>
  );
}

function AppTopChrome({ back = false, title }) {
  return (
    <div className="real-app-topbar">
      <span className="real-app-round real-app-score">
        {back ? <IconGlyph type="back" /> : <><IconGlyph type="heart" /> <b>5k</b></>}
      </span>
      <span className="real-app-plus">PLUS</span>
      <strong>{title}</strong>
      <span className="real-app-round"><IconGlyph type="bug" /></span>
      <span className="real-app-round"><IconGlyph type="moon" /></span>
    </div>
  );
}

function AppBottomNav({ active = "home" }) {
  return (
    <div className="real-app-bottom-nav">
      {[
        ["home", "home"],
        ["likes", "heart"],
        ["matches", "users"],
        ["chat", "chat"],
        ["search", "search"],
        ["profile", "person"],
      ].map(([key, icon]) => (
        <span className={active === key ? "active" : ""} key={key}>
          <IconGlyph type={icon} />
          {key === "matches" ? <em>20</em> : key === "likes" ? <em>1</em> : null}
        </span>
      ))}
    </div>
  );
}

function AppSurfacePreview({ label, profiles = [], variant }) {
  const allProfiles = uniquePreviewPool(profiles);
  const isDiscover = variant?.includes("discover");
  const isSearch = variant?.includes("search") || /search|browse/i.test(label);
  const isMatches = variant?.includes("matches") || /match/i.test(label);
  const isChat = variant?.includes("chat");
  const isModeration = variant?.includes("moderation") || /moderation|block|report/i.test(label);
  const isEditProfile = /edit[-]?profile/i.test(variant) || /edit/i.test(label);
  const isProfileDetail = /profile[-]?detail/i.test(variant);
  const isProfile = !isEditProfile && !isProfileDetail && (variant?.includes("profile") || /profile/i.test(label));
  const isPersonality = variant?.includes("personality") || /personality/i.test(label);
  const isRewards = /reward|perk/i.test(label) || variant?.includes("rewards");
  const isUpgrade = variant?.includes("upgrade") || /upgrade/i.test(label);
  const isEntitlements = variant?.includes("entitlements") || /entitlement/i.test(label);
  const isBilling = /membership|billing/i.test(label) || variant?.includes("billing");
  const isSettings = /settings|safety/i.test(label) || variant?.includes("settings");
  const isPersonalSurface =
    isProfile ||
    isEditProfile ||
    isPersonality ||
    isRewards ||
    isUpgrade ||
    isEntitlements ||
    isBilling ||
    isSettings;
  const viewerProfile = allProfiles[1] || allProfiles[0] || null;
  const matchProfiles = viewerProfile
    ? allProfiles.filter((profile) => !sameProfile(profile, viewerProfile))
    : allProfiles;
  const pool = isPersonalSurface && viewerProfile
    ? [viewerProfile, ...matchProfiles]
    : matchProfiles.length
      ? matchProfiles
      : allProfiles;
  const primary = pool[0] || null;
  const secondary = pool.find((profile) => !sameProfile(profile, primary)) || pool[1] || null;
  const tertiary =
    pool.find((profile) => !sameProfile(profile, primary) && !sameProfile(profile, secondary)) ||
    pool[2] ||
    null;
  const chips = primary?.chips?.length ? primary.chips : ["Animals", "Gardening", "Nature"];

  if (isDiscover) {
    return (
      <DiscoverPreviewScreen chips={chips} profile={primary} />
    );
  }

  if (isSearch) {
    const cards = pool.slice(0, 9);
    return (
      <div className="app-surface-preview real-app-screen real-list-screen">
        <AppTopChrome title="BROWSE" />
        <div className="real-list-header">
          <span className="real-filter-icon"><IconGlyph type="filter" /></span>
          <strong>{cards.length || 20} matches</strong>
          <span className="real-bell"><IconGlyph type="bell" /></span>
        </div>
        <div className="real-search-grid">
          {(cards.length ? cards : [primary, secondary, tertiary, primary, secondary, tertiary]).slice(0, 9).map((profile, index) => (
            <div className="real-search-card" key={profile?.id || index}>
              <div className="real-search-photo">
                {profile?.photoUrl ? <img src={profilePhoto(profile)} alt="" /> : null}
                <span>{profile?.compat || [84, 77, 83, 80, 70, 42][index % 6]}</span>
              </div>
              <strong>{profileNameAge(profile, `Member ${index + 1}, ${28 + index}`)}</strong>
              <small>{profile?.city || "New York"}</small>
            </div>
          ))}
        </div>
        <AppBottomNav active="search" />
      </div>
    );
  }

  if (isMatches) {
    const matchCards = pool.slice(0, 4);
    return (
      <div className="app-surface-preview real-app-screen real-matches-screen">
        <AppTopChrome back title="MATCHES" />
        <div className="real-segmented"><span>Active</span><strong>New (20)</strong><span>All</span></div>
        <h4><i /> NEW - 20</h4>
        <div className="real-match-scroll">
          {(matchCards.length ? matchCards : [primary, secondary]).slice(0, 2).map((profile, index) => (
            <div className="real-match-card" key={profile?.id || index}>
              <span>NEW</span>
              <em>{profile?.compat || 88}%</em>
              {profile?.photoUrl ? <img src={profilePhoto(profile)} alt="" /> : null}
              <strong>{profileNameAge(profile, index ? "Ana, 30" : "Ruby, 31")}</strong>
              <small>{profile?.compat || 88}% match</small>
            </div>
          ))}
        </div>
        <h3>New Matches</h3>
        <p className="real-muted">People who matched with you and have not started chatting yet.</p>
        {(matchCards.length ? matchCards : [primary, secondary]).slice(0, 3).map((profile, index) => (
          <div className="real-match-row" key={profile?.id || index}>
            <img src={profilePhoto(profile, lifestyleImages.cafe)} alt="" />
            <div><strong>{profileNameAge(profile, index ? "Ana, 30" : "Ruby, 31")}</strong><small>{profile?.tier || "excellent"}</small></div>
            <span>3w</span>
          </div>
        ))}
        <AppBottomNav active="matches" />
      </div>
    );
  }

  if (isChat) {
    return (
      <div className="app-surface-preview real-app-screen real-chat-screen">
        <AppTopChrome back title="CHAT" />
        <div className="real-chat-peer">
          <img src={profilePhoto(primary, lifestyleImages.cafe)} alt="" />
          <div><strong>{primary?.name || "Ruby"}</strong><small>{primary?.compat || 84}% match</small></div>
          <span><IconGlyph type="dots" /></span>
        </div>
        <div className="real-chat-thread">
          <p className="them">Your profile caught my eye. The personality prompts actually helped.</p>
          <p className="me">Same here. I liked your travel photos.</p>
          <p className="them">Coffee this weekend?</p>
        </div>
        <div className="real-chat-composer"><span>Message...</span><strong>Send</strong></div>
        <AppBottomNav active="chat" />
      </div>
    );
  }

  if (isProfileDetail) {
    const displayChips = [
      "Prompts",
      "Vibe",
      "Lifestyle",
      "Safety",
      ...(chips.length ? chips : ["Music", "Travel"]),
    ].filter(Boolean);
    const detailCards = [
      ["Conversation starters", primary?.prompts?.[0]?.answer || primary?.bio || "Weekend warrior into outdoor spots."],
      ["Vibe", primary?.tier || "Warm, direct, and easy to talk to."],
      ["Lifestyle", chips[0] || "Coffee, walks, food, and live music."],
      ["Safety context", "Block, report, or return to Discover from the profile."],
    ];
    return (
      <div className="app-surface-preview real-app-screen real-profile-detail-screen">
        <AppTopChrome back title="PROFILE" />
        <div className="real-detail-actions"><span><IconGlyph type="search" /></span><span><IconGlyph type="heart" /></span></div>
        <div className="real-detail-photo">
          <img src={profilePhoto(primary, lifestyleImages.park)} alt="" />
          <h3>{profileNameAge(primary, "Profile")}</h3>
        </div>
        <div className="real-profile-tabs">
          {displayChips.slice(0, 4).map((chip, index) => (
            index === 0 ? <strong key={chip}>{chip}</strong> : <span key={chip}>{chip}</span>
          ))}
        </div>
        <div className="real-detail-section-grid">
          {detailCards.map(([title, body]) => (
            <div className="real-prompt-card" key={title}>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          ))}
        </div>
        <div className="real-detail-buttons"><span>Return</span><strong>Discover</strong></div>
      </div>
    );
  }

  if (isModeration) {
    return (
      <div className="app-surface-preview real-app-screen real-moderation-screen">
        <AppTopChrome back title="PROFILE" />
        <div className="real-detail-photo compact">
          <img src={profilePhoto(primary, lifestyleImages.park)} alt="" />
          <h3>{profileNameAge(primary, "Profile")}</h3>
        </div>
        <div className="real-bottom-sheet">
          <span className="sheet-handle" />
          <h3>Report or block</h3>
          <p>Choose a safety action for this member. Reports go to moderation review.</p>
          {["Block user", "Report profile", "Inappropriate photos", "Harassment or spam"].map((row, index) => (
            <div className="real-sheet-row" key={row}>
              <span><IconGlyph type={index === 0 ? "block" : "report"} /></span>
              <strong>{row}</strong>
              <em>{">"}</em>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isProfile) {
    return (
      <div className="app-surface-preview real-app-screen real-myprofile-screen">
        <img className="real-profile-bg" src={profilePhoto(primary, lifestyleImages.friends)} alt="" />
        <AppTopChrome title="" />
        <div className="real-profile-side">
          {["camera", "edit", "bolt", "gear", "exit"].map((item) => <span key={item}><IconGlyph type={item} /></span>)}
        </div>
        <div className="real-myprofile-copy">
          <h3>Your Screen Name<br />Here</h3>
          <p>{profileLocation(primary)}</p>
          <strong>Edit your profile to update your BIO and collect points</strong>
          <div className="real-reward-card">
            <span>NEW REWARDS</span><em>View points</em>
            <h4>Update your profile to collect points</h4>
            <p>Photos, prompts, interests, and profile details can turn into boosts and premium app experiences.</p>
          </div>
          <div className="real-personality-nudge-card">
            <span><IconGlyph type="spark" /></span>
            <div>
              <strong>Personality profile</strong>
              <p>Earn bonus points by filling out your personality profile and improve match context faster.</p>
            </div>
            <em><IconGlyph type="arrow" /></em>
          </div>
        </div>
        <AppBottomNav active="profile" />
      </div>
    );
  }

  if (isPersonality) {
    const sections = [
      ["Background", "5/5", "Complete"],
      ["Personality", "14/18", "In progress"],
      ["Attachment", "8/12", "Last opened"],
      ["Love language", "6/10", "Needs detail"],
    ];
    return (
      <div className="app-surface-preview real-app-screen real-personality-screen">
        <AppTopChrome back title="PERSONALITY" />
        <div className="real-personality-hero">
          <span>Profile depth</span>
          <strong>64%</strong>
          <p>Answer section prompts to add context for discovery, matches, and chat starters.</p>
          <i />
        </div>
        <div className="real-personality-grid">
          {sections.map(([name, progress, status], index) => (
            <article className={index === 2 ? "active" : ""} key={name}>
              <span><IconGlyph type={index === 0 ? "person" : index === 1 ? "spark" : index === 2 ? "heart" : "chat"} /></span>
              <strong>{name}</strong>
              <small>{progress} questions</small>
              <em>{status}</em>
            </article>
          ))}
        </div>
        <div className="real-open-section">
          <span>Attachment detail</span>
          <h3>How do you prefer someone checks in?</h3>
          <div className="real-answer-row"><strong>A</strong><p>Direct messages when plans change.</p></div>
          <div className="real-answer-row selected"><strong>B</strong><p>Small check-ins during the day.</p></div>
          <button type="button">Continue section</button>
        </div>
      </div>
    );
  }

  if (isEditProfile) {
    const thumbs = [primary, secondary, tertiary, ...pool].filter(Boolean).slice(0, 5);
    return (
      <div className="app-surface-preview real-app-screen real-edit-screen">
        <AppTopChrome back title="EDIT PROFILE" />
        <div className="real-edit-content">
          <div className="real-edit-title"><h3>My Photos</h3><strong>5/10 Edit</strong></div>
          <div className="real-photo-editor">
            <span>MAIN</span>
            <img src={profilePhoto(primary, lifestyleImages.cafe)} alt="" />
            <button>Add</button><button>X</button>
          </div>
          <div className="real-thumb-row">
            <span>Add</span>
            {thumbs.map((profile, index) => <img src={profilePhoto(profile)} alt="" key={profile.id || index} />)}
          </div>
          <p className="real-muted">Tap a thumbnail to preview it here. Use the star to make it main, or open Edit to add and manage photos.</p>
          <div className="real-points-card">
            <span>Q2 REWARDS - PROFILE POINTS</span>
            <strong>100 <em>/ 875 pts</em></strong>
            <b>11%</b>
            <i />
            <p>Update your profile to collect points. 775 points still available this quarter.</p>
          </div>
          <div className="real-public-row"><span><IconGlyph type="person" /></span><strong>View my public profile</strong><em>{">"}</em></div>
          <div className="real-edit-section open">
            <div><span><IconGlyph type="chat" /></span><strong>Prompts</strong><em>4/6</em></div>
            <p>"A perfect Sunday" and "What makes me laugh" are visible on profile detail.</p>
          </div>
          <div className="real-edit-section open">
            <div><span><IconGlyph type="spark" /></span><strong>Personality</strong><em>64%</em></div>
            <p>Background, attachment, values, and communication answers can improve profile context.</p>
          </div>
          <div className="real-edit-section">
            <div><span><IconGlyph type="heart" /></span><strong>Dating goals</strong><em>3/5</em></div>
          </div>
          <div className="real-edit-section">
            <div><span><IconGlyph type="camera" /></span><strong>Media</strong><em>5/10</em></div>
          </div>
        </div>
      </div>
    );
  }

  if (isRewards) {
    return (
      <div className="app-surface-preview real-app-screen real-rewards-screen">
        <AppTopChrome back title="Rewards" />
        <div className="real-rewards-hero">
          <div><span>Q2 Quality Season</span><span>36 days left</span></div>
          <p>Your season rank</p>
          <strong>#184 <em>Active</em></strong>
          <small>Top 18% with boosts, Premium passes, and reviewed app reward tiers on the ladder.</small>
        </div>
        <div className="real-metric-row"><div><span>Redeemable</span><strong>42</strong><small>pts</small></div><div><span>Lifetime</span><strong>1740</strong><small>pts</small></div></div>
        <div className="real-quality-card">
          <div><h3>Profile quality</h3><strong>11%</strong></div>
          <p>4/26 fields complete</p>
          <i />
          <section><span>NEXT BEST ACTION</span><strong>Add 3 or more photos</strong><em>+150 points</em></section>
        </div>
        <div className="real-reward-market">
          {[
            ["Boost", "Move your profile higher in discovery."],
            ["Super-like", "Stand out before the first message."],
            ["Chat open", "Start selected conversations sooner."],
          ].map(([name, body], index) => (
            <article key={name}>
              <span><IconGlyph type={index === 0 ? "bolt" : index === 1 ? "heart" : "chat"} /></span>
              <div><strong>{name}</strong><p>{body}</p></div>
              <em>{[250, 120, 90][index]} Hearts</em>
            </article>
          ))}
        </div>
        <div className="real-leaderboard-title"><h3>Leaderboard</h3><span>View board</span></div>
        <div className="real-board-row"><div>#1<br /><strong>Member ...</strong></div><div className="self">#184<br /><strong>You</strong></div><div>#500+<br /><strong>Active tier</strong></div></div>
      </div>
    );
  }

  if (isUpgrade) {
    return (
      <div className="app-surface-preview real-app-screen real-upgrade-screen">
        <AppTopChrome back title="UPGRADE" />
        <div className="real-upgrade-hero">
          <span>Recommended</span>
          <h3>Use rewards on the tools that fit your dating style.</h3>
          <p>Hearts and points can unlock app perks, short premium passes, and selected membership upgrades.</p>
        </div>
        <div className="real-upgrade-tabs"><strong>Hearts</strong><span>Points</span><span>Plans</span></div>
        {[
          ["Profile Boost", "Spend Hearts to increase profile visibility for a short window.", "250 Hearts"],
          ["Premium Day Pass", "Try advanced discovery and likes tools before choosing a plan.", "900 pts"],
          ["Premium Monthly", "Subscribe for unlimited likes, filters, and visibility tools.", "$14.99"],
          ["VIP Upgrade", "Priority visibility, read receipts, and VIP profile styling.", "$29.99"],
        ].map(([name, body, price], index) => (
          <article className="real-upgrade-row" key={name}>
            <span><IconGlyph type={index < 2 ? "spark" : "card"} /></span>
            <div><strong>{name}</strong><p>{body}</p></div>
            <em>{price}</em>
          </article>
        ))}
        <button className="real-upgrade-cta" type="button">Open membership options</button>
      </div>
    );
  }

  if (isEntitlements) {
    return (
      <div className="app-surface-preview real-app-screen real-entitlements-screen">
        <AppTopChrome back title="ENTITLEMENTS" />
        <div className="real-entitlements-hero">
          <img src={profilePhoto(primary, lifestyleImages.cafe)} alt="" />
          <div>
            <span>Member access</span>
            <h3>{primary?.name || "Preview member"}</h3>
            <p>{profileLocation(primary)}</p>
          </div>
        </div>
        <div className="real-entitlement-balance">
          <article><span>Hearts</span><strong>18,420</strong></article>
          <article><span>Points</span><strong>1,740</strong></article>
        </div>
        {[
          ["Premium", "Active monthly membership", "Renews in 18 days"],
          ["Boosts", "Profile visibility boosts", "3 available"],
          ["Super-likes", "High-intent likes", "12 available"],
          ["Profile review", "Manual profile quality review", "1 available"],
          ["Chat openers", "Start selected conversations sooner", "5 available"],
        ].map(([name, body, status], index) => (
          <article className="real-entitlement-row" key={name}>
            <span><IconGlyph type={index === 0 ? "card" : index === 1 ? "bolt" : index === 2 ? "heart" : index === 3 ? "check" : "chat"} /></span>
            <div><strong>{name}</strong><p>{body}</p></div>
            <em>{status}</em>
          </article>
        ))}
      </div>
    );
  }

  if (isBilling || isSettings) {
    return (
      <div className="app-surface-preview real-app-screen real-list-screen">
        <AppTopChrome back title={isBilling ? "MEMBERSHIP" : "SETTINGS"} />
        {["Plus", "Premium", "VIP", "Privacy", "Support"].slice(0, 4).map((row) => (
          <div className="real-public-row" key={row}><span>{row[0]}</span><strong>{row}</strong><em>{">"}</em></div>
        ))}
        <AppBottomNav active="profile" />
      </div>
    );
  }

  return (
    <div className="app-surface-preview real-app-screen real-home-preview">
      <AppTopChrome title="" />
      <div className="real-home-hero-card">
        <img src={logoSrc} alt="" />
        <span>Dating and social networking</span>
        <h3>Find meaningful connections with Anewluv</h3>
        <p>Browse profiles, match, message, complete your profile, and use premium app features.</p>
        <div><strong>Login</strong><em>Sign up</em></div>
      </div>
      <div className="real-home-profile-cloud">
        {[primary, secondary, tertiary].map((profile, index) => (
          <article key={profile?.id || index}>
            <img src={profilePhoto(profile, [lifestyleImages.cafe, lifestyleImages.friends, lifestyleImages.park][index])} alt="" />
            <strong>{profile?.name || ["Tracey", "Henry", "June"][index]}</strong>
            <span>{profile?.compat || [77, 84, 69][index]}%</span>
          </article>
        ))}
      </div>
      <AppBottomNav active="home" />
    </div>
  );
}

function isPersonalPreviewVariant(variant = "") {
  return /profile$|editprofile|personality|rewards|upgrade|entitlements|billing|settings/i.test(String(variant));
}

function AppExperienceSection({ links, previewProfiles = [], profiles, screens = [] }) {
  const personalProfiles = profiles.length ? profiles : previewProfiles;
  const screenByKey = new Map(
    screens
      .filter((screen) => screen?.key)
      .map((screen) => [screen.key, screen]),
  );

  return (
    <section className="section app-experience-section">
      <div className="section-heading">
        <p className="eyebrow">Inside the app</p>
        <h2>How Anewluv moves from discovery to better matches.</h2>
        <p>
          These embedded entry points use the same app routes members use:
          discovery, Browse All search, matches, chat, profile detail, safety
          actions, profile completion, and in-app perks.
        </p>
      </div>
      <div className="app-tour-flow" aria-label="Embedded Anewluv app screen tour">
        {appTourItems.map((item) => {
          if (item.type === "copy") {
            return (
              <article className="tour-copy-card" key={item.title}>
                <span>{item.kicker}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            );
          }

          const screenKey = screenShotSlug(item.variant || item.linkKey, item.label);
          const screen = screenByKey.get(item.variant) || screenByKey.get(screenKey);
          const href = screen?.appUrl || (item.getHref
            ? item.getHref(links, profiles)
            : resolvePreviewLink(links, item.linkKey));
          const frameProfiles = isPersonalPreviewVariant(item.variant) ? personalProfiles : profiles;
          return (
            <article
              className="tour-phone-frame"
              key={item.title}
              style={{ "--tilt": item.tilt }}
            >
              <div className="phone-topbar">
                <img src={logoSrc} alt="" />
                <span>{item.label}</span>
                <a href={href}>Open</a>
              </div>
              <div className="app-embed-shell tour-shell">
                <LiveOrPreviewSurface
                  href={href}
                  label={item.label}
                  profiles={frameProfiles}
                  screenshotUrl={screen?.screenshotUrl}
                  title={`${item.label} app preview`}
                  variant={item.variant || item.linkKey}
                />
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function HeartProfileModal({ links, onClose, profile }) {
  React.useEffect(() => {
    if (!profile) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, profile]);

  if (!profile) return null;

  const href = profile.appUrl || links.discover || links.home;
  const displayName = profile.name || profile.label || "Anewluv";
  const photoUrl = profile.photoUrl || profile.photos?.[0] || lifestyleImages.cafe;
  const location = profile.location || [profile.city, profile.country].filter(Boolean).join(", ");
  const chips = profilePopupChips(profile);
  const goToApp = () => {
    window.location.href = href;
  };

  return (
    <div className="profile-modal-backdrop" onClick={goToApp} role="presentation">
      <section
        aria-label={`${displayName} profile preview`}
        aria-modal="true"
        className="profile-modal-card"
        role="dialog"
      >
        <button
          aria-label="Close profile preview"
          className="profile-modal-close"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          type="button"
        >
          x
        </button>
        <div className="profile-modal-photo">
          <img src={photoUrl} alt="" />
          <div className="profile-modal-overlay">
            <h3>{profile.age ? `${displayName}, ${profile.age}` : displayName}</h3>
            {location ? <p>{location}</p> : null}
            <div className="profile-modal-chip-row">
              {chips.map((chip) => (
                <span key={chip}>{chip}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="profile-modal-actions">
          <button className="profile-modal-cta" type="button">
            Sign up to match
          </button>
          <div className="profile-modal-socials" aria-label="Sign up options">
            {["G", "f", "X", "A"].map((item) => (
              <button className="profile-modal-social" key={item} type="button">
                {item}
              </button>
            ))}
          </div>
          <button className="profile-modal-login" type="button">
            Already a member? <strong>Log in</strong>
          </button>
        </div>
      </section>
    </div>
  );
}

function profilePopupChips(profile) {
  const chips = [];
  if (profile.tier) chips.push(profile.tier);
  if (profile.compat) chips.push(`${profile.compat}% match`);
  if (profile.distanceMiles != null) chips.push(`${profile.distanceMiles} mi away`);
  chips.push(...(profile.chips || profile.interests || []));
  if (!chips.length) chips.push("Dating", "Profiles", "Matches");
  return [...new Set(chips.map((chip) => String(chip).trim()).filter(Boolean))].slice(0, 4);
}

function PricingExperienceSection({ links, profiles }) {
  return (
    <section className="section pricing-experience-section">
      <div className="section-heading">
        <p className="eyebrow">Billing, perks, and safety</p>
        <h2>Premium features should look like app features.</h2>
        <p>
          Pricing pages now show where the paid experience lives: membership
          access, app perks, and account controls.
        </p>
      </div>
      <div className="pricing-experience-grid">
        {pricingExperienceCards.map((card, index) => {
          const href = resolvePreviewLink(links, card.linkKey);
          return (
            <article className="pricing-experience-card" key={card.title}>
              <img src={card.image} alt="" />
              <div className="pricing-embed-frame">
                <div className="phone-topbar compact">
                  <span>{card.label}</span>
                  <a href={href}>Open</a>
                </div>
                <div className="app-embed-shell compact">
                  <LiveOrPreviewSurface
                    href={href}
                    label={card.label}
                    profiles={profiles}
                    title={`${card.label} app preview`}
                    variant={card.linkKey}
                  />
                </div>
              </div>
              <div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PlanComparisonSection({ links }) {
  return (
    <section className="section plan-compare-section">
      <div className="plan-compare-heading">
        <h2>Choose Your Plan</h2>
        <p>
          All plans include the personality quiz. Upgrade for deeper matching.
        </p>
      </div>
      <div className="plan-compare-grid">
        {planComparisonCards.map((plan) => (
          <article className={`plan-card plan-card-${plan.tone}`} key={plan.name}>
            {plan.badge ? <span className="plan-badge">{plan.badge}</span> : null}
            <h3>{plan.name}</h3>
            <small>{plan.cadence}</small>
            <div className="plan-price">
              <strong>{plan.price}</strong>
              {plan.suffix ? <span>{plan.suffix}</span> : null}
            </div>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <a className="plan-button" href={links.billing || links.home}>
              {plan.cta}
            </a>
          </article>
        ))}
      </div>
      <p className="plan-disclaimer">
        All purchases are for in-app software access and premium features
        delivered inside Anewluv.
      </p>
    </section>
  );
}

function IconGlyph({ type }) {
  const paths = {
    add: "M12 5v14M5 12h14",
    arrow: "M5 12h13M13 6l6 6-6 6",
    back: "M15 6 9 12l6 6",
    bell: "M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2ZM10 20h4",
    block: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM6.6 6.6l10.8 10.8",
    bolt: "m13 2-7 12h5l-1 8 8-13h-5l1-7Z",
    bug: "M8 8h8v8a4 4 0 0 1-8 0V8Zm2-4 2 2 2-2M4 13h4m8 0h4M5 19l3-3m8 0 3 3M6 6l2 2m10-2-2 2",
    camera: "M4 8h4l1.5-2h5L16 8h4v11H4V8Zm8 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    card: "M4 7.5h16v9H4v-9Zm0 3h16M7 14h4",
    chat: "M5 5h14v10H8l-3 3V5Z",
    check: "m5 12 4 4L19 6",
    close: "M7 7l10 10M17 7 7 17",
    dots: "M6 12h.01M12 12h.01M18 12h.01",
    edit: "m4 17 1 3 3-1L19 8l-4-4L4 15v2Z",
    exit: "M9 5H5v14h4m5-4 4-4-4-4m4 4H9",
    filter: "M4 6h16M7 12h10M10 18h4",
    gear: "M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0-5v3m0 11v3M4.5 7.5l2.1 2.1m10.8 4.8 2.1 2.1m0-9-2.1 2.1M6.6 14.4l-2.1 2.1",
    globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-18c2.2 2.4 3.2 5.4 3.2 9S14.2 18.6 12 21M12 3c-2.2 2.4-3.2 5.4-3.2 9S9.8 18.6 12 21M4 12h16",
    heart: "M12 20.5S4.5 16.2 4.5 9.9c0-2.5 1.9-4.4 4.2-4.4 1.3 0 2.6.7 3.3 1.8.7-1.1 2-1.8 3.3-1.8 2.3 0 4.2 1.9 4.2 4.4 0 6.3-7.5 10.6-7.5 10.6Z",
    home: "M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z",
    info: "M12 17v-6m0-4h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    leaf: "M5 19c8.5.4 13.5-4.6 14-14-9.4.5-14.4 5.5-14 14Zm0 0c3.8-4.8 8.2-8.2 14-14",
    moon: "M20.5 14.4A8.4 8.4 0 0 1 9.6 3.5 8.6 8.6 0 1 0 20.5 14.4Z",
    person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20c1.4-4 4.1-6 7.5-6s6.1 2 7.5 6",
    report: "M12 3 3.8 18h16.4L12 3Zm0 5v5m0 3h.01",
    search: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm5-2 4 4",
    shield: "M12 3.5 18 6v5.2c0 4-2.4 7.5-6 9.1-3.6-1.6-6-5.1-6-9.1V6l6-2.5Z",
    spark: "m12 3 1.8 5.1L19 10l-5.2 1.9L12 17l-1.8-5.1L5 10l5.2-1.9L12 3Zm6 11 1 2.8 3 1.2-3 1.1-1 2.9-1-2.9-3-1.1 3-1.2 1-2.8Z",
    star: "m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 4Z",
    sun: "M12 4V2M12 22v-2M4 12H2m20 0h-2M5.6 5.6 4.2 4.2m15.6 15.6-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z",
    timer: "M12 7v5l3 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z",
    tiktok: "M14 3v11.2a4.8 4.8 0 1 1-4.8-4.8c.6 0 1.1.1 1.6.3v3.1a2 2 0 1 0 1.2 1.8V3h2Zm0 0c.7 2.6 2.3 4.4 5 4.8v3.1c-2-.2-3.7-1-5-2.2",
    users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm6 1a3 3 0 1 0 0-6M3.5 20c1-4 3-6 5.5-6s4.5 2 5.5 6M14 20c.5-2.2 1.7-3.7 3.5-4",
    x: "M5 4l14 16M19 4 5 20",
  };
  const path = paths[type] || paths.arrow;
  return (
    <svg className={`icon-glyph icon-${type || "arrow"}`} viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

function PricingPage() {
  const preview = useDiscoverPreview();
  const links = preview.links || defaultPreviewLinks;

  return (
    <main className="page">
      <PageHero
        eyebrow="Subscriptions and digital features"
        title="Simple pricing for app access."
        body="Browsing, matching, profile creation, and messaging start free. Paid purchases provide software subscriptions, premium memberships, Hearts in-app credit, and optional digital app features."
      />
      <section className="section">
        <div className="pricing-grid">
          {pricingTiers.map(([name, price, detail]) => (
            <article className="price-card" key={name}>
              <span>{name}</span>
              <strong>{price}</strong>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>
      <PricingExperienceSection links={links} profiles={preview.profiles} />
      <section className="section split-band">
        <div>
          <p className="eyebrow">Hearts</p>
          <h2>In-app credit for digital perks.</h2>
          <p>
            Hearts are consumable in-app credit that can be redeemed inside the
            app for time-limited tier passes and other digital perks. Purchased
            Hearts are delivered to the account immediately and are not
            refundable for cash once delivered, except where required by law.
          </p>
        </div>
        <div className="list-panel">
          {heartsPacks.map(([name, hearts, price]) => (
            <div className="list-row" key={name}>
              <span>{name}</span>
              <span>{hearts}</span>
              <strong>{price}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="section compact">
        <p className="eyebrow">One-time perks</p>
        <div className="chip-row">
          {alaCarte.map((item) => (
            <span className="soft-chip" key={item}>
              {item}
            </span>
          ))}
        </div>
        <p className="disclaimer">{purchaseCopy}</p>
      </section>
      <PlanComparisonSection links={links} />
    </main>
  );
}

function LegalPage({ type }) {
  const content = legalContent[type];
  return (
    <main className="page legal-page">
      <PageHero eyebrow={content.eyebrow} title={content.title} body={content.body} />
      <section className="section legal-stack">
        {content.sections.map(([heading, paragraphs]) => (
          <article className="legal-block" key={heading}>
            <h2>{heading}</h2>
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        ))}
      </section>
    </main>
  );
}

const legalContent = {
  privacy: {
    eyebrow: "Privacy",
    title: "Privacy Policy",
    body: "How Anewluv collects, uses, and protects information for the website, app, and related services.",
    sections: [
      ["Information We Collect", ["We may collect information you provide directly, including your name, email address, account details, profile information, photos, messages, referral activity, and other content you choose to submit through Anewluv. We may also collect device, browser, app usage, and approximate location information when needed to operate and improve the service."]],
      ["Social Login", ["If you choose to sign in using a third-party provider such as X, Google, Facebook, or Apple, we may receive basic account information from that provider depending on the permissions you approve."]],
      ["Rewards, Referrals, and In-App Purchases", ["Anewluv may offer digital rewards, points, referral incentives, promotional benefits, subscriptions, premium memberships, account upgrades, and other in-app benefits. We may process related referral activity, reward eligibility, purchase history, review status, fraud checks, and records needed to administer app-based platform benefits."]],
      ["Sharing of Information", ["We do not sell your personal information. We may share information with service providers that help us operate the platform, process payments for digital app access, support reward-related features, maintain security, or provide analytics."]],
      ["Contact", ["Questions about privacy can be sent to admin@anewluv.com."]],
    ],
  },
  terms: {
    eyebrow: "Legal",
    title: "Terms of Service",
    body: "By accessing or using Anewluv, you agree to these terms.",
    sections: [
      ["Eligibility", ["You must be at least 18 years old to use Anewluv. By using the service, you confirm that you meet this requirement."]],
      ["Your Account", ["You are responsible for maintaining the confidentiality of your account and login credentials and for keeping your information accurate and up to date."]],
      ["Safety and Community Standards", ["You agree not to harass, threaten, impersonate, scam, spam, or post illegal, hateful, exploitative, or non-consensual content. We may review reports, restrict features, remove content, or suspend accounts to protect users and the service."]],
      ["Privacy and Data", ["Anewluv processes account, profile, discovery, moderation, billing, support, and usage information as described in our Privacy Policy. Some app features require approximate location, profile content, photos, messages, or device information to function."]],
      ["Rewards, Referrals, and In-App Purchases", ["Anewluv may offer subscriptions, promotional credits, referral incentives, account upgrades, digital rewards, or other in-app benefits connected to app activity, memberships, or purchases. These features are intended to improve the user experience within the Anewluv app and may change over time.", "Promotional credits, referral incentives, and digital rewards have no guaranteed cash value, resale value, or ongoing availability."]],
      ["Payments and Purchases", [purchaseCopy]],
      ["Account Suspension or Termination", ["We may suspend or terminate accounts that violate these Terms, create risk for other users, expose Anewluv to legal or security issues, or misuse platform features including referral or reward systems."]],
      ["Disclaimers and Limitation of Liability", ["Anewluv provides a dating and social networking platform and cannot guarantee matches, conversations, dates, compatibility, uninterrupted access, or specific outcomes from using the service. To the maximum extent allowed by law, Anewluv is not liable for indirect, incidental, consequential, special, or punitive damages related to use of the website, app, purchases, moderation decisions, or user interactions."]],
      ["Contact", ["Questions about these terms can be sent to admin@anewluv.com."]],
    ],
  },
  refunds: {
    eyebrow: "Billing",
    title: "Refunds and Cancellation Policy",
    body: "How cancellations, renewals, and refunds work for digital app access and optional in-app features.",
    sections: [
      ["Subscriptions Auto-Renew", ["When you subscribe to Anewluv Plus, Premium, or VIP, your plan renews automatically at the end of each billing period until you cancel. You can cancel at any time from Settings, Subscription inside the app, or by emailing support@anewluv.com."]],
      ["Consumable Purchases", ["Hearts packs and a la carte add-ons are delivered to your account immediately on purchase. Because they are consumable digital goods that have been delivered, they are not refundable for cash once added to your account, except where required by local law."]],
      ["Billing Errors", ["If you believe you were charged in error, charged twice, or made an accidental purchase, contact support@anewluv.com within 30 days of the charge. Include your registered email, the date of the charge, and a brief description of the issue."]],
      ["Digital Delivery", [purchaseCopy]],
    ],
  },
};

function GuidelinesPage() {
  return (
    <main className="page">
      <PageHero
        eyebrow="Community"
        title="Community Guidelines"
        body="These guidelines apply to profiles, photos, messages, and interactions connected to Anewluv."
      />
      <section className="section feature-grid four">
        {guidelineGroups.map(([title, body]) => (
          <article className="feature-card" key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>
      <section className="section split-band">
        <div>
          <p className="eyebrow">Moderation</p>
          <h2>Reports are reviewed with context.</h2>
        </div>
        <p>
          Depending on severity and history, a report may be dismissed, receive
          a warning, create a temporary suspension, or lead to account removal.
          Appeals are available from the in-app lockout screen when eligible.
        </p>
      </section>
    </main>
  );
}

function UnsubscribePage() {
  return (
    <main className="page">
      <PageHero
        eyebrow="Account support"
        title="Unsubscribe or request profile removal"
        body="Use this form for email preferences, profile removal requests, or account support that cannot be handled inside the app."
      />
      <ContactSection mode="unsubscribe" />
    </main>
  );
}

function ContactPage() {
  return (
    <main className="page">
      <PageHero
        eyebrow="Support"
        title="Contact Anewluv"
        body="Questions about billing, privacy, profile support, or the app can be sent through this form."
      />
      <ContactSection />
    </main>
  );
}

function PageHero({ eyebrow, title, body }) {
  return (
    <section className="page-hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{body}</p>
    </section>
  );
}

function ContactSection({ mode = "contact" }) {
  const isUnsubscribe = mode === "unsubscribe";
  const [formState, setFormState] = React.useState({
    name: "",
    email: "",
    username: "",
    message: "",
  });
  const [submitState, setSubmitState] = React.useState({
    status: "idle",
    errorMessage: "",
  });

  const trimmedName = formState.name.trim();
  const trimmedEmail = formState.email.trim();
  const trimmedMessage = formState.message.trim();
  const emailLooksValid = isValidEmail(trimmedEmail);
  const messageLongEnough = trimmedMessage.length >= MIN_MESSAGE_LENGTH;
  const canSubmit =
    submitState.status !== "submitting" && emailLooksValid && messageLongEnough;

  const updateField = React.useCallback((event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  }, []);

  const handleSubmit = React.useCallback(
    async (event) => {
      event.preventDefault();
      if (!canSubmit) {
        setSubmitState({
          status: "error",
          errorMessage:
            "Enter a valid email and a message with at least 10 characters.",
        });
        return;
      }

      setSubmitState({ status: "submitting", errorMessage: "" });
      const description = isUnsubscribe
        ? [
            trimmedMessage,
            formState.username.trim()
              ? `Username: ${formState.username.trim()}`
              : "",
          ]
            .filter(Boolean)
            .join("\n\n")
        : trimmedMessage;
      const response = await submitContactUsPOST({
        subject: isUnsubscribe ? "Unsubscribe request" : "Website contact request",
        category: isUnsubscribe ? "account_help" : "general",
        description,
        metadata: buildContactMetadata({
          email: trimmedEmail,
          name: trimmedName,
        }),
      });

      if (response?.ok) {
        setSubmitState({ status: "success", errorMessage: "" });
        setFormState({ name: "", email: "", username: "", message: "" });
        return;
      }

      if (response?.code === "rate_limited") {
        setSubmitState({
          status: "error",
          errorMessage: "Too many requests right now. Wait a minute and try again.",
        });
        return;
      }
      if (response?.code === "endpoint_unavailable") {
        setSubmitState({
          status: "error",
          errorMessage:
            "The contact form is temporarily unavailable. Email admin@anewluv.com directly.",
        });
        return;
      }
      setSubmitState({
        status: "error",
        errorMessage:
          "We couldn't send your message right now. Email admin@anewluv.com directly.",
      });
    },
    [
      canSubmit,
      formState.username,
      isUnsubscribe,
      trimmedEmail,
      trimmedMessage,
      trimmedName,
    ],
  );

  return (
    <section className="section contact-section">
      <div>
        <p className="eyebrow">{isUnsubscribe ? "Request form" : "Contact"}</p>
        <h2>{isUnsubscribe ? "Tell us what to remove." : "Drop us a line."}</h2>
        <p>
          {isUnsubscribe
            ? "Send your valid email address and username so support can review the request."
            : "Questions about Anewluv, billing, privacy, or profile support can be sent here."}
        </p>
        <div className="hours">
          <strong>Anewluv support</strong>
          <span>admin@anewluv.com</span>
          <span>Mon-Fri, 9:00 am-5:00 pm</span>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input
            name="name"
            autoComplete="name"
            onChange={updateField}
            value={formState.name}
          />
        </label>
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            onChange={updateField}
            required
            value={formState.email}
          />
        </label>
        {isUnsubscribe ? (
          <label>
            Username
            <input
              name="username"
              autoComplete="username"
              onChange={updateField}
              value={formState.username}
            />
          </label>
        ) : null}
        <label>
          Message
          <textarea
            name="message"
            onChange={updateField}
            rows="5"
            required
            value={formState.message}
          />
        </label>
        {submitState.status === "success" ? (
          <p className="form-feedback success">Message sent. We will review it soon.</p>
        ) : null}
        {submitState.status === "error" ? (
          <p className="form-feedback error">{submitState.errorMessage}</p>
        ) : null}
        <button disabled={submitState.status === "submitting"} type="submit">
          {submitState.status === "submitting" ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div>
        <strong>Anewluv</strong>
        <p>Dating and social networking with premium digital app features.</p>
      </div>
      <div className="footer-links">
        {footerNavItems.map(([label, href]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </div>
      <SocialLinks label="Anewluv social links" />
      <span>Copyright (c) 2026 Anewluv. All rights reserved.</span>
    </footer>
  );
}

function CookieNotice() {
  const [isVisible, setIsVisible] = React.useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(COOKIE_STORAGE_KEY) !== "1";
    } catch {
      return true;
    }
  });

  const acceptCookies = React.useCallback(() => {
    try {
      window.localStorage.setItem(COOKIE_STORAGE_KEY, "1");
    } catch {
      // Storage can be unavailable in strict browser modes; the button should still dismiss.
    }
    setIsVisible(false);
  }, []);

  if (!isVisible) return null;

  return (
    <aside className="cookie">
      <span>This website uses cookies to understand site traffic and improve the experience.</span>
      <button onClick={acceptCookies} type="button">
        Accept
      </button>
    </aside>
  );
}

createRoot(document.getElementById("root")).render(<App />);
