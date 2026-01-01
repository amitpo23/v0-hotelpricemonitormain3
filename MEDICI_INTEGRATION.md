# Medici Hotels API Integration Guide

Complete guide to integrating and using the Medici Hotels API in your hotel price monitoring application.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Setup](#setup)
4. [API Endpoints](#api-endpoints)
5. [Usage Examples](#usage-examples)
6. [Database Integration](#database-integration)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Medici Hotels API integration provides:

- ✅ **Hotel Search** - Search for hotels and prices via Innstant API
- ✅ **Opportunity Management** - Create and manage hotel inventory opportunities
- ✅ **Room Management** - Track active rooms, sales, and cancellations
- ✅ **Booking Operations** - Pre-book, confirm, and manage bookings
- ✅ **Price Tracking** - Integrate Medici prices into competitor monitoring
- ✅ **Market Analysis** - Compare your prices with Medici market averages
- ✅ **Dashboard Analytics** - Get insights and statistics

**Base URL**: `https://medici-backend.azurewebsites.net`
**Swagger Documentation**: https://medici-backend.azurewebsites.net/swagger/index.html

---

## Quick Start

### 1. Set Environment Variable

Add to your `.env.local`:

```bash
MEDICI_CLIENT_SECRET=your_client_secret_here
```

### 2. Test Connection

```bash
curl http://localhost:3000/api/medici/health
```

Expected response:
```json
{
  "healthy": true,
  "status": "operational",
  "connection": {
    "success": true,
    "message": "Successfully connected to Medici API"
  }
}
```

### 3. Search Hotels

```bash
curl -X POST http://localhost:3000/api/medici/search \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Tel Aviv",
    "checkIn": "2024-03-01",
    "checkOut": "2024-03-05",
    "stars": 4
  }'
```

---

## Setup

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MEDICI_CLIENT_SECRET` | Yes | - | Your Medici API client secret |
| `MEDICI_BASE_URL` | No | `https://medici-backend.azurewebsites.net` | API base URL |

### Database Setup (Optional)

**Option 1: Use Existing Tables** (Recommended for quick start)
- No database changes needed
- Medici data stored in `competitor_daily_prices` table
- Use `source = 'medici'` to filter Medici data

**Option 2: Dedicated Medici Tables** (Recommended for full integration)
1. Run the migration:
   ```sql
   -- In Supabase SQL Editor or your PostgreSQL client
   -- Run: lib/medici/migrations/001_medici_tables.sql
   ```

2. This creates:
   - `medici_opportunities` - Track opportunities
   - `medici_active_rooms` - Track purchased rooms
   - `medici_bookings` - Track sales and bookings
   - `medici_price_history` - Historical price data
   - `medici_sync_logs` - Sync operation logs

See [Database Integration](#database-integration) for details.

---

## API Endpoints

### Health Check

**GET** `/api/medici/health`

Check Medici API connection and configuration.

**Response:**
```json
{
  "healthy": true,
  "status": "operational",
  "config": { "valid": true },
  "connection": { "success": true }
}
```

---

### Search Hotels

**POST** `/api/medici/search`

Search for hotels and prices.

**Request Body:**
```json
{
  "city": "Tel Aviv",
  "checkIn": "2024-03-01",
  "checkOut": "2024-03-05",
  "stars": 4,
  "adults": 2,
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "hotelName": "Example Hotel",
      "city": "Tel Aviv",
      "stars": 4,
      "checkIn": "2024-03-01",
      "checkOut": "2024-03-05",
      "price": 450,
      "currency": "ILS",
      "roomType": "Standard",
      "availability": true
    }
  ]
}
```

**GET** `/api/medici/search?city=Tel Aviv&checkIn=2024-03-01&checkOut=2024-03-05`

Quick search with query parameters.

---

### Opportunities

**GET** `/api/medici/opportunities`

Get all opportunities or search by ID.

**Query Parameters:**
- `opportunityId` - Filter by opportunity ID
- `backOfficeId` - Filter by back office ID

**POST** `/api/medici/opportunities`

Create a new opportunity.

**Request Body:**
```json
{
  "hotelId": 12345,
  "startDateStr": "2024-03-01",
  "endDateStr": "2024-03-05",
  "boardId": 2,
  "categoryId": 1,
  "buyPrice": 100.00,
  "pushPrice": 150.00,
  "maxRooms": 5,
  "paxAdults": 2
}
```

---

### Rooms

**GET** `/api/medici/rooms?type=active&city=Tel Aviv`

Get rooms by type with filters.

**Query Parameters:**
- `type` - `active`, `sales`, `cancelled`, or `archive`
- `city` - Filter by city
- `hotelName` - Filter by hotel name
- `hotelStars` - Filter by stars
- `provider` - Filter by provider

**POST** `/api/medici/rooms`

Update room push price.

**Request Body:**
```json
{
  "preBookId": 12345,
  "pushPrice": 175.00
}
```

**DELETE** `/api/medici/rooms?preBookId=12345`

Cancel an active room.

---

### Bookings

**POST** `/api/medici/bookings`

Create bookings (prebook, book, or manual).

**Request Body:**
```json
{
  "type": "prebook",
  "opportunityId": 12345,
  "guestDetails": {}
}
```

Or for confirmation:
```json
{
  "type": "book",
  "jsonRequest": "{...}"
}
```

**DELETE** `/api/medici/bookings`

Cancel a booking.

---

### Dashboard

**GET** `/api/medici/dashboard?city=Tel Aviv`

Get dashboard statistics.

**Query Parameters:**
- `city` - Filter by city
- `hotelName` - Filter by hotel name
- `hotelStars` - Filter by stars
- `provider` - Filter by provider
- `reservationMonth` - Filter by reservation month (YYYY-MM)
- `checkInMonth` - Filter by check-in month (YYYY-MM)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalActiveRooms": 150,
    "totalSales": 45,
    "totalRevenue": 125000,
    "averagePrice": 450,
    "topCities": [...]
  }
}
```

---

### Sync (Price Tracking Integration)

**POST** `/api/medici/sync`

Sync Medici prices to your competitor tracking system.

**Request Body:**
```json
{
  "hotelId": 1,
  "competitorId": 5,
  "city": "Tel Aviv",
  "checkIn": "2024-03-01",
  "checkOut": "2024-03-05",
  "stars": 4
}
```

**Response:**
```json
{
  "success": true,
  "synced": 25,
  "message": "Successfully synced 25 Medici price records"
}
```

**GET** `/api/medici/sync/compare?yourPrice=450&city=Tel Aviv&checkIn=2024-03-01&checkOut=2024-03-05`

Compare your price with Medici market average.

**Response:**
```json
{
  "success": true,
  "data": {
    "yourPrice": 450,
    "marketAverage": 475,
    "difference": -25,
    "differencePercent": -5.26,
    "position": "below",
    "competitiveScore": 90,
    "recommendation": "Your price is 5.3% below Medici market average. Highly competitive!"
  }
}
```

---

## Usage Examples

### TypeScript/JavaScript

```typescript
import { getMediciClient } from '@/lib/medici';

// Initialize client
const medici = getMediciClient();

// Search hotels
const results = await medici.searchHotels(
  'Tel Aviv',
  '2024-03-01',
  '2024-03-05',
  {
    stars: 4,
    adults: 2,
    limit: 10,
  }
);

// Create opportunity
const opportunity = await medici.createOpportunity(
  12345,        // hotelId
  '2024-03-01', // checkIn
  '2024-03-05', // checkOut
  100,          // buyPrice
  150,          // pushPrice (sell price)
  5,            // maxRooms
  {
    boardId: 2,     // Bed & Breakfast
    categoryId: 1,  // Standard
    adults: 2,
  }
);

// Get active rooms for a city
const activeRooms = await medici.getActiveRoomsByCity('Tel Aviv');

// Get dashboard stats
const dashboard = await medici.getDashboardInfo({
  city: 'Tel Aviv',
  hotelStars: 4,
});
```

### Using Scraper Integration

```typescript
import {
  scrapeMediciPrices,
  comparePriceWithMedici,
  getMediciMarketAverage,
} from '@/lib/medici/scraper';

// Scrape Medici prices
const prices = await scrapeMediciPrices(
  'Tel Aviv',
  '2024-03-01',
  '2024-03-05',
  { stars: 4, limit: 20 }
);

// Get market average
const market = await getMediciMarketAverage(
  'Tel Aviv',
  '2024-03-01',
  '2024-03-05',
  4
);
console.log(`Average: ${market.averagePrice}, Range: ${market.minPrice}-${market.maxPrice}`);

// Compare your price
const comparison = await comparePriceWithMedici(
  450,          // your price
  'Tel Aviv',
  '2024-03-01',
  '2024-03-05',
  4             // stars
);
console.log(comparison.recommendation);
// "Your price is 5.3% below Medici market average. Highly competitive!"
```

### Using Utility Functions

```typescript
import {
  calculateProfitMargin,
  calculateRecommendedSellPrice,
  formatPrice,
  getBoardTypeName,
  validateOpportunity,
} from '@/lib/medici/utils';

// Calculate profit margin
const margin = calculateProfitMargin(100, 150); // 33.33%

// Get recommended sell price for 20% margin
const sellPrice = calculateRecommendedSellPrice(100, 20); // 125

// Format price
const formatted = formatPrice(450, 'ILS'); // "₪450.00"

// Get board type name
const boardName = getBoardTypeName(2); // "Bed & Breakfast"

// Validate opportunity before creating
const validation = validateOpportunity({
  buyPrice: 100,
  pushPrice: 150,
  maxRooms: 5,
  startDateStr: '2024-03-01',
  endDateStr: '2024-03-05',
});
if (!validation.valid) {
  console.error(validation.errors);
}
```

---

## Database Integration

### Using Existing Tables

1. **Add Medici as a competitor:**
```sql
INSERT INTO hotel_competitors (hotel_id, competitor_name, competitor_url, is_active)
VALUES (1, 'Medici Hotels', 'https://medici-backend.azurewebsites.net', true);
```

2. **Sync Medici prices:**
```bash
curl -X POST http://localhost:3000/api/medici/sync \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId": 1,
    "competitorId": 5,
    "city": "Tel Aviv",
    "checkIn": "2024-03-01",
    "checkOut": "2024-03-05"
  }'
```

3. **Query Medici prices:**
```sql
SELECT * FROM competitor_daily_prices
WHERE source = 'medici'
ORDER BY date DESC;
```

### Using Dedicated Tables

1. **Run migration:**
   - Execute `lib/medici/migrations/001_medici_tables.sql` in Supabase

2. **Query opportunities:**
```sql
SELECT
  hotel_name,
  city,
  start_date,
  end_date,
  buy_price,
  push_price,
  profit_margin,
  available_rooms
FROM medici_opportunities
WHERE profit_margin > 20
  AND available_rooms > 0
  AND status = 'active'
ORDER BY profit_margin DESC;
```

3. **Query active rooms:**
```sql
SELECT
  hotel_name,
  city,
  nights,
  total_buy_cost,
  total_push_revenue,
  total_push_revenue - total_buy_cost as total_profit
FROM medici_active_rooms
WHERE status = 'active'
ORDER BY total_profit DESC;
```

4. **Market analysis:**
```sql
SELECT
  city,
  check_in::date,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price,
  COUNT(*) as hotel_count
FROM medici_price_history
WHERE scraped_at > NOW() - INTERVAL '7 days'
GROUP BY city, check_in::date
ORDER BY city, check_in;
```

---

## Troubleshooting

### Connection Issues

**Problem:** "Failed to connect to Medici API"

**Solutions:**
1. Check `MEDICI_CLIENT_SECRET` is set correctly
2. Test with: `curl http://localhost:3000/api/medici/health`
3. Verify network connectivity to `https://medici-backend.azurewebsites.net`
4. Check Swagger UI is accessible: https://medici-backend.azurewebsites.net/swagger

### Authentication Errors

**Problem:** "Authentication Failed"

**Solutions:**
1. Verify your `MEDICI_CLIENT_SECRET` is correct
2. Check if the secret has expired
3. Contact Medici support for new credentials

### No Search Results

**Problem:** Empty results from search

**Solutions:**
1. Try broader search criteria (remove filters)
2. Check if dates are in the future
3. Verify the city name is correct
4. Try different date ranges

### Sync Errors

**Problem:** "Failed to sync Medici data"

**Solutions:**
1. Ensure the hotel and competitor exist in your database
2. Check Supabase connection
3. Verify the competitor_daily_prices table exists
4. Check Supabase service role key is set

### Common Error Codes

| Code | Error | Solution |
|------|-------|----------|
| 400 | Bad Request | Check required fields in request body |
| 401 | Unauthorized | Verify MEDICI_CLIENT_SECRET |
| 404 | Not Found | Check API endpoint URL |
| 408 | Timeout | Network issue, retry request |
| 500 | Server Error | Check Medici API status |
| 503 | Service Unavailable | Medici API may be down |

---

## API Reference

**Board Types:**
- 1 = Room Only
- 2 = Bed & Breakfast
- 3 = Half Board
- 4 = Full Board
- 5 = All Inclusive

**Category Types:**
- 1 = Standard
- 2 = Superior
- 3 = Deluxe
- 4 = Suite
- 5 = Executive

---

## Support

- **Medici API Issues**: Contact Medici Hotels support
- **Integration Issues**: Check logs and health endpoint
- **Documentation**: See `/lib/medici/README.md`
- **Database Schema**: See `/lib/medici/database-schema.md`

---

## Files Structure

```
lib/medici/
├── client.ts              # Main API client
├── types.ts               # TypeScript types
├── scraper.ts             # Competitor integration
├── utils.ts               # Utility functions
├── index.ts               # Exports
├── README.md              # Component docs
├── database-schema.md     # DB schema docs
└── migrations/
    └── 001_medici_tables.sql  # DB migration

app/api/medici/
├── search/route.ts        # Search endpoint
├── opportunities/route.ts # Opportunities endpoint
├── rooms/route.ts         # Rooms endpoint
├── bookings/route.ts      # Bookings endpoint
├── dashboard/route.ts     # Dashboard endpoint
├── sync/route.ts          # Sync endpoint
└── health/route.ts        # Health check endpoint
```

---

## Next Steps

1. ✅ Set `MEDICI_CLIENT_SECRET` environment variable
2. ✅ Test connection: `GET /api/medici/health`
3. ✅ Search hotels: `POST /api/medici/search`
4. ✅ Add Medici as competitor in your database
5. ✅ Sync prices: `POST /api/medici/sync`
6. ✅ (Optional) Run database migration for dedicated tables
7. ✅ Integrate into your dashboard and price tracking workflows

Happy coding! 🚀
