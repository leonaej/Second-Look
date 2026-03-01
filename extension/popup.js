// Popup logic for Second Look Dashboard

document.addEventListener('DOMContentLoaded', async () => {
    const historyList = document.getElementById('history-list');
    const loadingEl = document.getElementById('loading');
    
    // Smart Budget Inputs
    const salaryInput = document.getElementById('salary-input');
    const rentInput = document.getElementById('rent-input');
    const loansInput = document.getElementById('loans-input');
    const savingsInput = document.getElementById('savings-input');
    const calculatedBudgetEl = document.getElementById('calculated-budget');
    const saveBudgetBtn = document.getElementById('save-budget');

    // 1. Load existing financial data from storage
    chrome.storage.local.get(['salary', 'rent', 'loans', 'savings', 'monthlyBudget'], (result) => {
        if (result.salary) salaryInput.value = result.salary;
        if (result.rent) rentInput.value = result.rent;
        if (result.loans) loansInput.value = result.loans;
        if (result.savings) savingsInput.value = result.savings;

        if (result.monthlyBudget) {
            calculatedBudgetEl.innerText = `$${result.monthlyBudget.toFixed(2)}`;
        }
    });

    // 2. Fetch current bank history only
    chrome.runtime.sendMessage({ action: "getNessieData" }, (response) => {
        if (response && response.success) {
            const { purchases } = response.data;
            renderHistory(purchases);
        } else {
            console.log("Nessie history failed to load");
        }
    });

    // 3. Calculation Logic
    const calculateBudget = () => {
        const salary = parseFloat(salaryInput.value) || 0;
        const rent = parseFloat(rentInput.value) || 0;
        const loans = parseFloat(loansInput.value) || 0;
        const savings = parseFloat(savingsInput.value) || 0;

        const remaining = salary - rent - loans - savings;
        calculatedBudgetEl.innerText = `$${remaining.toFixed(2)}`;
        return remaining;
    };

    [salaryInput, rentInput, loansInput, savingsInput].forEach(input => {
        input.addEventListener('input', calculateBudget);
    });

    // 4. Handle Save Allocation
    saveBudgetBtn.addEventListener('click', () => {
        const salary = parseFloat(salaryInput.value) || 0;
        const rent = parseFloat(rentInput.value) || 0;
        const loans = parseFloat(loansInput.value) || 0;
        const savings = parseFloat(savingsInput.value) || 0;
        const remaining = calculateBudget();

        const dataToSave = {
            salary,
            rent,
            loans,
            savings,
            monthlyBudget: remaining
        };

        chrome.storage.local.set(dataToSave, () => {
            saveBudgetBtn.innerText = "Goal Fixed! ✅";
            saveBudgetBtn.style.background = "#059669";
            setTimeout(() => {
                saveBudgetBtn.innerText = "Save Allocation";
                saveBudgetBtn.style.background = "#6366f1";
            }, 2000);
        });
    });

    function renderHistory(purchases) {
        loadingEl.remove();

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
