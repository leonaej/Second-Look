console.log("🚀 Second Look Content Script Loaded.");

// Common CSS selectors for checkout/cart buttons across popular e-commerce platforms (Shopify, Amazon, WooCommerce)
const checkoutSelectors = [
    'button[name="checkout"]',         // Shopify default
    'a[href*="checkout"]',             // Generic links
    '#checkout',                       // Generic ID
    '.checkout-button',                // Generic Class
    'form[action*="checkout"]',        // Cart checkout forms
    'input[name="placeYourOrder1"]',   // Amazon standard checkout checkout button
    '#sc-buy-box-ptc-button',          // Amazon Cart "Proceed to checkout"
];

const checkoutUrlKeywords = ['checkout', 'cart', 'buy', 'pay', 'payment', 'gp/cart'];

// Main function to evaluate if the current user is checking out
function isCheckoutPage() {
    // 1. Check the URL for obvious keywords
    const currentUrl = window.location.href.toLowerCase();
    const urlIndicatesCheckout = checkoutUrlKeywords.some(keyword => currentUrl.includes(keyword));

    // 2. Check the raw HTML for specific checkout buttons/forms
    const elementIndicatesCheckout = checkoutSelectors.some(selector => document.querySelector(selector) !== null);

    return urlIndicatesCheckout || elementIndicatesCheckout;
}

// --- NEW LOGIC: Detect Order Confirmation --- //
function isOrderConfirmationPage() {
    const currentUrl = window.location.href.toLowerCase();
    const isConfirmationUrl = ['thankyou', 'thank-you', 'confirmation', 'order-placed'].some(keyword => currentUrl.includes(keyword));

    // Check for "Thank you" or "Order placed" in the text
    const hasThankYouText = document.body ? (document.body.innerText.includes("Thank you") || document.body.innerText.includes("Order placed")) : false;

    return isConfirmationUrl || hasThankYouText;
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


function getSemanticCartHtml() {
    const cartContainers = [
        '#sc-active-cart',          // Amazon main cart
        '.sc-list-body',            // Amazon cart list
        '#cart-items',              // Generic
        '.cart-container',          // Generic
        '.checkout-main',           // Shopify Checkout area
        '#activeCartViewForm'       // Amazon secondary
    ];

    let targetContainer = null;
    for (const selector of cartContainers) {
        targetContainer = document.querySelector(selector);
        if (targetContainer) break;
    }

    if (!targetContainer) {
        console.warn("⚠️ No cart container found, falling back to body snippet.");
        return document.body.innerText.substring(0, 2000);
    }

    const semanticItems = [];
    const contentTags = new Set(['a', 'span', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'b', 'i', 'strong']);
    
    // Helper to extract clean text from a node
    const getCleanText = (node) => {
        return Array.from(node.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent.trim())
            .filter(t => t.length > 2)
            .join(" ");
    };

    const walk = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            
            // Skip structural/noisy tags to save space
            if (contentTags.has(tagName)) {
                const attrs = [];
                ['alt', 'title', 'aria-label'].forEach(attr => {
                    if (node.hasAttribute(attr)) {
                        attrs.push(`${attr}="${node.getAttribute(attr)}"`);
                    }
                });

                const nodeText = getCleanText(node);
                if (attrs.length > 0 || nodeText.length > 0) {
                    semanticItems.push(`<${tagName} ${attrs.join(' ')}>${nodeText}</${tagName}>`);
                }
            }

            // Recurse into all children (even if parent was skipped)
            Array.from(node.children).forEach(walk);
        }
    };

    walk(targetContainer);
    
    // Join items with newlines for better AI structure
    let semanticHtml = semanticItems.join('\n');
    
    // Smart truncation: Don't cut in the middle of a tag
    if (semanticHtml.length > 5000) {
        const lastTagEnd = semanticHtml.lastIndexOf('>', 5000);
        semanticHtml = semanticHtml.substring(0, lastTagEnd + 1);
    }

    console.log("🧬 Cleaned Semantic Skeleton (for AI):", semanticHtml.substring(0, 100) + "...");
    return semanticHtml;
}

// Extract information about what was just bought
function getFinalPurchaseInfo() {
    // Try to find the total amount on the confirmation page
    const amountSelectors = ['.order-total', '.a-color-price', '.grand-total-price'];
    let amount = 0;
    for (const sc of amountSelectors) {
        const el = document.querySelector(sc);
        if (el) {
            const raw = el.innerText.replace(/[^0-9.]/g, '');
            amount = parseFloat(raw);
            if (!isNaN(amount) && amount > 0) break;
        }
    }

    // Try to find the primary item name
    const itemSelectors = ['.a-list-item', '.product-name', '.item-description'];
    let description = "Amazon Purchase";
    for (const sc of itemSelectors) {
        const el = document.querySelector(sc);
        if (el && el.innerText.trim().length > 5) {
            description = el.innerText.trim().split('\n')[0].substring(0, 100);
            break;
        }
    }

    return { amount, description };
}

// Function to run when a checkout is detected
function triggerSecondLook() {
    console.log("🕵️‍♂️ SecondLook Semantic HTML Orchestrator Triggered!");

    const cartTotal = getCartTotal();
    const semanticHtml = getSemanticCartHtml();

    // 1. Show the banner INSTANTLY
    showBanner(null, "Analyzing cart structure... 🔍", cartTotal);

    // 2. Request Nessie data and start AI analysis
    chrome.runtime.sendMessage({ action: "getNessieData" }, (response) => {
        const pastPurchases = (response && response.success) ? response.data.purchases : [];
        const nessieBalance = (response && response.success) ? response.data.balance : 0;

        if (response && response.success) {
            if (typeof runBudgetBurner === 'function') {
                const budgetMessage = runBudgetBurner(cartTotal, nessieBalance);
                updateBudgetMessage(budgetMessage);
            }
        } else {
            updateBudgetMessage("⚠️ Connectivity Issue: Reaching out to bank...");
        }

        // 3. Single-Shot AI Analysis (HTML Extraction + Matching)
            chrome.runtime.sendMessage({
                action: "askGemini",
                semanticHtml: semanticHtml, // SEND SEMANTIC HTML
                pastPurchases: pastPurchases
            }, (geminiResponse) => {
                if (geminiResponse && geminiResponse.success && geminiResponse.data.length > 0) {
                    injectDejaVuWarning(geminiResponse.data);
                } else {
                    injectDejaVuSafe();
                }
            });
        });
    });
}

// Helper to update just the budget text in the visible banner
function updateBudgetMessage(message) {
    const sidebar = document.getElementById('second-look-sidebar');
    if (sidebar) {
        // Find the budget paragraph (it's the first <p> in the budget section)
        const budgetPara = sidebar.querySelector('div[style*="background: #f8f9fa"] p');
        if (budgetPara) {
            budgetPara.innerText = message;
        }
    }
}

function showBanner(dejaVuMessage, budgetMessage, cartTotal) {
    if (!document.getElementById('second-look-sidebar')) {
        const sidebar = document.createElement('div');
        sidebar.id = 'second-look-sidebar';

        // Modern CSS for a sliding right sidebar
        sidebar.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 350px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-left: 5px solid #6366f1;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            padding: 20px;
            z-index: 2147483647; /* Max z-index */
            font-family: 'Outfit', sans-serif;
            color: #333;
            transform: translateX(120%);
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: flex;
            flex-direction: column;
            gap: 15px;
            max-height: 90vh;
            overflow-y: auto;
        `;

        // 🛑 Header
        let htmlContent = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 800; color: #6366f1;">SECOND LOOK</h2>
                <button id="second-look-close" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #888;">✖</button>
            </div>
        `;

        // 💳 Budget Section
        if (budgetMessage) {
            htmlContent += `
                 <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                     <h3 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; font-weight: 700;">💳 Budget Guardian</h3>
                     <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #1e293b; font-weight: 500;">
                         ${budgetMessage}
                     </p>
                 </div>
             `;
        }

        // 🔄 Deja Vu Section (Placeholder for AI Loading)
        let dejaVuHtml = `
            <div id="sl-deja-vu-container" style="background: #fffbeb; padding: 15px; border-radius: 8px; border: 1px solid #fef3c7; display: flex; flex-direction: column; gap: 10px;">
                <h3 style="margin: 0; font-size: 12px; text-transform: uppercase; color: #d97706; letter-spacing: 1px; font-weight: 700;">🔄 Deja Vu AI</h3>
                <div id="sl-deja-vu-msg" style="font-size: 14px; line-height: 1.5; color: #92400e; font-weight: 500;">
                    <span style="opacity: 0.6;">Categorizing your cart...</span>
                </div>
            </div>
        `;

        sidebar.innerHTML = htmlContent + dejaVuHtml + `
            <div style="margin-top: auto; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                Cart Total: $${cartTotal.toFixed(2)}
            </div>
        `;

        if (document.body) {
            document.body.appendChild(sidebar);
        } else {
            // Fallback for very early injection
            document.documentElement.appendChild(sidebar);
        }

        // Close logic
        document.getElementById('second-look-close').onclick = () => {
            sidebar.style.transform = 'translateX(120%)';
            setTimeout(() => sidebar.remove(), 500);
        };

        // Slide in
        setTimeout(() => {
            sidebar.style.transform = 'translateX(0)';
        }, 100);
    }
}

// Injects the AI response into the DOM without reloading the banner
function injectDejaVuWarning(matches) {
    const container = document.getElementById('sl-deja-vu-container');
    const msgEl = document.getElementById('sl-deja-vu-msg');
    
    if (container && msgEl) {
        container.style.background = '#fffbeb';
        container.style.border = '1px solid #fef3c7';
        
        let cardsHtml = `<p style="margin: 0 0 10px 0; font-size: 13px; color: #92400e; font-weight: 600;">Wait! You own a similar item already:</p>`;
        
        matches.forEach(match => {
            const cleanCartItem = match.cart_item.length > 65 ? match.cart_item.substring(0, 62) + "..." : match.cart_item;
            const cleanHistoryItem = match.history_item.length > 50 ? match.history_item.substring(0, 47) + "..." : match.history_item;

            cardsHtml += `
                <div style="background: white; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 8px;">
                    <div style="font-weight: 800; font-size: 13px; color: #1e293b; margin-bottom: 4px; text-transform: capitalize; line-height: 1.3;">
                        🛒 ${cleanCartItem}
                    </div>
                    <div style="font-size: 12px; color: #475569; display: flex; align-items: baseline; gap: 4px; line-height: 1.4;">
                        <span style="flex-shrink: 0;">Matched:</span>
                        <span style="font-weight: 600; color: #92400e;">"${cleanHistoryItem}"</span>
                    </div>
                    <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 10px; background: #fef3c7; color: #d97706; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase; border: 1px solid #fde68a;">
                            ${match.category}
                        </span>
                        <span style="font-size: 10px; color: #94a3b8; font-weight: 500;">
                            ${match.purchase_date}
                        </span>
                    </div>
                </div>
            `;
        });
        
        msgEl.innerHTML = cardsHtml;
    }
}

function injectDejaVuSafe() {
    const container = document.getElementById('sl-deja-vu-container');
    const msgEl = document.getElementById('sl-deja-vu-msg');
    if (container && msgEl) {
        container.style.background = '#f0fdf4';
        container.style.border = '1px solid #dcfce7';
        msgEl.style.color = '#166534';
        msgEl.innerText = "All clear! No similar previous purchases found.";
    }
}

function showSyncToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #00c853;
        color: white;
        padding: 12px 24px;
        border-radius: 50px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 2147483647;
        font-family: sans-serif;
        font-weight: bold;
        transition: opacity 0.5s;
    `;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Detect and Sync
function detectAndSyncPurchase() {
    if (isOrderConfirmationPage()) {
        const { amount, description } = getFinalPurchaseInfo();
        console.log("🎊 Checkout Confirmed! Syncing to Nessie:", { amount, description });

        chrome.runtime.sendMessage({
            action: "recordPurchase",
            amount: amount,
            description: `Amazon: ${description}`
        }, (response) => {
            if (response && response.success) {
                showSyncToast("✅ Second Look: Purchase synced to your bank!");
            }
        });
    }
}

// === EXECUTION LOGIC === //

let hasTriggered = false;
let hasSynced = false;

// 1. Check immediately when the page loads
if (isCheckoutPage()) {
    triggerSecondLook();
    hasTriggered = true;
}

if (isOrderConfirmationPage() && !hasSynced) {
    detectAndSyncPurchase();
    hasSynced = true;
}

// 2. Watch for changes (Important for modern React/Vue websites!)
const observer = new MutationObserver((mutations) => {
    const currentlyCheckout = isCheckoutPage();
    const currentlyConfirmation = isOrderConfirmationPage();

    // If they navigate TO a checkout page dynamically
    if (currentlyCheckout && !hasTriggered) {
        triggerSecondLook();
        hasTriggered = true;
    }
    // If they navigate TO a confirmation page
    else if (currentlyConfirmation && !hasSynced) {
        detectAndSyncPurchase();
        hasSynced = true;
    }
    // If they navigate AWAY from the checkout page
    else if (!currentlyCheckout && !currentlyConfirmation) {
        hasTriggered = false;
        hasSynced = false;
    }
});

function startObserver() {
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        // Wait for body if script is loaded in <head>
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }
}

startObserver();
