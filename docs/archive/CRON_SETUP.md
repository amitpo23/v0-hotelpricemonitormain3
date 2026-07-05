# Auto-Scan Cron Job Setup

## Overview
The system automatically scans the base hotel and all competitors every 72 hours.

## Schedule
- **Frequency**: Every 72 hours
- **Cron Expression**: `0 */72 * * *`
- **Endpoint**: `/api/cron/auto-scan`

## Configuration

### For Vercel
1. Add `vercel.json` to project root (already created)
2. Add environment variable:
   ```bash
   CRON_SECRET=your-secret-key-here
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```
3. Deploy to Vercel
4. Cron will run automatically

### For Railway
1. Add to `railway.json`:
   ```json
   {
     "deploy": {
       "startCommand": "npm start",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     },
     "cron": {
       "auto-scan": {
         "schedule": "0 */72 * * *",
         "command": "curl -X GET -H 'Authorization: Bearer $CRON_SECRET' $RAILWAY_STATIC_URL/api/cron/auto-scan"
       }
     }
   }
   ```
2. Add environment variables in Railway dashboard:
   - `CRON_SECRET`
   - `RAILWAY_STATIC_URL` (auto-set by Railway)

### Manual Execution (for testing)
```bash
# Set the environment variable
export CRON_SECRET="your-secret-key"

# Test the endpoint locally
curl -X POST http://localhost:3000/api/cron/auto-scan \
  -H "Authorization: Bearer $CRON_SECRET"
```

## How It Works

### 1. Cron Trigger
Every 72 hours, the cron system calls `/api/cron/auto-scan`

### 2. Security Check
- Verifies `Authorization: Bearer {CRON_SECRET}` header
- Rejects unauthorized requests

### 3. Scan Execution
- Gets base hotel (scarlet)
- Gets all active competitors
- Scans today + next 90 days
- Updates all tables:
  - `competitor_daily_prices`
  - `competitor_price_history` (price changes)
  - `daily_prices` (recommendations)

### 4. Logging
- Saves results to `scan_logs` table
- Logs success/failure
- Tracks results count

## Monitoring

### Check Last Scan
```sql
SELECT * FROM scan_logs 
WHERE scan_type = 'auto_cron' 
ORDER BY triggered_at DESC 
LIMIT 5;
```

### Check Scan Success Rate
```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(results_count) as avg_results
FROM scan_logs
WHERE scan_type = 'auto_cron'
GROUP BY status;
```

## Database Schema for Logs

Add this table if it doesn't exist:

```sql
CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID REFERENCES hotels(id),
  scan_type TEXT NOT NULL, -- 'manual', 'auto_cron', 'api'
  status TEXT NOT NULL, -- 'completed', 'failed', 'running'
  results_count INTEGER,
  start_date DATE,
  days_scanned INTEGER,
  error_message TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  scan_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scan_logs_hotel ON scan_logs(hotel_id);
CREATE INDEX idx_scan_logs_type ON scan_logs(scan_type);
CREATE INDEX idx_scan_logs_status ON scan_logs(status);
CREATE INDEX idx_scan_logs_triggered ON scan_logs(triggered_at DESC);
```

## Troubleshooting

### Cron not running
1. Check Vercel/Railway logs for errors
2. Verify `vercel.json` is in project root
3. Verify environment variables are set
4. Check deployment logs

### Unauthorized errors
- Verify `CRON_SECRET` matches in environment and request
- Check `Authorization` header format

### Scan failures
- Check `scan_logs` table for error messages
- Verify hotel and competitors exist
- Check Supabase connection
- Verify APIFY credentials

## Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# APIFY
APIFY_API_TOKEN=xxx

# Cron
CRON_SECRET=xxx  # Generate: openssl rand -base64 32
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Python (for scraper)
PYTHON_PATH=/usr/bin/python3
```

## Testing the Cron Job

### 1. Test Locally
```bash
# Start dev server
npm run dev

# In another terminal
curl -X POST http://localhost:3000/api/cron/auto-scan \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"
```

### 2. Test on Production
```bash
# Trigger manually
curl -X POST https://your-app.vercel.app/api/cron/auto-scan \
  -H "Authorization: Bearer your-cron-secret"
```

### 3. Monitor Logs
- Vercel: Check Functions logs in dashboard
- Railway: Check deployment logs
- Database: Query `scan_logs` table

## Success Criteria

✅ Cron runs every 72 hours automatically  
✅ Scans base hotel + all competitors  
✅ Updates all three tables (prices, history, recommendations)  
✅ Logs results to database  
✅ Handles failures gracefully  
✅ Sends alerts on failure (optional)

## Next Steps

1. **Deploy to production** and verify cron works
2. **Monitor first few runs** to ensure stability
3. **Set up alerts** for scan failures
4. **Add dashboard** to view scan history
5. **Optimize scan frequency** based on data needs
