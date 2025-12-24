#!/bin/bash

echo "🧪 Running Test Scan..."
echo ""

# Get hotel ID
echo "1️⃣ Getting hotel ID..."
HOTEL_ID=$(curl -s 'https://dqhmraeyisoigxzsitiz.supabase.co/rest/v1/hotels?select=id&limit=1' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I" \
  | jq -r '.[0].id')

echo "Hotel ID: $HOTEL_ID"
echo ""

if [ -z "$HOTEL_ID" ] || [ "$HOTEL_ID" == "null" ]; then
  echo "❌ No hotel found in database"
  exit 1
fi

# Run a scan
echo "2️⃣ Triggering scan..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/scans/execute \
  -H "Content-Type: application/json" \
  -d "{\"hotel_id\": \"$HOTEL_ID\"}")

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""

# Extract scan ID
SCAN_ID=$(echo "$RESPONSE" | jq -r '.scan_id // empty')

if [ -z "$SCAN_ID" ] || [ "$SCAN_ID" == "null" ]; then
  echo "❌ Failed to start scan"
  exit 1
fi

echo "✅ Scan started with ID: $SCAN_ID"
echo ""

# Wait and check results
echo "3️⃣ Waiting for scan to complete (30 seconds)..."
sleep 30

echo ""
echo "4️⃣ Checking scan status..."
curl -s "https://dqhmraeyisoigxzsitiz.supabase.co/rest/v1/scans?select=*&id=eq.$SCAN_ID" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I" \
  | jq '.'

echo ""
echo "5️⃣ Checking scan results..."
curl -s "https://dqhmraeyisoigxzsitiz.supabase.co/rest/v1/scan_results?select=*&scan_id=eq.$SCAN_ID&limit=5" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I" \
  | jq '.'

echo ""
echo "✅ Test scan completed!"
