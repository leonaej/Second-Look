const NESSIE_API_KEY = "ce4f96b83e029b00b328ab78043f8bcb";
const DEMO_ACCOUNT_ID = "69a3626c95150878eaffaea5"; // Created via Nessie API
const GEMINI_API_KEY = "AIzaSyC7YwNVd6rOihxB4qRCP-7vOPoW67e5OB0";

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
    if (!semanticHtml || !pastPurchases?.length) {
        console.warn("⚠️ Semantic HTML or History is empty - Skipping Gemini.");
        return [];
    }

    try {
        const historyText = pastPurchases.slice(0, 25).map(p => `- ${p.description} (${p.purchase_date})`).join("\n");

        const prompt = `You are 'Second Look'.
Semantic HTML Cart:
"""
${semanticHtml}
"""

Purchase History:
${historyText}

Task:
1. Extract actual products from the HTML (ignore nav links).
2. Match them against the history (direct match or same specific category).
3. Return ONLY a JSON array: [{"cart_item": "clean item name", "history_item": "matching history", "category": "category", "purchase_date": "from history"}]
Respond ONLY with JSON. No markdown. If none, return [].`;

        console.log("⚡ Sending Semantic HTML Prompt to Gemini (gemini-3-flash)...");
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Gemini API Fetch Failed:", response.status, errorText);
            return [];
        }

        const result = await response.json();
        console.log("✅ Gemini Response Received:", result);

        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            let text = result.candidates[0].content.parts[0].text.trim().replace(/```json|```/g, "");
            console.log("🔍 Cleaned AI JSON:", text);
            return JSON.parse(text);
        }
        
        console.warn("⚠️ No text parts found in Gemini response.");
        return [];
    } catch (error) {
        console.error("❌ Gemini AI Processing Error:", error);
        return [];
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
