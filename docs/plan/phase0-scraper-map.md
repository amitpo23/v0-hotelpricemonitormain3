# Phase 0 Scraper Refactoring Map

## Live Call Chain (Serverless-Viable Path)

```
app/api/scans/execute/route.ts [POST]
  └─> scrapeCompetitorAllRooms() [from lib/scraper/real-scraper.ts]
      └─> scrapeBookingPrice() / scrapeBookingPrices() [from lib/scraper/booking-scraper.tsx]
          ├─> Method 0: scrapeViaApify() [BROKEN - shells out to Python]
          ├─> Method 2: scrapeViaDirectUrl() [LIVE - direct fetch]
          └─> Method 3: scrapeViaTavily() [LIVE - fallback API]
```

## Functions with Live Callers

### Functions USED in Production:
- `scrapeCompetitorAllRooms()` - called from `app/api/scans/execute/route.ts:224,260`
- `scrapeBookingPrices()` - called from `lib/scraper/real-scraper.ts:146`
- `scrapeViaDirectUrl()` - called from `scrapeBookingPrices:742` (Method 2)
- `scrapeViaTavily()` - called from `scrapeBookingPrices:761` (Method 3)
- `scrapeViaDirectHTML()` - defined but NOT called (Method 1 in commented code)
- `scrapeViaBookingSearchAPI()` - defined but NOT called (orphaned)
- `scrapeViaScraperAPI()` - defined but NOT called (orphaned)
- `scrapeViaRapidAPI()` - defined but NOT called (orphaned)

### Functions NOT USED (Dead Code):

#### In `app/api/scans/execute/route.ts`:
- `scrapeCompetitorPrices()` (lines 30-71) - simulated price generator, ZERO callers
- `fetchMarketData()` (lines 74-91) - simulated market data, ZERO callers
- Old code block (lines 297-328) - commented out, never executed

#### In `lib/scraper/booking-scraper.tsx`:
- `scrapeViaApify()` (lines 460-553) - shells out to Python scraper_v5.py script
  - Hardcoded paths: `/workspaces/v0-hotelpricemonitormain3/` and `/home/codespace/`
  - Uses `child_process.exec()` with promisify
  - NOT viable in Vercel serverless (no Python, no shared filesystem)
  - Called from `scrapeBookingPrices:694`

#### Commented/Disabled Code:
- "Method 1: Playwright" block (lines 717-736) - references undefined `scrapeViaPlaywright()`

## Orphaned Scraper Files

Checking all files in `lib/scraper/`:
- `apify-scraper-integration.ts` - imported but NOT analyzed (out of scope)
- `apify-booking-scraper.ts` - imported but NOT analyzed (out of scope)
- `real-scraper.ts` - actively used
- `booking-scraper.tsx` - actively used (with dead code to remove)

## Cleanup Plan

### Phase 0 Deletions (lib/scraper/booking-scraper.tsx):

1. **Remove `scrapeViaApify()` function** (lines 460-553)
   - Reason: Shells out to Python via child_process.exec, won't work in serverless
   - References hardcoded local paths that don't exist in production
   - Update `scrapeBookingPrices()` to skip this method

2. **Remove Python/child_process imports** if no longer needed
   - Line 496: `import('child_process')`
   - Line 497: `import('util')` - promisify

3. **Remove commented Playwright block** (lines 717-736)
   - References undefined function `scrapeViaPlaywright()`
   - Not implemented, just placeholder

### Phase 0 Deletions (app/api/scans/execute/route.ts):

1. **Remove `scrapeCompetitorPrices()` function** (lines 30-71)
   - Reason: Simulated/random data generator, never called
   - No imports reference it

2. **Remove `fetchMarketData()` function** (lines 74-91)
   - Reason: Simulated/random data generator, never called
   - No imports reference it

3. **Remove commented OLD CODE block** (lines 297-328)
   - Reason: Old code patterns, not used

## Expected Result After Cleanup

**Remaining live scraping chain:**
```
scrapeBookingPrices()
  ├─ scrapeViaDirectUrl() [Direct Booking.com fetch - LIVE]
  └─ scrapeViaTavily() [Tavily search fallback - LIVE]
```

**Verification checklist:**
- No references to `scrapeViaApify` anywhere
- No references to `scraper_v5.py` anywhere
- No references to `/workspaces/` or `/home/codespace/` paths
- No references to `scrapeViaPlaywright` anywhere
- No imports of `child_process` or unused utilities
- No orphaned functions in execute/route.ts
- TypeScript compilation succeeds
- Tests pass (47 expected)
- Build succeeds

## Status
- Created: 2026-07-05
- Phase: Ready for implementation
