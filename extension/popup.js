// Popup logic for Second Look Dashboard (Nessie-First)

document.addEventListener('DOMContentLoaded', async () => {
    const historyList = document.getElementById('history-list');
    const loadingEl = document.getElementById('loading');
    const calculatedBudgetEl = document.getElementById('calculated-budget');

    // 1. Fetch current bank data (Balance + History)
    chrome.runtime.sendMessage({ action: "getNessieData" }, (response) => {
        if (response && response.success) {
            const { balance, purchases } = response.data;
            
            // Update Balance Display
            calculatedBudgetEl.innerText = `$${balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            
            // Render History
            renderHistory(purchases);
        } else {
            console.error("Nessie history failed to load");
            if (calculatedBudgetEl) calculatedBudgetEl.innerText = "Error ⚠️";
        }
    });

    function renderHistory(purchases) {
        if (loadingEl) loadingEl.remove();

        if (!purchases || purchases.length === 0) {
            historyList.innerHTML = '<li class="loading-spinner">No recent activity found.</li>';
            return;
        }

        // Sort by date (newest first)
        const sorted = [...purchases].sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));

        historyList.innerHTML = '';
        sorted.slice(0, 10).forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';

            // Format date
            const dateStr = new Date(item.purchase_date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric'
            });

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
