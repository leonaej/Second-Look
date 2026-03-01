function runBudgetBurner(cartTotal, nessieBalance) {
    if (!cartTotal || nessieBalance === undefined) return null;

    let message = null;

    // 1. Check if over balance
    if (cartTotal > nessieBalance) {
        message = `⚠️ OVER BALANCE: This $${cartTotal.toFixed(2)} purchase exceeds your available bank balance of $${nessieBalance.toFixed(2)}!`;
    }
    // 2. Otherwise, show how much progress is made
    else {
        const remaining = nessieBalance - cartTotal;
        message = `💡 Budget Guardian: You have $${nessieBalance.toFixed(2)} Available Bank Balance. This leaves you with $${remaining.toFixed(2)} after this purchase.`;
    }

    return message;
}
