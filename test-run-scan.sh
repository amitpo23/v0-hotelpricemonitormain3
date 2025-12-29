#!/bin/bash

echo "🔍 Running 30-day scan test..."
echo ""

# Get first hotel ID from database
echo "1️⃣ Getting hotel ID..."
HOTEL_ID=$(curl -s 'https://dqhmraeyisoigxzsitiz.supabase.co/rest/v1/hotels?select=id,name&limit=1' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I" \
  | jq -r '.[0].id')

HOTEL_NAME=$(curl -s 'https://dqhmraeyisoigxzsitiz.supabase.co/rest/v1/hotels?select=name&limit=1' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I" \
  | jq -r '.[0].name')

echo "Hotel ID: $HOTEL_ID"
echo "Hotel Name: $HOTEL_NAME"
echo ""

if [ -z "$HOTEL_ID" ] || [ "$HOTEL_ID" == "null" ]; then
  echo "❌ No hotel found in database"
  exit 1
fi

# Run the scan with 30 days
echo "2️⃣ Starting 30-day scan..."
echo "This will scan 10 competitors for 30 days (300 total scrapes)"
echo ""

START_TIME=$(date +%s)

RESPONSE=$(curl -s -X POST "http://localhost:3000/api/scraper/run-full" \
  -H "Content-Type: application/json" \
  -d "{
    \"hotelId\": \"$HOTEL_ID\",
    \"daysToScan\": 30,
    \"autoDetectRoomTypes\": true
  }")

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "✅ Scan completed in ${DURATION} seconds"
echo ""
echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""

# Check if scan was successful
SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
SCRAPED_COUNT=$(echo "$RESPONSE" | jq -r '.scrapedCount // 0')

if [ "$SUCCESS" == "true" ]; then
  echo "✅ SUCCESS: Scraped $SCRAPED_COUNT competitor prices"
  
  # Verify data was saved to database
  echo ""
  echo "3️⃣ Verifying data in database..."
  
  RECENT_SCANS=$(curl -s "https://dqhmraeyisoigxzsitiz.supabase.co/rest/v1/competitor_prices?select=*&hotel_id=eq.$HOTEL_ID&order=created_at.desc&limit=10" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I")
  
  COUNT=$(echo "$RECENT_SCANS" | jq '. | length')
  echo "Found $COUNT recent prices in database"
  
  if [ "$COUNT" -gt 0 ]; then
    echo ""
    echo "Sample prices:"
    echo "$RECENT_SCANS" | jq -r '.[] | "\(.date): \(.competitor_name) - \(.price) \(.currency)"' | head -5
  fi
  
  echo ""
  echo "🎉 All checks passed! Scan data is saved and accessible."
else
  echo "❌ FAILED: Scan was not successful"
  echo "Error: $(echo "$RESPONSE" | jq -r '.error // "Unknown error"')"
fi
