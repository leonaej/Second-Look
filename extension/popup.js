// Popup logic for Second Look — Ethical Guardian (Zoom Out Only)

document.addEventListener('DOMContentLoaded', async () => {
    const zoomOutView = document.getElementById('zoom-out-view');
    const loadingView = document.getElementById('loading-view');
    const noMatchView = document.getElementById('no-match-view');
    
    const companyMessage = document.getElementById('company-message');
    const altList = document.getElementById('alt-list');

    // 1. Discover the current website
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url || tab.url.startsWith("chrome://")) {
        showView(noMatchView);
        return;
    }

    const url = new URL(tab.url);
    const domain = url.hostname.replace(/^www\./, "");
    console.log("🔍 Extracting Ethical Insights for:", domain);

    // 2. Fetch Insights via Background Service
    fetchEthicalInsights(domain);

    async function fetchEthicalInsights(domain) {
        showView(loadingView);

        chrome.runtime.sendMessage({ 
            action: "askGemini", 
            semanticHtml: `Current Website Domain: ${domain}`, 
            pastPurchases: [] 
        }, (response) => {
            if (response && response.success && response.data && response.data.ethical_insights && response.data.ethical_insights.hasMarketData) {
                renderEthicalDashboard(response.data.ethical_insights);
            } else {
                showView(noMatchView);
            }
        });
    }

    function renderEthicalDashboard(insights) {
        showView(zoomOutView);
        companyMessage.textContent = insights.message;

        // Render Alternatives
        altList.innerHTML = '';
        insights.alternatives.forEach(alt => {
            const card = document.createElement('a');
            card.className = 'alt-item';
            card.href = alt.url || "#";
            card.target = "_blank";
            card.style.textDecoration = 'none';
            const targetTag = alt.target_product ? `<div style="font-size: 10px; text-transform: uppercase; color: #818cf8; font-weight: 700; margin-bottom: 2px;">For ${alt.target_product}:</div>` : "";
            card.innerHTML = `
                ${targetTag}
                <div class="alt-name">${alt.name} <span style="font-size: 10px; opacity: 0.6;">↗</span></div>
                <div class="alt-reason">${alt.reason}</div>
            `;
            altList.appendChild(card);
        });

        // Render Chart
        const ctx = document.getElementById('popup-ethical-chart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [insights.marketData.dominatedLabel, insights.marketData.restLabel],
                datasets: [{
                    data: [insights.marketData.dominated, insights.marketData.rest],
                    backgroundColor: ['#818cf8', 'rgba(255,255,255,0.05)'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                cutout: '75%',
                plugins: { 
                    legend: { display: false },
                    tooltip: { enabled: true }
                },
                maintainAspectRatio: false,
                animation: { duration: 1000, easing: 'easeOutQuart' }
            }
        });
    }

    function showView(viewToShow) {
        [zoomOutView, loadingView, noMatchView].forEach(v => v.classList.add('hidden'));
        viewToShow.classList.remove('hidden');
    }
});
