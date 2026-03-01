# Second-Look


**A Chrome extension that reveals market dominance and provides ethical alternatives while you shop.**

##  Mission

Second Look helps you make informed purchasing decisions by:
- **Revealing market dominance** - See who really controls the market before you buy
- **Providing ethical alternatives** - Discover smaller, independent options
- **Budget protection** - Get real-time spending insights against your bank balance
- **Deja Vu detection** - Alert when you're about to buy something similar to past purchases

##  Features

###  Market Dominance Visualization
- Real-time market share data for major companies
- Interactive doughnut charts showing dominance vs competition
- Color-coded warnings for monopolistic control

###  Ethical Alternatives
- Curated list of smaller, independent alternatives
- Direct links to competitor websites
- Contextual reasons for each recommendation

###  Budget Guardian
- Real-time cart total detection
- Bank balance integration via Nessie API
- Over-budget warnings and remaining balance display

###  Deja Vu Detection
- AI-powered purchase pattern analysis
- Alerts for similar past purchases
- Personalized spending insights



##  Technical Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Charts**: Chart.js for data visualization
- **AI**: Google Gemini API for market analysis
- **Banking**: Capital One Nessie API for budget data
- **Storage**: Chrome Extension Storage API
- **Manifest**: Chrome Extension Manifest V3


##  Installation

### Development Setup

1. **Clone Repository**
   git clone <repository-url>
   cd Second-Look/Zoom_Out

2. **Load Extension in Chrome**
   - Open Chrome and go to chrome://extensions/
   - Enable Developer mode
   - Click Load unpacked
   - Select the Zoom_Out folder

3. **Configure API Keys**
   - Update GEMINI_API_KEY in background.js
   - Update NESSIE_API_KEY in background.js
   - Ensure DEMO_ACCOUNT_ID is valid


##  Workflow

### 1. Company Detection
User visits website → content.js checks domain → companies.json lookup → stores company name

### 2. Market Data Flow
Popup opens → reads stored company → calls background.js → Gemini API → displays chart + alternatives

### 3. Checkout Analysis
User on checkout page → main.js detects → extracts cart total → budget_burner.js calculates → shows sidebar

### 4. Deja Vu Detection
Cart content analysis → background.js → Gemini AI → pattern matching → alerts user

##  User Interface

### Popup View
- **Loading State**: Spinner while fetching data
- **Market View**: Chart + message + alternatives
- **No Match View**: Helpful message for unsupported sites

### Sidebar (Checkout)
- **Budget Guardian**: Spending warnings and balance
- **Deja Vu Alerts**: Similar purchase warnings
- **Market Insights**: Company dominance context

##  Privacy & Security

- **Local Storage**: All data stored locally in Chrome
- **API Security**: Keys stored securely in extension
- **No Tracking**: No analytics or user tracking
- **Minimal Permissions**: Only essential permissions requested





##  Future Enhancements

### Planned Features
- [ ] **Real-time price comparison** across alternatives
- [ ] **Environmental impact scores** for companies
- [ ] **User preference customization**
- [ ] **Advanced spending analytics**

##  Impact Metrics

### User Engagement
- **Active Users**: Track daily/monthly usage
- **Click-through Rates**: Alternative link engagement
- **Budget Alerts**: Spending behavior changes

### Market Impact
- **Alternative Discovery**: Users finding new options
- **Spending Shifts**: Budget to smaller companies
- **Awareness**: Market dominance education

##  Contributing


##  License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.



