# 🛑 Second Look

> *Empowering mindful spending and ethical choices at the moment of impact.*
> **Built for the Capital One: Best Financial Hack (Nessie API)**

## 🌟 The Vision
"Second Look" is a smart browser extension that intervenes when a user reaches a checkout page on major e-commerce platforms. By integrating real-time banking and transaction data via **Capital One's Nessie API**, it provides an immediate, data-driven "second look" before the user presses *Buy*. 

The goal is to fight impulsive buying, enforce personal budgets, and promote ethical shopping by surfacing cheaper, independent alternatives to monopolistic brands.

## ✨ Core Features

### 1. The Budget Guardian (Powered by Nessie API)
* **What it does:** Warns users if their current cart total will push them over their self-allocated monthly budget, taking into account their actual bank balance.
* **Nessie Integration:** 
  * Uses `/accounts/{id}` to pull the customer's real-time mock balance.
  * Ensures the customer actually has the funds available.

### 2. The Past Purchases Tracker (Powered by Nessie API)
* **What it does:** Alerts users if they are about to buy an item they have recently purchased already.
* **Nessie Integration:**
  * Uses `/accounts/{id}/purchases` to retrieve recent transaction history.
  * Compares cart items against past purchases to prevent redundant spending.

### 3. The Ethical & Economic Alternative Engine
* **What it does:** Identifies items associated with market monopolies or poor ethical ratings and suggests cheaper alternatives from small, independent businesses.
* **Impact:** Promotes conscious consumerism and helps users save money while supporting local or ethical brands.

---

## 🛠 Technical Architecture

* **Frontend:** Browser Extension (HTML, CSS, Vanilla JavaScript) 
* **Detection Engine:** Content scripts using MutationObservers to detect single-page application (SPA) checkouts dynamically.
* **Backend Integration:** Chrome Extension Service Worker acting as the API client to interface securely with the Nessie API.
* **Data APIs:**
  * Capital One Nessie API (Financial Data)
  * (Future) Ethical Brand/Product database for alternatives.

## 🚀 Hackathon Roadmap

1. **Setup & Detection:** ✅ Build the Chrome Extension foundation that successfully detects checkout pages across various architectures.
2. **Nessie Integration:** Connect the extension to Nessie to fetch mock Customer, Account, and Purchase data.
3. **Budget Engine:** Implement the logic to scrape the cart total from the DOM and compare it against Nessie account balances.
4. **UI/UX:** Design a beautiful, non-intrusive popup menu for setting budgets and a high-impact "Warning Banner" injected into the checkout page.
5. **Alternative Engine:** Mock the alternative product suggestion engine to demonstrate the ethical shopping concept for the pitch.
