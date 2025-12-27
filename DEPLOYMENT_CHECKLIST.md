# 🚀 Smart Cron System - Deployment Checklist

## Pre-Deployment

### 1. Generate Secure CRON_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
**Output Example:** `a1b2c3d4e5f6...` (64 chars)

### 2. Verify Files Created
- ✅ `app/api/cron/auto-scan/route.ts` (modified)
- ✅ `app/api/cron/monitor-scan/route.ts` (new)
- ✅ `vercel.json` (modified)
- ✅ `AUTO_SCAN_SYSTEM.md` (new)
- ✅ `test-cron-endpoints.mjs` (new)
- ✅ `restart-scan.sh` (new)
- ✅ `check-scan-status.mjs` (new)

---

## Deployment Steps

### Step 1: Commit Changes
```bash
git add .
git commit -m "feat: add smart cron system with auto-restart monitoring"
git push origin main
```

### Step 2: Set Vercel Environment Variable
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Name:** `CRON_SECRET`
   - **Value:** `[paste your generated secret]`
   - **Scope:** Production, Preview, Development
3. Click "Save"

### Step 3: Trigger Deployment
- Vercel auto-deploys on push to `main`
- Or manually trigger: Vercel Dashboard → Deployments → Redeploy

### Step 4: Verify Cron Configuration
Check Vercel Dashboard → Settings → Cron Jobs:
- ✅ `/api/cron/auto-scan` - Every 72 hours (`0 */72 * * *`)
- ✅ `/api/cron/monitor-scan` - Every hour (`0 * * * *`)

---

## Post-Deployment Verification

### 1. Test Monitor Endpoint (Immediate)
```bash
# Replace with your actual URL and secret
curl https://your-app.vercel.app/api/cron/monitor-scan \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Monitoring scan progress: 17/54 dates completed (31%)",
  "action": "none",
  "checkpoint": {
    "completed": 17,
    "total": 54,
    "percentage": 31,
    "last_updated": "2025-12-27T00:50:21.157Z"
  }
}
```

### 2. Check Vercel Logs (First Hour)
```
Vercel Dashboard → Logs → Filter: "cron"
```

**Look for:**
- ✅ "Cron job started: /api/cron/monitor-scan"
- ✅ "📊 Monitoring scan progress"
- ✅ No errors

### 3. Verify Auto-Scan Trigger (Wait ~3-4 Hours)
If scan is stuck, monitor should trigger auto-scan:

```
🚨 Scan appears stuck (4 hours since last update)
Triggering auto-scan restart...
✅ Auto-scan triggered successfully
```

### 4. Check Scan Progress (Every Few Hours)
```bash
# Local check (if you have checkpoint file synced)
node check-scan-status.mjs

# Or via monitor endpoint
curl https://your-app.vercel.app/api/cron/monitor-scan \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Expected Timeline

### Hour 0 (Deployment)
- ✅ Vercel deploys new code
- ✅ Cron jobs configured
- ⏳ First monitor check in 1 hour

### Hour 1 (First Monitor Check)
- Monitor detects: 17/54 dates (31%)
- Scan last updated: <1 hour ago
- **Action:** None (scan still fresh)

### Hour 4 (Auto-Restart Trigger)
- Monitor detects: Still 17/54 dates
- Scan last updated: >3 hours ago
- **Action:** 🚨 Trigger auto-scan restart
- Auto-scan starts batch of 10 dates

### Hour 5-8 (Batch Processing)
- Auto-scan completes 10 dates (27/54 = 50%)
- Checkpoint updated after each date
- Monitor sees progress, no restart needed

### Hour 76 (Next Scheduled Auto-Scan)
- Regular 72h cron runs
- Scans next batch of 10 dates (37/54 = 69%)
- Process continues...

### Hour 24-48 (Completion)
- All 54 dates scanned
- Monitor reports: ✅ Scan complete
- **Final:** 54/54 dates, ~1,458 prices collected

---

## Troubleshooting

### Problem: Monitor says "stuck" but scan is running
**Solution:** Check if process is actually working:
```bash
# Check recent checkpoint updates
cat .missing-dates-checkpoint.json | jq '.last_updated'

# If older than 3 hours, it IS stuck
```

### Problem: Auto-scan doesn't trigger
**Check:**
1. CRON_SECRET set correctly
2. Vercel logs for errors
3. Monitor endpoint returns 200 OK

**Manual trigger:**
```bash
curl -X POST https://your-app.vercel.app/api/cron/auto-scan \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Problem: Scan completes but monitor still reports "stuck"
**Cause:** Old checkpoint file
**Solution:** The cron will detect completion next run (harmless)

### Problem: Want to restart immediately
**Use restart script:**
```bash
bash restart-scan.sh
```

Or **manual trigger:**
```bash
curl -X POST https://your-app.vercel.app/api/cron/auto-scan \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Performance Expectations

### Scan Speed
- **Per Date:** ~30 seconds (27 hotels × 1s each)
- **Per Batch:** ~5 minutes (10 dates)
- **Full Completion:** 37 dates remaining = ~4 batches = 12-24 hours

### Resource Usage
- **Vercel Function Time:** ~5 min per cron (within 10min limit)
- **APIFY Credits:** ~1 credit per hotel = 27 per date = 999 total
- **Database Writes:** ~27 prices per date = 999 total inserts

### Cost Estimate (37 Dates)
- **APIFY:** $9.99 for 1000 credits (covers full scan)
- **Vercel:** Free (Hobby plan includes cron)
- **Total:** ~$10 to complete Q1 2026 data

---

## Success Criteria

### ✅ System is Working If:
1. Monitor runs every hour (check Vercel logs)
2. Auto-scan triggers when stuck (>3 hours)
3. Checkpoint updates after each date
4. Progress increases (17 → 27 → 37 → ... → 54)
5. No failed dates in checkpoint

### 🎉 Scan Complete When:
```json
{
  "completed_dates": [...], // 54 items
  "failed_dates": [],
  "stats": {
    "total_prices": 1458,
    "successful_scans": 54,
    "failed_scans": 0
  }
}
```

---

## Next Steps After Completion

### 1. Verify Data Quality
```bash
node check-q1-data.mjs
```

Expected:
- ✅ 90/90 dates in Q1 2026
- ✅ ~2,430 total prices (90 dates × 27 hotels)
- ✅ All 3 competitors covered

### 2. Run Enhanced Predictions
```bash
curl -X POST https://your-app.vercel.app/api/predictions/enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId": 1,
    "checkInDate": "2026-02-14",
    "los": 2
  }'
```

Expected:
- ✅ Prediction with weather data
- ✅ Booking velocity analysis
- ✅ Year-over-year comparison
- ✅ ML features generated

### 3. Monitor System Health
- Check alerts tab for anomalies
- Review analytics dashboard
- Verify autopilot rules working

---

## Rollback Plan

If something goes wrong:

### Option 1: Disable Crons
1. Vercel Dashboard → Settings → Cron Jobs
2. Delete both cron jobs temporarily
3. Fix issues
4. Re-add crons

### Option 2: Revert Git
```bash
git revert HEAD
git push origin main
```

### Option 3: Use Old Manual Scan
```bash
# Checkpoint-aware manual scan still works
node scan-missing-dates.mjs
```

---

## Support & Documentation

- **Main Guide:** [AUTO_SCAN_SYSTEM.md](AUTO_SCAN_SYSTEM.md)
- **API Docs:** [README.md](README.md#auto-scan--monitoring-new)
- **Test Scripts:**
  - `test-cron-endpoints.mjs` - Local endpoint testing
  - `check-scan-status.mjs` - Progress checker
  - `restart-scan.sh` - Manual restart

---

**Deployment Date:** [Add after deployment]  
**Completion ETA:** 12-24 hours from deployment  
**Status:** 🟡 Pending Deployment
