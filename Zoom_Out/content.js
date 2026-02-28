
// content.js
// This file runs silently in the background on every webpage the user visits.
// Its only job is to check: "is this a company we care about?"
// If yes, it saves that company name and tells the popup to show the right data.

// Step 1: Get the current website's domain
// window.location.hostname gives us something like "www.apple.com" or "amazon.com"
const currentDomain = window.location.hostname;

// Step 2: Define which domains map to which company name
// This must match the "name" field in your companies.json exactly
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

// Step 3: Check if the current domain is in our list
const matchedCompany = domainMap[currentDomain];

// Step 4: If we found a match, save it using Chrome's storage
// chrome.storage.local is like a tiny local database built into Chrome extensions
// We save the company name so popup.js can read it when the popup opens
if (matchedCompany) {
  chrome.storage.local.set({ activeCompany: matchedCompany });
} else {
  // If the site isn't in our list, clear any previously saved company
  // so the popup doesn't show stale data from the last site
  chrome.storage.local.remove("activeCompany");
}