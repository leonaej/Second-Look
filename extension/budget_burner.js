// ==========================================
// BUDGET BURNER LOGIC
// Warns the user if they are spending too much
// ==========================================

function runBudgetBurner(cartTotal, monthlyBudget) {
    if (!cartTotal || monthlyBudget === undefined) return null;

    let message = null;

    // 1. Check if over monthly limit
    if (cartTotal > monthlyBudget) {
        message = `⚠️ OVER BUDGET: This $${cartTotal.toFixed(2)} purchase exceeds your monthly Safe-to-Spend limit of $${monthlyBudget.toFixed(2)}!`;
    }
    // 2. Otherwise, show how much progress is made
    else {
        const remaining = monthlyBudget - cartTotal;
        message = `💡 Budget Guardian: You have $${monthlyBudget.toFixed(2)} Monthly Safe-to-Spend. This leaves you with $${remaining.toFixed(2)} for other goals.`;
    }

    return message;
}
