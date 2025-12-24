# Apify Integration - Testing & Troubleshooting Guide

## Overview

This project uses Apify for web scraping competitor hotel prices from Booking.com.

## Apify Actors Used

1. **Primary Actor**: `poetic_ant/v0-hotelpricemonitormain3`
   - Custom actor for this project
   - Location: [lib/scraper/apify-scraper-integration.ts](../lib/scraper/apify-scraper-integration.ts)
   - Scrapes multiple competitors in a single run
   - Directly saves results to Supabase

2. **Fallback Actor**: `oeiQgfg5fsmIJB7Cn`
   - Public Booking.com scraper
   - Location: [lib/scraper/booking-scraper.tsx](../lib/scraper/booking-scraper.tsx)
   - Used for individual hotel scraping

## Required Environment Variables

```bash
# Add to .env.local
APIFY_API_KEY=your_apify_token_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## Getting Your Apify API Key

1. Go to [https://console.apify.com/account/integrations](https://console.apify.com/account/integrations)
2. Copy your "Personal API token"
3. Add it to your `.env.local` file

## Testing Apify Integration

### 1. Test API Key

```bash
# Test if API key is working
curl -H "Authorization: Bearer YOUR_APIFY_API_KEY" \
  https://api.apify.com/v2/actor-tasks
```

### 2. Test from UI

1. Navigate to `/scans` page
2. Click on a scan configuration
3. Click the "Run Scan" button (▶️ icon)
4. Check browser console for logs
5. Check Apify console for actor runs: [https://console.apify.com/actors/runs](https://console.apify.com/actors/runs)

### 3. Test API Endpoint Directly

```bash
# Test scan execution endpoint
curl -X POST http://localhost:3000/api/scans/execute \
  -H "Content-Type: application/json" \
  -d '{
    "config_id": "your-scan-config-id"
  }'
```

### 4. Check Actor Logs in Apify Console

1. Go to [Apify Console → Runs](https://console.apify.com/actors/runs)
2. Find your latest run
3. Click on it to see detailed logs
4. Check for errors in:
   - Build log
   - Run log
   - Dataset (results)

## Common Issues & Solutions

### Issue 1: "Missing APIFY_API_KEY"

**Symptom**: Error message in console or API response

**Solution**:
```bash
# Check if key is set
echo $APIFY_API_KEY

# If empty, add to .env.local:
APIFY_API_KEY=your_token_here

# Restart dev server
pnpm dev
```

### Issue 2: "Actor not found"

**Symptom**: `Actor with id 'poetic_ant/v0-hotelpricemonitormain3' was not found`

**Solution**:
1. Check if you have access to the actor in Apify Console
2. If not, you can:
   - Request access from the actor owner
   - Or deploy your own version
   - Or use the fallback actor `oeiQgfg5fsmIJB7Cn`

To switch to fallback actor temporarily:
```typescript
// In lib/scraper/apify-scraper-integration.ts
// Change line 54:
const run = await client.actor("oeiQgfg5fsmIJB7Cn").call(...)
```

### Issue 3: "Actor run failed with status: FAILED"

**Symptom**: Scan completes but status is failed

**Solution**:
1. Check Apify console logs
2. Common causes:
   - Invalid booking URLs
   - Booking.com blocking
   - Insufficient Apify credits
   - Invalid date formats

**Fix**: Update competitor booking URLs in database:
```sql
-- Check current URLs
SELECT id, competitor_hotel_name, booking_url 
FROM hotel_competitors 
WHERE hotel_id = 'your-hotel-id';

-- Update invalid URL
UPDATE hotel_competitors 
SET booking_url = 'https://www.booking.com/hotel/...'
WHERE id = 'competitor-id';
```

### Issue 4: No Results Returned

**Symptom**: Scan succeeds but 0 results

**Solution**:
1. Check if actor saved to dataset:
   ```typescript
   // In Apify console, check dataset items
   ```
2. Verify Supabase credentials are correct
3. Check `competitor_daily_prices` table for new entries:
   ```sql
   SELECT * FROM competitor_daily_prices 
   ORDER BY scraped_at DESC 
   LIMIT 10;
   ```

### Issue 5: Timeout Errors

**Symptom**: `waitForFinish` timeout after 5 minutes

**Solution**:
Increase timeout in [lib/scraper/apify-scraper-integration.ts](../lib/scraper/apify-scraper-integration.ts#L63):
```typescript
{
  waitForFinish: 600, // Increase to 10 minutes
}
```

## Monitoring & Debugging

### 1. Check Application Logs

```bash
# In development
pnpm dev
# Watch console for [ApifyIntegration] logs
```

### 2. Check Apify Console

- Runs: [https://console.apify.com/actors/runs](https://console.apify.com/actors/runs)
- Credits: [https://console.apify.com/billing](https://console.apify.com/billing)
- Datasets: [https://console.apify.com/storage/datasets](https://console.apify.com/storage/datasets)

### 3. Check Database

```sql
-- Check recent scans
SELECT id, status, started_at, completed_at, results_count, error_message
FROM scans
ORDER BY started_at DESC
LIMIT 10;

-- Check scraped prices
SELECT competitor_id, date, price, source, scraped_at
FROM competitor_daily_prices
ORDER BY scraped_at DESC
LIMIT 20;
```

## Expected Flow

1. User clicks "Run Scan" button in UI
2. Frontend calls `POST /api/scans/execute`
3. Backend:
   - Creates scan record in DB
   - Fetches hotel and competitor data
   - Calls `scrapeWithNewApifyActor()` for each date
   - Apify actor runs and saves to Supabase
   - Updates scan status to "completed"
4. User sees results in UI

## Performance Tips

1. **Batch Multiple Days**: Current code scans 7 days sequentially
2. **Use Webhooks**: Instead of `waitForFinish`, use Apify webhooks for async processing
3. **Cache Results**: Cache competitor prices to reduce scraping frequency
4. **Monitor Credits**: Set up Apify credit alerts

## Support

If issues persist:

1. Check Apify status: [https://status.apify.com](https://status.apify.com)
2. Review Apify docs: [https://docs.apify.com](https://docs.apify.com)
3. Check project issues: [GitHub Issues](https://github.com/amitpo23/v0-hotelpricemonitormain3/issues)

## Next Steps

- [ ] Set up monitoring alerts for failed scans
- [ ] Implement webhook-based async processing
- [ ] Add retry logic for failed scrapes
- [ ] Create admin dashboard for Apify metrics
