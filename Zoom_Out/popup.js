// popup.js
// This is the brain of the popup.
// It runs every time the user opens the popup panel.
// It does 4 things:
//   1. Reads which company the user is currently visiting (saved by content.js)
//   2. Loads the companies.json data file
//   3. Finds the matching company in that data
//   4. Builds and displays everything in the popup: message, pie chart, alternatives

// =============================================
// STEP 1: WAIT FOR THE PAGE TO FULLY LOAD
// =============================================
// DOMContentLoaded means "wait until all the HTML elements exist before running"
// We need this so we don't try to find elements that haven't been created yet
document.addEventListener("DOMContentLoaded", async () => {

  // Grab references to our two screens from popup.html
  const zoomOutView  = document.getElementById("zoom-out-view");
  const noMatchView  = document.getElementById("no-match-view");

  // =============================================
  // STEP 2: GET THE CURRENT TAB'S URL DIRECTLY
  // =============================================
  // Instead of relying on content.js saving data, we ask Chrome directly:
  // "what is the URL of the tab the user is currently on?"
  // This is more reliable and always up to date
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = new URL(tab.url);
  const currentDomain = currentUrl.hostname; // e.g. "www.apple.com"

  // Our lookup table — same as content.js
  const domainMap = {
    "apple.com":          "Apple",
    "www.apple.com":      "Apple",
    "amazon.com":         "Amazon",
    "www.amazon.com":     "Amazon",
    "google.com":         "Google",
    "www.google.com":     "Google",
    "chat.openai.com":    "OpenAI",
    "openai.com":         "OpenAI",
    "facebook.com":       "Meta",
    "www.facebook.com":   "Meta",
    "instagram.com":      "Meta",
    "www.instagram.com":  "Meta",
    "meta.com":           "Meta",
    "netflix.com":        "Netflix",
    "www.netflix.com":    "Netflix"
  };

  const activeCompany = domainMap[currentDomain];

  // If the current site isn't in our list, show the watching screen
  if (!activeCompany) {
    zoomOutView.classList.add("hidden");
    noMatchView.classList.remove("hidden");
    return;
  }

  // =============================================
  // STEP 3: LOAD THE COMPANIES.JSON DATA FILE
  // =============================================
  // fetch() is how JavaScript reads files
  // chrome.runtime.getURL() gives us the correct internal path to our file
  const response = await fetch(chrome.runtime.getURL("companies.json"));
  const data = await response.json(); // Convert the raw file into a JS object we can use

  // =============================================
  // STEP 4: FIND THE MATCHING COMPANY IN THE DATA
  // =============================================
  // data.companies is the array of all companies in our JSON file
  // .find() loops through and returns the first one where name matches
  const company = data.companies.find(c => c.name === activeCompany);

  // Safety check: if somehow the company isn't in our JSON, show no-match screen
  if (!company) {
    zoomOutView.classList.add("hidden");
    noMatchView.classList.remove("hidden");
    return;
  }

  // =============================================
  // STEP 5: FILL IN THE WARNING MESSAGE
  // =============================================
  // Find the <p id="company-message"> element and set its text
  document.getElementById("company-message").textContent = company.message;

  // =============================================
  // STEP 6: DRAW THE PIE CHART
  // =============================================
  // We use Chart.js to draw a pie chart on the <canvas id="marketChart"> element
  // .getContext("2d") prepares the canvas for 2D drawing
  const ctx = document.getElementById("marketChart").getContext("2d");

  new Chart(ctx, {
    type: "doughnut", // Doughnut is a pie chart with a hole in the middle, looks cleaner

    data: {
      // These are the two slices: the company's share and everyone else
      labels: [
        company.marketData.dominatedLabel,
        company.marketData.restLabel
      ],
      datasets: [{
        data: [
          company.marketData.dominated, // e.g. 57 for Apple
          company.marketData.rest        // e.g. 43 for everyone else
        ],
        backgroundColor: [
          "#e74c3c", // Red for the dominant company — danger color
          "#2a2a2a"  // Dark grey for everyone else
        ],
        borderColor: [
          "#c0392b",
          "#1a1a1a"
        ],
        borderWidth: 2
      }]
    },

    options: {
      responsive: true,
      animation: {
        animateScale: true,    // Chart grows in dramatically when popup opens
        duration: 800          // Animation takes 0.8 seconds
      },
      plugins: {
        legend: {
          position: "bottom",  // Show labels below the chart
          labels: {
            color: "#aaaaaa",  // Grey text for legend
            font: { size: 11 },
            padding: 12
          }
        },
        tooltip: {
          callbacks: {
            // When user hovers a slice, show "Apple: 57%"
            label: function(context) {
              return ` ${context.label}: ${context.parsed}%`;
            }
          }
        }
      }
    }
  });

  // Set the label text under the chart
  document.getElementById("chart-label").textContent = company.marketData.label;

  // =============================================
  // STEP 7: BUILD THE ALTERNATIVE PRODUCTS LIST
  // =============================================
  const altProductsContainer = document.getElementById("alt-products");

  // Loop through each alternative product in our JSON data
  // and create an HTML card for each one
  company.alternativeProducts.forEach(product => {

    // Create a new div element for the card
    const card = document.createElement("div");
    card.className = "product-card"; // Apply our CSS styles

    // Set the inner HTML of the card with the product name and reason
    card.innerHTML = `
      <div class="product-name">${product.name}</div>
      <div class="product-reason">${product.reason}</div>
    `;

    // Add the card to the container in popup.html
    altProductsContainer.appendChild(card);
  });

  // =============================================
  // STEP 8: BUILD THE ALTERNATIVE WEBSITES LIST
  // =============================================
  const altWebsitesContainer = document.getElementById("alt-websites");

  // Loop through each alternative website and create a clickable link card
  company.alternativeWebsites.forEach(site => {

    // We create an <a> tag (a link) so clicking opens the website
    const card = document.createElement("a");
    card.className = "website-card";
    card.href = site.url;
    card.target = "_blank"; // Opens in a new tab instead of replacing the current page

    card.innerHTML = `
      <div class="website-info">
        <div class="website-name">${site.name}</div>
        <div class="website-reason">${site.reason}</div>
      </div>
      <div class="website-arrow">→</div>
    `;

    altWebsitesContainer.appendChild(card);
  });

});