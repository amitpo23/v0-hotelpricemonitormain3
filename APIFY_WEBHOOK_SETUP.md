# Apify Webhook Setup Guide

## Overview

The Apify webhook endpoint automatically receives and processes results from Apify actor runs.

**Endpoint:** `/api/webhooks/apify`

## Features

✅ Automatic result processing when actors complete  
✅ Saves hotel data to database  
✅ Error handling and logging  
✅ Support for both successful and failed runs  
✅ Health check endpoint (GET)

## Setup in Apify

### 1. Get Your Webhook URL

**Production:**
```
https://your-vercel-domain.vercel.app/api/webhooks/apify
```

**Local Development:**
```
https://your-ngrok-url.ngrok.io/api/webhooks/apify
```

### 2. Configure Webhook in Apify Console

1. Go to [Apify Console](https://console.apify.com/)
2. Select your Actor
3. Go to **Settings** → **Webhooks**
4. Click **Add Webhook**
5. Configure:
   - **Event types:** `ACTOR.RUN.SUCCEEDED`, `ACTOR.RUN.FAILED`
   - **Request URL:** Your webhook URL (see above)
   - **HTTP method:** POST
   - **Content type:** application/json

### 3. Test the Webhook

```bash
# Make the test script executable
chmod +x test-apify-webhook.sh

# Run tests
./test-apify-webhook.sh
```

## Webhook Payload Structure

Apify sends the following payload:

```json
{
  "userId": "string",
  "createdAt": "2026-01-02T15:54:12.000Z",
  "eventType": "ACTOR.RUN.SUCCEEDED",
  "eventData": {
    "actorId": "actor-id",
    "actorRunId": "run-id",
    "status": "SUCCEEDED"
  },
  "resource": {
    "id": "run-id",
    "actId": "actor-id",
    "status": "SUCCEEDED",
    "defaultDatasetId": "dataset-id"
  }
}
```

## Expected Actor Output Format

Your Apify actor should output results in this format:

```json
[
  {
    "hotelName": "Hotel Name",
    "checkIn": "2026-01-15",
    "checkOut": "2026-01-16",
    "price": 450.00,
    "currency": "ILS",
    "occupancy": 85,
    "roomType": "Standard Double",
    "availableRooms": 5,
    "url": "https://hotel-website.com/booking",
    "scrapedAt": "2026-01-02T15:54:12.000Z"
  }
]
```

### Required Fields
- `hotelName` - Hotel name (string)
- `checkIn` - Check-in date (YYYY-MM-DD)
- `price` - Room price (number)

### Optional Fields
- `checkOut` - Check-out date
- `currency` - Currency code (default: ILS)
- `occupancy` - Occupancy percentage (0-100)
- `roomType` - Room type name
- `availableRooms` - Number of available rooms
- `url` - Source URL
- `scrapedAt` - Timestamp of scraping

## How It Works

1. **Actor Completes** → Apify triggers webhook
2. **Webhook Receives** → Validates payload
3. **Fetch Dataset** → Downloads results from Apify API
4. **Process Results** → Parses each hotel result
5. **Save to DB** → Stores in `hotels` and `scans` tables
6. **Return Stats** → Sends processing summary

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "stats": {
    "totalResults": 10,
    "saved": 9,
    "errors": 1,
    "processingTime": 1234
  }
}
```

### Error Response
```json
{
  "error": "Webhook processing failed",
  "message": "Failed to fetch dataset: 404"
}
```

## Environment Variables

Required in Vercel:

```bash
APIFY_API_TOKEN=your_apify_token
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing with curl

### Test Health Check
```bash
curl https://your-domain.vercel.app/api/webhooks/apify
```

### Test Webhook POST
```bash
curl -X POST https://your-domain.vercel.app/api/webhooks/apify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test",
    "createdAt": "2026-01-02T15:54:12.000Z",
    "eventType": "ACTOR.RUN.SUCCEEDED",
    "eventData": {
      "actorId": "test-actor",
      "actorRunId": "test-run",
      "status": "SUCCEEDED"
    },
    "resource": {
      "id": "test-run",
      "actId": "test-actor",
      "status": "SUCCEEDED",
      "defaultDatasetId": "your-dataset-id"
    }
  }'
```

## Monitoring

### Check Webhook Logs in Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Click **Logs**
4. Filter by `/api/webhooks/apify`

### Check Scan Logs in Database

```sql
SELECT * FROM scan_logs 
WHERE scan_type IN ('apify_actor', 'apify_webhook')
ORDER BY created_at DESC 
LIMIT 10;
```

## Troubleshooting

### 405 Method Not Allowed
- **Problem:** Endpoint doesn't support the HTTP method
- **Solution:** Ensure you're using POST for webhooks, GET for health checks

### 400 Invalid Payload
- **Problem:** Webhook payload is missing required fields
- **Solution:** Check Apify webhook configuration and payload structure

### 500 Server Error
- **Problem:** Database connection or processing error
- **Solution:** Check environment variables and Supabase connection

### No Results Saved
- **Problem:** Results don't match expected format
- **Solution:** Verify actor output format matches expected structure

## Security Considerations

### Webhook Authentication (Recommended)

Add authentication to your webhook:

```typescript
// In route.ts
const WEBHOOK_SECRET = process.env.APIFY_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  const secret = request.headers.get('X-Webhook-Secret');
  
  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Continue processing...
}
```

Then configure in Apify:
- Add custom header: `X-Webhook-Secret: your_secret_here`

## Next Steps

1. ✅ Deploy webhook endpoint to Vercel
2. ✅ Configure webhook in Apify Console
3. ✅ Test with a sample actor run
4. ✅ Monitor logs for first few runs
5. ✅ Set up error alerting (optional)

## Support

- **Apify Webhooks Documentation:** https://docs.apify.com/webhooks
- **Vercel Logs:** https://vercel.com/docs/observability/runtime-logs
- **Supabase Issues:** Check connection and RLS policies
