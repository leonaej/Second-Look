const https = require("https");

const API_KEY = "AIzaSyCe2s1jw4jtzHXBTo0hfvh-ZWptF0lRd1k";

const body = JSON.stringify({
  contents: [{ parts: [{ text: "Hello! I am testing to see if this API connection is working. Please just respond with a short friendly message confirming you received this." }] }]
});

const options = {
  hostname: "generativelanguage.googleapis.com",
  path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  }
};

console.log("Sending request to Gemini API...");

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    const parsed = JSON.parse(data);
    if (parsed.candidates && parsed.candidates[0]) {
      const reply = parsed.candidates[0].content.parts[0].text;
      console.log("✅ API is working! Gemini says:");
      console.log(reply);
    } else {
      console.log("❌ API returned an error:");
      console.log(JSON.stringify(parsed, null, 2));
    }
  });
});

req.on("error", err => console.error("❌ Request failed:", err));
req.write(body);
req.end();