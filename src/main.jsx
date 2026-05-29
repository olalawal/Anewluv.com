import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const purchaseCopy =
  "Paid purchases provide access to subscriptions, premium memberships, Hearts in-app credit, and optional digital features delivered inside Anewluv.";

const navItems = [
  ["Home", "/"],
  ["Pricing", "/pricing"],
  ["Privacy", "/privacy-policy"],
  ["Terms", "/terms-of-service-1"],
  ["Refunds", "/refunds"],
  ["Guidelines", "/community-guidelines"],
  ["Contact", "/contact-us"],
  ["Unsubscribe", "/unsubscribe"],
];

const featureCards = [
  ["Profiles with context", "Prompts, media, interests, and profile details that make people easier to understand before a match."],
  ["Discovery controls", "Filters, visibility tools, boosts, and premium discovery settings for people who want more control."],
  ["Built-in safety", "Reporting, appeals, moderation review, and community standards designed for a real dating network."],
];

const valueSections = [
  ["Cost-effective dating", "Start free, then upgrade only when you want more discovery, visibility, and convenience. Anewluv keeps core dating access approachable while making premium features optional."],
  ["Privacy and safety", "Public pages, policies, reporting, moderation, and appeals are rebuilt around clear user trust and straightforward product language."],
  ["Personality profiles", "Members can complete personality sections that add more context to profiles and help matches feel less random."],
  ["In-app rewards and perks", "Activity can unlock app-based benefits like Hearts, boosts, super-likes, profile visibility, and premium experiences."],
];

const matchMoments = [
  ["Discover", "Browse real profiles with prompts, interests, photos, and compatibility context."],
  ["Connect", "See who fits your preferences and start conversations with more confidence."],
  ["Grow", "Use premium tools, personality insights, and app perks to keep the experience moving."],
];

const heroCards = [
  {
    label: "Log in",
    title: "Open the app",
    body: "Start browsing, matching, and messaging.",
    href: "https://app.anewluv.com",
    icon: "arrow",
  },
  {
    label: "Profiles",
    title: "Personality",
    body: "Add more context to your profile.",
    href: "https://app.anewluv.com",
    icon: "spark",
  },
  {
    label: "Plans",
    title: "Pricing",
    body: "See free and premium app options.",
    href: "/pricing",
    icon: "card",
  },
  {
    label: "Trust",
    title: "Safety",
    body: "Review community standards.",
    href: "/community-guidelines",
    icon: "shield",
  },
];

const pricingTiers = [
  ["Free", "$0", "Daily discovery caps, basic matching, profile creation, messaging, ads, and standard community access."],
  ["Plus", "$4.99/mo", "Higher daily caps, rewind swipes, more likes, monthly super-likes, and fewer ads."],
  ["Premium", "$14.99/mo", "See likes, advanced filters, profile priority, boosts, more super-likes, and ad-free access."],
  ["VIP", "$29.99/mo", "Expanded caps, read receipts, incognito mode, message-before-match, and stronger visibility tools."],
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

const mockups = [
  {
    key: "editorial",
    name: "Editorial Warmth",
    tag: "Magazine-style, human, image-led",
    body: "Best for launch: polished, trustworthy, and still recognizably a dating brand.",
  },
  {
    key: "studio",
    name: "Studio Glass",
    tag: "App-forward, clean, premium",
    body: "Best if the site should feel like a software product first and a dating brand second.",
  },
  {
    key: "social",
    name: "Social Postcard",
    tag: "Playful, direct, mobile-first",
    body: "Best for quick conversion from ads, creators, and social campaigns.",
  },
];

function App() {
  const path = normalizePath(window.location.pathname);
  const page = routeFor(path);

  return (
    <>
      <SiteHeader />
      {page}
      <Footer />
      <CookieNotice />
    </>
  );
}

function normalizePath(path) {
  if (path === "/terms-of-service") return "/terms-of-service-1";
  if (path === "/unsubscribe-1") return "/unsubscribe";
  return path;
}

function routeFor(path) {
  if (path === "/pricing") return <PricingPage />;
  if (path === "/privacy-policy") return <LegalPage type="privacy" />;
  if (path === "/terms-of-service-1") return <LegalPage type="terms" />;
  if (path === "/refunds") return <LegalPage type="refunds" />;
  if (path === "/community-guidelines") return <GuidelinesPage />;
  if (path === "/contact-us") return <ContactPage />;
  if (path === "/unsubscribe") return <UnsubscribePage />;
  if (path === "/mockups") return <MockupsPage />;
  return <HomePage />;
}

function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="/">
        <span className="brand-mark">A</span>
        <span>Anewluv</span>
      </a>
      <nav aria-label="Main navigation">
        {navItems.map(([label, href]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
        <a href="/mockups">Mockups</a>
      </nav>
      <a className="header-cta" href="https://app.anewluv.com">
        Open app
      </a>
    </header>
  );
}

function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Dating and social networking</p>
          <h1>Find meaningful connections with Anewluv</h1>
          <p>
            Anewluv helps people connect through rich profiles, discovery,
            media, messaging, and premium app features built for modern dating.
          </p>
          <div className="action-row">
            <a className="button primary" href="https://app.anewluv.com">
              Open the app
            </a>
            <a className="button secondary" href="/pricing">
              View pricing
            </a>
          </div>
          <div className="hero-card-row" aria-label="Quick actions">
            {heroCards.map((card) => (
              <a className="hero-action-card" href={card.href} key={card.title}>
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
      </section>

      <section className="section match-section">
        <div>
          <p className="eyebrow">Couples and matching</p>
          <h2>Designed for people who want more than a swipe.</h2>
          <p>
            The new site should show the actual dating outcome: people meeting,
            profiles with useful context, and app tools that make matching feel
            more intentional.
          </p>
        </div>
        <div className="couple-grid" aria-label="Matching preview cards">
          <article className="couple-photo primary-couple">
            <span>Compatibility context</span>
          </article>
          <article className="couple-note">
            <strong>Personality profiles</strong>
            <p>Section-based personality answers add useful signals without blocking people from using the app.</p>
          </article>
          <article className="couple-photo secondary-couple">
            <span>Real conversations</span>
          </article>
        </div>
      </section>

      <section className="section value-section">
        <div className="section-heading">
          <p className="eyebrow">Why Anewluv</p>
          <h2>Clear value for modern dating.</h2>
        </div>
        <div className="value-grid">
          {valueSections.map(([title, body]) => (
            <article className="value-card" key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section journey-section">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>Meet, match, and improve the experience over time.</h2>
        </div>
        <div className="journey-row">
          {matchMoments.map(([title, body], index) => (
            <article className="journey-card" key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section two-column preserved-section">
        <div>
          <p className="eyebrow">What carries over</p>
          <h2>All current site features, rebuilt in a cleaner format.</h2>
        </div>
        <div className="feature-grid">
          {featureCards.map(([title, body]) => (
            <article className="feature-card" key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <ContactSection />
    </main>
  );
}

function IconGlyph({ type }) {
  if (type === "shield") {
    return (
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 3.5 18 6v5.2c0 4-2.4 7.5-6 9.1-3.6-1.6-6-5.1-6-9.1V6l6-2.5Z" />
      </svg>
    );
  }
  if (type === "card") {
    return (
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M4 7.5h16v9H4v-9Zm0 3h16M7 14h4" />
      </svg>
    );
  }
  if (type === "spark") {
    return (
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="m12 3 1.8 5.1L19 10l-5.2 1.9L12 17l-1.8-5.1L5 10l5.2-1.9L12 3Zm6 11 1 2.8 3 1.2-3 1.1-1 2.9-1-2.9-3-1.1 3-1.2 1-2.8Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function PricingPage() {
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
      ["Rewards, Referrals, and In-App Purchases", ["Anewluv may offer subscriptions, promotional credits, referral incentives, account upgrades, digital rewards, or other in-app benefits connected to app activity, memberships, or purchases. These features are intended to improve the user experience within the Anewluv app and may change over time.", "Promotional credits, referral incentives, and digital rewards have no guaranteed cash value, resale value, financial return, or ongoing availability."]],
      ["Payments and Purchases", [purchaseCopy]],
      ["Account Suspension or Termination", ["We may suspend or terminate accounts that violate these Terms, create risk for other users, expose Anewluv to legal or security issues, or misuse platform features including referral or reward systems."]],
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

function MockupsPage() {
  return (
    <main className="page mockup-page">
      <PageHero
        eyebrow="Design directions"
        title="Three possible Anewluv.com directions"
        body="These are working mockups for choosing the new marketing-site tone before Netlify deployment and DNS cutover."
      />
      <section className="mockup-grid">
        {mockups.map((mockup) => (
          <article className={`mockup-card ${mockup.key}`} key={mockup.key}>
            <div className="mockup-nav">
              <span>Anewluv</span>
              <span>Pricing</span>
              <span>App</span>
            </div>
            <div className="mockup-body">
              <p>{mockup.tag}</p>
              <h2>{mockup.name}</h2>
              <span>{mockup.body}</span>
            </div>
          </article>
        ))}
      </section>
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
      <form name={isUnsubscribe ? "unsubscribe" : "contact"} method="POST" data-netlify="true">
        <input type="hidden" name="form-name" value={isUnsubscribe ? "unsubscribe" : "contact"} />
        <label>
          Name
          <input name="name" autoComplete="name" />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        {isUnsubscribe ? (
          <label>
            Username
            <input name="username" autoComplete="username" />
          </label>
        ) : null}
        <label>
          Message
          <textarea name="message" rows="5" required />
        </label>
        <button type="submit">Send</button>
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
        {navItems.map(([label, href]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </div>
      <span>Copyright © 2026 Anewluv. All rights reserved.</span>
    </footer>
  );
}

function CookieNotice() {
  return (
    <aside className="cookie">
      <span>This website uses cookies to understand site traffic and improve the experience.</span>
      <button type="button">Accept</button>
    </aside>
  );
}

createRoot(document.getElementById("root")).render(<App />);
