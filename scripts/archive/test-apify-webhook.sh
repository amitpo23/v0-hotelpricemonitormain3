#!/bin/bash

# Test Apify Webhook Endpoint
# Tests both GET (health check) and POST (webhook processing)

BASE_URL="http://localhost:3000"
WEBHOOK_PATH="/api/webhooks/apify"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing Apify Webhook Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Health Check (GET)
echo "Test 1: Health Check (GET)"
echo "URL: ${BASE_URL}${WEBHOOK_PATH}"
echo ""

HEALTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}${WEBHOOK_PATH}")
HTTP_STATUS=$(echo "$HEALTH_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 2: Webhook POST (Successful Run)
echo "Test 2: Webhook POST - Successful Run"
echo ""

WEBHOOK_PAYLOAD='{
  "userId": "test_user",
  "createdAt": "2026-01-02T15:54:12.000Z",
  "eventType": "ACTOR.RUN.SUCCEEDED",
  "eventData": {
    "actorId": "test-actor-id",
    "actorRunId": "test-run-123",
    "status": "SUCCEEDED"
  },
  "resource": {
    "id": "test-run-123",
    "actId": "test-actor-id",
    "status": "SUCCEEDED",
    "defaultDatasetId": "test-dataset-123"
  }
}'

echo "Payload:"
echo "$WEBHOOK_PAYLOAD" | jq '.'
echo ""

WEBHOOK_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_PAYLOAD" \
  "${BASE_URL}${WEBHOOK_PATH}")

HTTP_STATUS=$(echo "$WEBHOOK_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$WEBHOOK_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Webhook POST succeeded"
else
    echo "❌ Webhook POST failed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 3: Webhook POST (Failed Run)
echo "Test 3: Webhook POST - Failed Run"
echo ""

FAILED_PAYLOAD='{
  "userId": "test_user",
  "createdAt": "2026-01-02T15:54:12.000Z",
  "eventType": "ACTOR.RUN.FAILED",
  "eventData": {
    "actorId": "test-actor-id",
    "actorRunId": "test-run-456",
    "status": "FAILED"
  },
  "resource": {
    "id": "test-run-456",
    "actId": "test-actor-id",
    "status": "FAILED"
  }
}'

FAILED_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$FAILED_PAYLOAD" \
  "${BASE_URL}${WEBHOOK_PATH}")

HTTP_STATUS=$(echo "$FAILED_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$FAILED_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Failed run webhook handled correctly"
else
    echo "❌ Failed run webhook failed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All webhook tests completed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
