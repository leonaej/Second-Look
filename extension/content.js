// Keywords commonly found in checkout or cart URLs
const checkoutUrlKeywords = ['checkout', 'cart', 'buy', 'pay', 'payment'];

// Common CSS selectors for checkout/cart buttons across popular e-commerce platforms (Shopify, Amazon, WooCommerce)
const checkoutSelectors = [
    'button[name="checkout"]',         // Shopify default
    'a[href*="checkout"]',             // Generic links
    '#checkout',                       // Generic ID
    '.checkout-button',                // Generic Class
    'form[action*="checkout"]',        // Cart checkout forms
    'input[name="placeYourOrder1"]',   // Amazon standard checkout checkout button
];

// Main function to evaluate if the current user is checking out
function isCheckoutPage() {
    // 1. Check the URL for obvious keywords
    const currentUrl = window.location.href.toLowerCase();
    const urlIndicatesCheckout = checkoutUrlKeywords.some(keyword => currentUrl.includes(keyword));

    // 2. Check the raw HTML for specific checkout buttons/forms
    const elementIndicatesCheckout = checkoutSelectors.some(selector => document.querySelector(selector) !== null);

    return urlIndicatesCheckout || elementIndicatesCheckout;
}

// --- NEW LOGIC: Scrape Cart Total --- //
// We look for common price identifiers in the DOM (like 'Subtotal' or 'Total')
function getCartTotal() {
    // 1. Check specific CSS selectors first (Most Reliable)
    const priceSelectors = [
        '.grand-total-price',           // Common generic
        '#sc-subtotal-amount-buybox',   // Amazon Cart Page
        '#subtotals-marketplace-table span.grand-total-price', // Amazon Checkout
        '.payment-due__price',          // Shopify Checkout
        '.order-total .amount',         // WooCommerce
        '[data-checkout-payment-due-target]' // Shopify Alternate
    ];

    for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText) {
            const rawText = element.innerText.replace(/[^0-9.]/g, '');
            const price = parseFloat(rawText);

            if (!isNaN(price) && price > 0) {
                console.log(`🛒 Second Look found cart total: $${price} using selector: ${selector}`);
                return price;
            }
        }
    }

    // 2. Fallback: Generic text search (For sites like Cider)
    // We look for elements containing "Total" or "Estimated Total" and grab the next number we see.
    const allElements = document.querySelectorAll('div, span, p, h1, h2, h3, h4, td, b, strong');
    for (let i = 0; i < allElements.length; i++) {
        const text = allElements[i].innerText || "";
        // If we find the word "Total", let's look at this element
        if (text.toLowerCase().includes('total') && text.length < 50) {
            // Try to extract a price from this element
            const match = text.match(/[\$£€₹]?\s*(\d{1,3}(,\d{3})*(\.\d+)?)/);
            if (match && match[1]) {
                const rawText = match[1].replace(/,/g, '');
                const price = parseFloat(rawText);
                if (!isNaN(price) && price > 0) {
                    console.log(`🛒 Second Look found cart total: $${price} using generic text search on: "${text}"`);
                    return price;
                }
            }
        }
    }

    // Fallback if we can't find it exactly
    console.log("🛒 Second Look couldn't confidently find the total. Assuming $0 for now.");
    return 0;
}


// Function to run when a checkout is detected
function triggerSecondLook() {
    console.log("🕵️‍♂️ Second Look Triggered: User is on a checkout page!");

    // Scrape the DOM for the cost of the items
    const cartTotal = getCartTotal();

    // Request Nessie data from the background script
    chrome.runtime.sendMessage({ action: "getNessieData" }, (response) => {
        if (!response || !response.success) {
            console.error("Failed to get Nessie data:", response?.error);
            showBanner("🛑 Second Look: Error connecting to Bank.");
            return;
        }

        const balance = response.data.balance;

        // --- NEW LOGIC: The Budget Guardian Math --- //
        let message = '';

        // Scenario 1: They literally don't have enough money in the bank.
        if (cartTotal > balance) {
            message = `🛑 WARNING: This cart ($${cartTotal.toFixed(2)}) is GREATER than your Nessie Balance ($${balance.toFixed(2)})!`;
        }
        // Scenario 2: If the purchase is more than 30% of their total balance (High Impact)
        else if (cartTotal > (balance * 0.3)) {
            message = `⚠️ CAUTION: This $${cartTotal.toFixed(2)} purchase is a huge chunk of your $${balance.toFixed(2)} balance. Do you really need it?`;
        }
        // Scenario 3: Standard warning
        else {
            message = `💡 Second Look: You have $${balance.toFixed(2)} left. Spending $${cartTotal.toFixed(2)} leaves you with $${(balance - cartTotal).toFixed(2)}.`;
        }

        showBanner(message);
    });
}

function showBanner(message) {
    if (!document.getElementById('second-look-test-banner')) {
        const banner = document.createElement('div');
        banner.id = 'second-look-test-banner';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background-color: #ff3366;
            color: white;
            text-align: center;
            padding: 10px;
            z-index: 999999;
            font-size: 18px;
            font-weight: bold;
            font-family: sans-serif;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        banner.innerText = message;
        document.body.appendChild(banner);

        // Remove it after 5 seconds just so it doesn't get annoying during testing
        setTimeout(() => banner.remove(), 5000);
    }
}

// === EXECUTION LOGIC === //

let hasTriggered = false;

// 1. Check immediately when the page loads
if (isCheckoutPage()) {
    triggerSecondLook();
    hasTriggered = true;
}

// 2. Watch for changes (Important for modern React/Vue websites!)
// Many modern websites don't completely reload the page when you go to cart.
// They just change the content dynamically. A MutationObserver watches for new elements.
const observer = new MutationObserver((mutations) => {
    const currentlyCheckout = isCheckoutPage();

    // If they navigate TO a checkout page dynamically
    if (currentlyCheckout && !hasTriggered) {
        triggerSecondLook();
        hasTriggered = true;
    }
    // If they navigate AWAY from the checkout page
    else if (!currentlyCheckout) {
        hasTriggered = false;
    }
});

// Start observing the whole document body for changes
observer.observe(document.body, { childList: true, subtree: true });
