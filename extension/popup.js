// Popup logic for Second Look Dashboard (Nessie + Ethical)

document.addEventListener('DOMContentLoaded', async () => {
    const historyList = document.getElementById('history-list');
    const loadingEl = document.getElementById('loading');
    const calculatedBudgetEl = document.getElementById('calculated-budget');
    const ethicalContainer = document.getElementById('sl-ethical-container');
    const ethicalMessage = document.getElementById('ethical-message');
    const altList = document.getElementById('alt-list');

    // 1. Fetch current bank data (Balance + History)
    chrome.runtime.sendMessage({ action: "getNessieData" }, (response) => {
        if (response && response.success) {
            const { balance, purchases } = response.data;
            calculatedBudgetEl.innerText = `$${balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            renderHistory(purchases);
        } else {
            calculatedBudgetEl.innerText = "Error ⚠️";
        }
    });

    // 2. Fetch Ethical Context for the current domain
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && !tab.url.startsWith("chrome://")) {
        const url = new URL(tab.url);
        const domain = url.hostname.replace(/^www\./, "");
        
        // Check for market dominance data
        fetchEthicalInsights(domain);
    }

    async function fetchEthicalInsights(domain) {
        // We'll use the same prompt as the sidebar but for a single domain
        chrome.runtime.sendMessage({ 
            action: "askGemini", 
            semanticHtml: `Current Website Domain: ${domain}`, // Sending domain as context
            pastPurchases: [] // No history needed for just domain check
        }, (response) => {
            if (response && response.success && response.data && response.data.ethical_insights && response.data.ethical_insights.hasMarketData) {
                renderEthicalDashboard(response.data.ethical_insights);
            }
        });
    }

    function renderEthicalDashboard(insights) {
        ethicalContainer.style.display = 'block';
        ethicalMessage.textContent = insights.message;

        // Render Alternatives
        altList.innerHTML = '';
        insights.alternatives.slice(0, 2).forEach(alt => {
            const div = document.createElement('div');
            div.className = 'alt-item';
            div.innerHTML = `
                <div class="alt-name">${alt.name}</div>
                <div class="alt-reason">${alt.reason}</div>
            `;
            altList.appendChild(div);
        });

        // Render Chart
        const ctx = document.getElementById('popup-ethical-chart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [insights.marketData.dominatedLabel, insights.marketData.restLabel],
                datasets: [{
                    data: [insights.marketData.dominated, insights.marketData.rest],
                    backgroundColor: ['#818cf8', 'rgba(255,255,255,0.1)'],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: '70%',
                plugins: { legend: { display: false } },
                maintainAspectRatio: false
            }
        });
    }

    function renderHistory(purchases) {
        if (loadingEl) loadingEl.remove();
        if (!purchases || purchases.length === 0) {
            historyList.innerHTML = '<li class="loading-spinner">No recent activity found.</li>';
            return;
        }

        const sorted = [...purchases].sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));
        historyList.innerHTML = '';
        sorted.slice(0, 5).forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            const dateStr = new Date(item.purchase_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

            li.innerHTML = `
                <div class="desc">${item.description}</div>
                <div class="meta">
                    <span>${dateStr}</span>
                    <span class="amount">-$${item.amount.toFixed(2)}</span>
                </div>
            `;
            historyList.appendChild(li);
        });
    }
});
