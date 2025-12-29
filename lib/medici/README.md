# Medici Hotels API Integration

This directory contains the complete integration with the Medici Hotels API, providing access to hotel inventory, pricing, opportunities, and booking management.

## Overview

**Base URL**: `https://medici-backend.azurewebsites.net`
**API Version**: v1
**Authentication**: Basic Authentication with client_secret
**Swagger UI**: https://medici-backend.azurewebsites.net/swagger/index.html

## Setup

### 1. Environment Variables

Add the following to your `.env.local` file:

```bash
# Medici Hotels API Configuration
MEDICI_CLIENT_SECRET=your_client_secret_here
MEDICI_BASE_URL=https://medici-backend.azurewebsites.net
```

### 2. Usage

```typescript
import { getMediciClient } from '@/lib/medici';

// Get the singleton client instance
const medici = getMediciClient();

// Search for hotels
const results = await medici.searchHotels(
  'Barcelona',
  '2024-03-01',
  '2024-03-05',
  {
    stars: 4,
    adults: 2,
    limit: 10,
  }
);

// Get active rooms
const activeRooms = await medici.getActiveRoomsByCity('Barcelona');

// Create an opportunity
const opportunity = await medici.createOpportunity(
  12345, // hotelId
  '2024-03-01', // checkIn
  '2024-03-05', // checkOut
  100.00, // buyPrice
  150.00, // pushPrice
  5, // maxRooms
);

// Get dashboard statistics
const dashboard = await medici.getDashboardInfo({
  city: 'Barcelona',
  hotelStars: 4,
});
```

## API Endpoints

### Authentication

- **POST** `/api/auth/OnlyNightUsersTokenAPI` - Get authentication token

### Room Management

- **POST** `/api/hotels/GetRoomsActive` - Get all active (purchased) rooms
- **POST** `/api/hotels/GetRoomsSales` - Get sold rooms
- **POST** `/api/hotels/GetRoomsCancel` - Get cancelled rooms
- **DELETE** `/api/hotels/CancelRoomActive` - Cancel a room by prebookId
- **POST** `/api/hotels/GetRoomArchiveData` - Get historical room data

### Opportunity Management

- **POST** `/api/hotels/GetOpportunities` - List all opportunities
- **POST** `/api/hotels/InsertOpportunity` - Create new opportunity
- **POST** `/api/hotels/GetOpportiunitiesByBackOfficeId` - Get by BackOffice ID
- **POST** `/api/hotels/GetOpportiunitiesHotelSearch` - Search opportunities

### Booking Operations

- **POST** `/api/hotels/PreBook` - Create pre-booking
- **POST** `/api/hotels/Book` - Confirm booking
- **POST** `/api/hotels/ManualBook` - Manual booking by code
- **DELETE** `/api/hotels/CancelRoomDirectJson` - Cancel room with JSON

### Price & Search

- **POST** `/api/hotels/GetInnstantSearchPrice` - Search Innstant API
- **POST** `/api/hotels/UpdateRoomsActivePushPrice` - Update push price
- **POST** `/api/hotels/GetDashboardInfo` - Get dashboard statistics

## Type Definitions

All API request and response types are fully typed in `types.ts`:

- `InsertOpp` - Create opportunity request
- `ApiInnstantSearchPrice` - Search request
- `RoomsActiveApiParams` - Room filters
- `DashboardApiParams` - Dashboard filters
- `SearchPriceResult` - Search results
- `Opportunity` - Opportunity data
- `RoomActive` - Active room data
- `BookResponse` - Booking confirmation

## Board Types (Meal Plans)

```typescript
enum BoardType {
  ROOM_ONLY = 1,
  BED_AND_BREAKFAST = 2,
  HALF_BOARD = 3,
  FULL_BOARD = 4,
  ALL_INCLUSIVE = 5,
}
```

## Category Types (Room Categories)

```typescript
enum CategoryType {
  STANDARD = 1,
  SUPERIOR = 2,
  DELUXE = 3,
  SUITE = 4,
  EXECUTIVE = 5,
}
```

## Error Handling

The client automatically handles:

- Token refresh (automatic re-authentication)
- Request timeouts (default 30 seconds)
- Network errors
- API errors with detailed error messages

All errors are typed as `MediciApiError`:

```typescript
interface MediciApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}
```

## Features

### Automatic Authentication

The client automatically:
- Authenticates on first request
- Stores the access token
- Refreshes expired tokens
- Handles authentication failures

### Helper Methods

Convenient helper methods for common operations:

```typescript
// Search hotels
await medici.searchHotels(city, checkIn, checkOut, options);

// Get rooms by city
await medici.getActiveRoomsByCity(city);

// Get rooms by hotel
await medici.getActiveRoomsByHotel(hotelName);

// Create opportunity
await medici.createOpportunity(hotelId, checkIn, checkOut, buyPrice, pushPrice, maxRooms);
```

## Integration with Price Monitoring

The Medici API can be used as:

1. **Competitor Data Source** - Track Medici inventory prices
2. **Booking Channel** - Create opportunities and bookings
3. **Market Intelligence** - Analyze dashboard data for trends
4. **Inventory Management** - Monitor active rooms and sales

See `/lib/medici/scraper.ts` for integration with the existing competitor price tracking system.

## Files

- `types.ts` - TypeScript type definitions
- `client.ts` - Main API client implementation
- `index.ts` - Export entry point
- `README.md` - This documentation

## API Documentation

Full Swagger documentation: https://medici-backend.azurewebsites.net/swagger/index.html

## Support

For API issues, contact Medici Hotels API support.
For integration issues, see the main project README.
