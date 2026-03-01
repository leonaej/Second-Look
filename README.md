# 🛑 Second Look

> *Empowering mindful spending and ethical choices at the moment of impact.*
> **Built for the Capital One: Best Financial Hack (Nessie API)**

## 🌟 The Vision
"Second Look" is a smart browser extension that intervenes when a user reaches a checkout page on major e-commerce platforms. By integrating real-time banking and transaction data via **Capital One's Nessie API**, it provides an immediate, data-driven "second look" before the user presses *Buy*. 

The goal is to fight impulsive buying, enforce personal budgets, and prevent redundant spending using state-of-the-art **Semantic AI**.

## ✨ Core Features

### 1. The Budget Guardian (Powered by Nessie API)
* **What it does:** Warns users if their current cart total will push them over their self-allocated monthly budget, taking into account their actual bank balance.
* **Nessie Integration:** 
  * Uses `/accounts/{id}` to pull the customer's real-time mock balance.
  * Ensures the customer actually has the funds available.

### 2. Deja Vu AI (Powered by Gemini 3 Flash)
* **What it does:** Alerts users if they are about to buy an item (or a similar product in the same category) that they have recently purchased.
* **Semantic "X-Ray" Scraping:** Unlike basic scrapers, we use a custom HTML-aware engine that reads hidden metadata (alt-text, ARIA labels) to identify products even when titles are truncated.
* **Single-Shot Analysis:** Uses Gemini 3 Flash to extraction and match items against Nessie history in one sub-second API trip.

### 3. Post-Purchase Auto-Sync
* **What it does:** Automatically detects a successful checkout (Amazon, etc.) and records the transaction in your Nessie bank account.
* **Seamless Flow:** Watches for confirmation signals and syncs the final amount and description instantly.

---

## 🛠 Technical Architecture

* **Frontend:** Chrome Extension (Vanilla JS, CSS, HTML)
* **AI Engine:** **Gemini 3 Flash** (Google Generative AI) for semantic product extraction and purchase matching.
* **Data Layer:** **Nessie API** (Capital One) for mock bank accounts, balances, and transaction history.
* **Storage:** `chrome.storage.local` with TTL caching for high-speed responsiveness.
* **UI:** Custom-injected Shadow DOM sidebar for a non-intrusive, premium experience.

## 🚀 Hackathon Roadmap

1. **Setup & Detection:** ✅ Build the Chrome Extension foundation that successfully detects checkout pages dynamically.
2. **Nessie Integration:** ✅ Connect the extension to Nessie to fetch mock Customer, Account, and Purchase data.
3. **Budget Engine:** ✅ Implement logic to compare cart totals against Nessie balances and user-defined monthly goals.
4. **Deja Vu AI:** ✅ Implement Semantic HTML scraping and single-shot matching using Gemini 3 Flash.
5. **Auto-Sync:** ✅ Implement post-purchase transaction recording back to the Nessie API.
6. **UI/UX:** ✅ Design a premium, glassmorphism-inspired sidebar and popup dashboard.
