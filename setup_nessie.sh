#!/bin/bash

# ==============================================================================
# Second Look - Nessie API Setup Script
# Run this script to generate a mock Customer, Checking Account, and Past Purchases 
# for testing the Second Look Chrome Extension.
# ==============================================================================

# Ensure the user provides their API key as an argument
if [ -z "$1" ]; then
  echo "❌ Error: Please provide your Nessie API key."
  echo "Usage: ./setup_nessie.sh YOUR_API_KEY"
  exit 1
fi

API_KEY=$1
BASE_URL="http://api.nessieisreal.com"

echo "=========================================="
echo "🏦 Initializing Nessie API Mock Data..."
echo "=========================================="

# 1. Create a Mock Customer
echo -n "1. Creating Customer 'Sameeksha R'... "
CUSTOMER_RES=$(curl -s -X POST "${BASE_URL}/customers?key=${API_KEY}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Sameeksha",
    "last_name": "R",
    "address": {
      "street_number": "123",
      "street_name": "Main",
      "city": "Anytown",
      "state": "NY",
      "zip": "10001"
    }
  }')
  
# Extract the Customer ID using grep/sed (A bit hacky but works without jq installed)
CUSTOMER_ID=$(echo $CUSTOMER_RES | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$CUSTOMER_ID" ]; then
    echo "❌ Failed to create. API Response:"
    echo "$CUSTOMER_RES"
    exit 1
fi
echo "✅ Done (ID: $CUSTOMER_ID)"


# 2. Create a Mock Checking Account linked to the Customer
echo -n "2. Creating Checking Account with \$500 balance... "
ACCOUNT_RES=$(curl -s -X POST "${BASE_URL}/customers/${CUSTOMER_ID}/accounts?key=${API_KEY}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Checking",
    "nickname": "Main Budget Account",
    "rewards": 0,
    "balance": 500,
    "account_number": "1234567890123456"
  }')

# Extract Account ID
ACCOUNT_ID=$(echo $ACCOUNT_RES | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCOUNT_ID" ]; then
    echo "❌ Failed to create. API Response:"
    echo "$ACCOUNT_RES"
    exit 1
fi
echo "✅ Done (ID: $ACCOUNT_ID)"


# 3. Create Past Mock Purchases (Cider Example Items)
# We will tie these purchases to an existing merchant in the Nessie database.
# (Note: Merchant IDs in Nessie are shared across the system, so we use a known working one)
MERCHANT_ID="699f8f1c95150878eaffa17b" # Adobe Inc (Working mock merchant)

echo "3. Creating Past Purchases..."

# Purchase 1
curl -s -X POST "${BASE_URL}/accounts/${ACCOUNT_ID}/purchases?key=${API_KEY}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{
    \"merchant_id\": \"${MERCHANT_ID}\",
    \"medium\": \"balance\",
    \"purchase_date\": \"2026-02-10\",
    \"amount\": 39.90,
    \"status\": \"completed\",
    \"description\": \"CHIFFON SQUARE NECK LACE\"
  }" > /dev/null
echo "   - ✅ Added: 'CHIFFON SQUARE NECK LACE' (\$39.90)"

# Purchase 2
curl -s -X POST "${BASE_URL}/accounts/${ACCOUNT_ID}/purchases?key=${API_KEY}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{
    \"merchant_id\": \"${MERCHANT_ID}\",
    \"medium\": \"balance\",
    \"purchase_date\": \"2026-02-20\",
    \"amount\": 9.90,
    \"status\": \"completed\",
    \"description\": \"FUZZY EARMUFFS\"
  }" > /dev/null
echo "   - ✅ Added: 'FUZZY EARMUFFS' (\$9.90)"


# Final Output for the user to copy/paste into background.js
echo "=========================================="
echo "🎉 Setup Complete!"
echo "=========================================="
echo ""
echo "🔥 CRITICAL NEXT STEP:"
echo "Update your 'extension/background.js' file with this new Account ID:"
echo ""
echo "const DEMO_ACCOUNT_ID = \"${ACCOUNT_ID}\";"
echo ""
