const NESSIE_API_KEY = "ce4f96b83e029b00b328ab78043f8bcb";
const DEMO_ACCOUNT_ID = "69a3626c95150878eaffaea5"; // Created via Nessie API

// Listener for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getNessieData") {
        fetchNessieData()
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        // Return true to indicate we wish to send a response asynchronously
        return true;
    }
});

async function fetchNessieData() {
    try {
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

        return {
            balance: accountData.balance,
            purchases: purchases
        };
    } catch (err) {
        console.error("Nessie API Error:", err);
        throw err;
    }
}
