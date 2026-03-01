const NESSIE_API_KEY = "ce4f96b83e029b00b328ab78043f8bcb";
const DEMO_ACCOUNT_ID = "69a3626c95150878eaffaea5"; // Created via Nessie API
const GEMINI_API_KEY = "AIzaSyBXr5B60PuXCqjxks2O1_O6DXhYNZZjdK0";

// Listener for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getNessieData") {
        fetchNessieData()
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        // Return true to indicate we wish to send a response asynchronously
        return true;
    }
    else if (request.action === "askGemini") {
        askGeminiDejaVu(request.semanticHtml, request.pastPurchases)
            .then(data => sendResponse({ success: true, data: data }))
            .catch(error => sendResponse({ success: false, error: error.toString() }));

        return true;
    }
    else if (request.action === "recordPurchase") {
        recordPurchaseInNessie(request.amount, request.description)
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true;
    }
});

async function fetchNessieData() {
    try {
        // 1. Check for cached data first (valid for 1 hour)
        const cache = await new Promise(resolve => chrome.storage.local.get(['nessieCache', 'nessieCacheTime'], resolve));
        const now = Date.now();

        // Ensure cache is valid, recent, and HAS purchases (not just an empty stub)
        if (cache.nessieCache && cache.nessieCache.purchases?.length > 0 &&
            cache.nessieCacheTime && (now - cache.nessieCacheTime < 3600000)) {
            console.log("💾 Using cached Nessie data (Speed Boost!)");
            // Silently refresh for next time
            silentRefreshNessie();
            return cache.nessieCache;
        }

        return await silentRefreshNessie();
    } catch (err) {
        console.error("Nessie API Error:", err);
        throw err;
    }
}

async function silentRefreshNessie() {
    // 1. Fetch Account Balance
    const accountRes = await fetch(`http://api.nessieisreal.com/accounts/${DEMO_ACCOUNT_ID}?key=${NESSIE_API_KEY}`);
    if (!accountRes.ok) throw new Error("Failed to fetch Nessie account");
    const accountData = await accountRes.json();

    // 2. Fetch Recent Purchases
    const purchasesRes = await fetch(`http://api.nessieisreal.com/accounts/${DEMO_ACCOUNT_ID}/purchases?key=${NESSIE_API_KEY}`);
    let purchases = [];
    if (purchasesRes.ok) {
        purchases = await purchasesRes.json();
    }

    const data = {
        balance: accountData.balance,
        purchases: purchases
    };

    // Save to cache
    chrome.storage.local.set({
        nessieCache: data,
        nessieCacheTime: Date.now()
    });

    return data;
}

// Unified Semantic AI Analysis (Extraction + Matching) - Optimized for Speed
async function askGeminiDejaVu(semanticHtml, pastPurchases) {
    if (!semanticHtml) {
        console.warn("⚠️ Semantic HTML is empty - Skipping Gemini.");
        return { success: true, data: { dejaVu_matches: [], ethical_insights: { hasMarketData: false, message: "Nothing to analyze." } } };
    }

    try {
        // --- 1. OPTIMIZED ETHICAL CACHE CHECK --- //
        // For simple domain checks (from popup), we can cache the entire result for 24h
        let domain = "";
        try {
            // Try to extract domain from semanticHtml if it's just a domain string (from popup.js)
            if (semanticHtml.startsWith("Current Website Domain:")) {
                domain = semanticHtml.split(": ")[1];
            }
        } catch (e) { }

        if (domain && semanticHtml.startsWith("Current Website Domain:")) {
            const cacheKey = `ethical_cache_${domain}`;
            const cached = await new Promise(resolve => chrome.storage.local.get([cacheKey], resolve));
            const now = Date.now();

            if (cached[cacheKey] && (now - cached[cacheKey].timestamp < 86400000)) { // 24 hours
                console.log(`💾 Using cached Ethical insights for: ${domain}`);
                return cached[cacheKey].data;
            }
        }

        const historyText = pastPurchases.slice(0, 25).map(p => `- ${p.description} (${p.purchase_date})`).join("\n");

        const prompt = `
You are a consumer advocate AI for the "Second Look" extension.
The user is at a checkout page. You have two missions:

MISSION 1: DEJA VU (Past Purchases)
Compare the current cart (Semantic HTML below) against the user's past purchases.
- Think like a human shopper: If the user is buying a "Chiffon Square Neck Dress" and their history shows "CHIFFON SQUARE NECK LACE", this is almost certainly a duplicate or highly redundant purchase.
- Ignore items that are clearly different categories (e.g. Toothbrush vs Dress).
- Flag a match if the items share significant semantic features (material, style, function).

MISSION 2: ETHICAL GUARDIAN (Market Dominance)
Analyze the website domain: ${semanticHtml.substring(0, 100)} (and the cart context).
- Identify the parent company and their industry.
- Find their consumer market share (e.g. "Amazon controls 37% of US e-commerce").
- Recommend 2-3 smaller or independent alternatives for the items in the cart.
- **Rule 1: Strict Category Matching.** Only suggest stores that explicitly specialize in the item's primary category (e.g., only fashion brands for clothing). Do not suggest general gift/home shops for specialized goods.
- **Rule 2: Query Simplification.** Use very simple search terms (e.g., 'earmuffs' or 'dress') in the URL to ensure the results page is not empty.
- **Rule 3: Quality Guard.** If you cannot find a highly relevant, specialized alternative, return an empty 'alternatives' array.
- IMPORTANT: Provide **Robust Search-Based Links**. Generate a Search Result URL for the specific product on the indie site (e.g., 'https://thelittlemarket.com/search?q=ear+muffs' or 'https://www.etsy.com/search?q=chiffon+dress').

SEMANTIC CART HTML:
${semanticHtml}

USER'S PAST PURCHASES:
${historyText}

RESPOND ONLY in this JSON format. No extra text, no backticks:
{
  "dejaVu_matches": [
    { "cart_item": "item name", "history_item": "matched name", "category": "category", "purchase_date": "date" }
  ],
  "ethical_insights": {
    "hasMarketData": true,
    "companyName": "Parent Corp",
    "message": "Company [Name] controls [X]% of the [Industry] market.",
    "marketData": {
      "label": "Market Share",
      "dominatedLabel": "Company",
      "dominated": 37,
      "restLabel": "Everyone Else",
      "rest": 63
    },
    "alternatives": [
      { "name": "Indie Brand", "target_product": "Original Item Name", "url": "https://example.com", "reason": "Reason why it is better/ethical" }
    ]
  }
}
`;

        console.log("⚡ Sending Semantic + Ethical Prompt to Gemini (gemini-2.5-flash-lite)...");
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

        let response;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (response.status !== 503) break;

            attempts++;
            console.warn(`⚠️ Gemini 503 (High Demand). Retrying attempt ${attempts}...`);
            await new Promise(r => setTimeout(r, 1000 * attempts)); // Exponential backoff
        }

        const data = await response.json();

        if (data.error) {
            console.error("❌ Gemini API Error:", data.error);
            return { success: false, error: data.error.message };
        }

        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.warn("⚠️ Empty content from Gemini.");
            return { success: false, error: "Empty AI response" };
        }

        let text = data.candidates[0].content.parts[0].text;

        // --- JSON RESCUE SYSTEM --- //
        text = text.replace(/```json|```/g, "").trim();

        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
        }

        try {
            const result = JSON.parse(text);
            console.log("✅ Consolidated AI Insights received.");

            // --- 2. OPTIMIZED ETHICAL CACHE SAVE --- //
            if (result.ethical_insights?.hasMarketData) {
                let domain = "";
                try {
                    if (semanticHtml.startsWith("Current Website Domain:")) {
                        domain = semanticHtml.split(": ")[1];
                    }
                } catch (e) { }

                if (domain) {
                    const cacheKey = `ethical_cache_${domain}`;
                    chrome.storage.local.set({
                        [cacheKey]: {
                            data: result,
                            timestamp: Date.now()
                        }
                    });
                    console.log(`💾 Cached Ethical insights for: ${domain}`);
                }
            }

            return result;
        } catch (parseErr) {
            console.error("❌ Final JSON Parse failed:", parseErr, text);
            return { success: false, error: "JSON Parse failure" };
        }
    } catch (error) {
        console.error("❌ Gemini AI Processing Error:", error);
        return { success: false, error: error.message };
    }
}

async function recordPurchaseInNessie(amount, description) {
    const url = `http://api.nessieisreal.com/accounts/${DEMO_ACCOUNT_ID}/purchases?key=${NESSIE_API_KEY}`;

    // Using the Amazon.com merchant we created: 69a3b04395150878eaffb5a2
    const purchaseData = {
        merchant_id: "69a3b04395150878eaffb5a2",
        medium: "balance",
        purchase_date: new Date().toISOString().split('T')[0],
        amount: parseFloat(amount),
        status: "completed",
        description: description || "Amazon Purchase (Synced by Second Look)"
    };

    console.log("Syncing purchase to Nessie:", purchaseData);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData)
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to record purchase in Nessie");
    }

    return await response.json();
}
