// popup.js
// Uses Gemini AI to dynamically fetch market share data
// for ANY website the user visits.
// Results are cached per domain for 24 hours.

// =============================================
// SET TO true DURING TESTING, false FOR DEMO
// =============================================
const USE_MOCK = true;

const MOCK_DATA = {
  "netflix.com": {
    "actionLabel": "Watch From Here Instead",
    "alternativeWebsites": [
      {
        "name": "Peacock",
        "reason": "NBCUniversal's platform featuring live sports, current news, and classic sitcoms.",
        "url": "https://www.peacocktv.com"
      },
      {
        "name": "Paramount+",
        "reason": "A massive library of CBS, MTV, and Nickelodeon content with live soccer coverage.",
        "url": "https://www.paramountplus.com"
      },
      {
        "name": "MUBI",
        "reason": "A high-quality independent alternative focused on curated international and arthouse films.",
        "url": "https://mubi.com"
      }
    ],
    "companyName": "Netflix",
    "hasMarketData": true,
    "industry": "Video Streaming",
    "marketData": {
      "dominated": 22,
      "dominatedLabel": "Netflix",
      "label": "Global Streaming Market Share",
      "rest": 78,
      "restLabel": "Everyone Else"
    },
    "message": "Netflix accounts for approximately 22% of the global video streaming subscription market."
  }
};

const GEMINI_API_KEY = "AIzaSyALwH05aOutczVZ3Q0zNdxkV1V07Xrwc6A";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;
const ONE_DAY = 24 * 60 * 60 * 1000;

document.addEventListener("DOMContentLoaded", async () => {

  const zoomOutView = document.getElementById("zoom-out-view");
  const noMatchView = document.getElementById("no-match-view");
  const loadingView = document.getElementById("loading-view");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || tab.url.startsWith("chrome://")) {
    noMatchView.classList.remove("hidden");
    return;
  }

  const currentUrl = new URL(tab.url);
  const cleanDomain = currentUrl.hostname.replace(/^www\./, "");

  // =============================================
  // MOCK MODE — skips API entirely
  // =============================================
  if (USE_MOCK) {
    console.log("Mock mode — showing Netflix data for", cleanDomain);
    renderCompany(MOCK_DATA["netflix.com"], zoomOutView, noMatchView);
    return;
  }

  // =============================================
  // REAL MODE — check cache, then call Gemini
  // =============================================
  const cacheKey = `cache_${cleanDomain}`;
  const cached = await chrome.storage.local.get(cacheKey);
  const cachedEntry = cached[cacheKey];

  if (cachedEntry && (Date.now() - cachedEntry.timestamp) < ONE_DAY) {
    console.log("Cache hit for", cleanDomain);
    renderCompany(cachedEntry.company, zoomOutView, noMatchView);
    return;
  }

  loadingView.classList.remove("hidden");

  const prompt = `
You are a market research assistant helping consumers understand corporate dominance.
The user is visiting: ${cleanDomain}

Your tasks:
1. Identify the company behind this domain and what industry they are in.
2. Find the market share of this company — defined as: what percentage of consumers/users in this market use this company. For example, if 57 out of 100 smartphone buyers chose Apple, Apple's consumer market share is 57%. Use real, accurate data only.
3. Identify the top 3 companies by consumer market share in this industry.
4. If this company is in the top 3, suggest 3 alternative websites starting from rank #4 or lower — NOT the other top competitors. The goal is to highlight less dominant options.
   If this company is NOT in the top 3, suggest 3 smaller or independent alternatives.
5. Generate a short action label describing what the user does on this type of site. Examples:
   - Netflix → "Watch From Here Instead"
   - Amazon → "Shop From Here Instead"
   - Steam → "Play From Here Instead"
   - Spotify → "Listen From Here Instead"
   - Apple → "Buy From Here Instead"
   - Airbnb → "Book From Here Instead"
   Use your best judgment for other types of sites.

If this is a small or unknown website with no meaningful market data, set "hasMarketData" to false.
If this is a recognizable company with real market presence, set "hasMarketData" to true.

Respond ONLY in this exact JSON format. No extra text, no markdown, no backticks:
{
  "hasMarketData": true,
  "companyName": "Netflix",
  "industry": "Video Streaming",
  "message": "Netflix controls 28% of the global streaming market.",
  "actionLabel": "Watch From Here Instead",
  "marketData": {
    "label": "Global Streaming Market Share",
    "dominatedLabel": "Netflix",
    "dominated": 28,
    "restLabel": "Everyone Else",
    "rest": 72
  },
  "alternativeWebsites": [
    { "name": "Peacock", "url": "https://www.peacocktv.com", "reason": "NBC's streaming service with live sports and news" },
    { "name": "Paramount+", "url": "https://www.paramountplus.com", "reason": "CBS, MTV, and Paramount movies all in one place" },
    { "name": "Tubi", "url": "https://www.tubi.tv", "reason": "Completely free, ad-supported streaming with thousands of titles" }
  ]
}
`;

  let company = null;

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]) {
      console.error("No candidates:", data);
      loadingView.classList.add("hidden");
      noMatchView.classList.remove("hidden");
      return;
    }

    const rawText = data.candidates[0].content.parts[0].text;
    const cleanText = rawText.replace(/```json|```/g, "").trim();
    company = JSON.parse(cleanText);

  } catch (error) {
    console.error("Gemini API error:", error);
    loadingView.classList.add("hidden");
    noMatchView.classList.remove("hidden");
    return;
  }

  loadingView.classList.add("hidden");

  if (!company || !company.hasMarketData) {
    noMatchView.classList.remove("hidden");
    return;
  }

  await chrome.storage.local.set({
    [cacheKey]: { company, timestamp: Date.now() }
  });

  renderCompany(company, zoomOutView, noMatchView);

});

// Renders company data into the popup UI
function renderCompany(company, zoomOutView, noMatchView) {

  if (!company || !company.hasMarketData) {
    noMatchView.classList.remove("hidden");
    return;
  }

  zoomOutView.classList.remove("hidden");

  document.getElementById("company-message").textContent = company.message;

  const ctx = document.getElementById("marketChart").getContext("2d");

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [company.marketData.dominatedLabel, company.marketData.restLabel],
      datasets: [{
        data: [company.marketData.dominated, company.marketData.rest],
        backgroundColor: ["#e74c3c", "#2a2a2a"],
        borderColor: ["#c0392b", "#1a1a1a"],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      animation: { animateScale: true, duration: 800 },
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#aaaaaa", font: { size: 11 }, padding: 12 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.label}: ${context.parsed}%`;
            }
          }
        }
      }
    }
  });

  document.getElementById("chart-label").textContent = company.marketData.label;
  document.getElementById("alt-websites-title").textContent = company.actionLabel;

  const altWebsitesContainer = document.getElementById("alt-websites");

  company.alternativeWebsites.forEach(site => {
    const card = document.createElement("a");
    card.className = "website-card";
    card.href = site.url;
    card.target = "_blank";
    card.innerHTML = `
      <div class="website-info">
        <div class="website-name">${site.name}</div>
        <div class="website-reason">${site.reason}</div>
      </div>
      <div class="website-arrow">→</div>
    `;
    altWebsitesContainer.appendChild(card);
  });
}