import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const pages = {
  "/": {
    title: "Find Meaningful Connections with Anewluv",
    body:
      "Anewluv is a dating and social networking app that helps people connect through profiles, discovery, media, and premium in-app features.",
  },
  "/pricing": {
    title: "Pricing",
    body:
      "Anewluv sells software subscriptions, premium memberships, Hearts in-app credit, and optional digital app features. Stripe payments are only for digital software access inside the Anewluv app.",
  },
  "/privacy-policy": {
    title: "Privacy Policy",
    body:
      "AnewLuv may offer digital rewards, points, referral incentives, promotional benefits, subscriptions, premium memberships, account upgrades, and other in-app benefits.",
  },
  "/terms-of-service-1": {
    title: "Terms of Service",
    body:
      "Payments processed through Stripe are only for software subscriptions, premium memberships, and optional digital app features. Promotional credits, referral incentives, and digital rewards have no guaranteed cash value, resale value, financial return, or ongoing availability.",
  },
  "/refunds": {
    title: "Refunds and Cancellation Policy",
    body:
      "Anewluv sells digital subscriptions and in-app credit. This policy explains how cancellations, renewals, and refunds work for digital app access and optional in-app features.",
  },
  "/community-guidelines": {
    title: "Community Guidelines",
    body:
      "Anewluv is for respectful dating and social networking. No harassment, impersonation, scams, or unsafe conduct.",
  },
  "/unsubscribe": {
    title: "Unsubscribe",
    body:
      "Manage email preferences from the Anewluv app or contact support@anewluv.com.",
  },
};

function App() {
  const path = window.location.pathname === "/terms-of-service" ? "/terms-of-service-1" : window.location.pathname;
  const page = pages[path] || pages["/"];

  return (
    <main>
      <nav>
        <a href="/">Home</a>
        <a href="/pricing">Pricing</a>
        <a href="/privacy-policy">Privacy</a>
        <a href="/terms-of-service-1">Terms</a>
        <a href="/refunds">Refunds</a>
        <a href="https://app.anewluv.com">App</a>
      </nav>
      <section className="hero">
        <p className="eyebrow">Anewluv</p>
        <h1>{page.title}</h1>
        <p>{page.body}</p>
        <a className="button" href="https://app.anewluv.com">
          Open app
        </a>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
