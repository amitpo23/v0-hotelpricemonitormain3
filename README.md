# hotelpricemonitormain3

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/guyofiror/v0-hotelpricemonitormain3-yx)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/UurNYsnzDWP)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/guyofiror/v0-hotelpricemonitormain3-yx](https://vercel.com/guyofiror/v0-hotelpricemonitormain3-yx)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/UurNYsnzDWP](https://v0.app/chat/UurNYsnzDWP)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Features

### Cockpit - Hotel Revenue Command Center

A comprehensive hotel price monitoring and revenue management system with:

- 🏨 **Hotel Management** - Manage multiple properties
- 📊 **Competitor Tracking** - Monitor competitor prices from Booking.com, Expedia, and more
- 🤖 **Price Predictions** - AI-powered pricing recommendations
- ⚡ **Autopilot** - Automated pricing rules and actions
- 📈 **Analytics** - Revenue tracking and performance insights
- 📅 **Booking Management** - Import and manage reservations
- 🌐 **Market Intelligence** - External data integration (holidays, trends, STR)

### Medici Hotels API Integration

**NEW**: Full integration with Medici Hotels API for inventory acquisition and competitive intelligence.

**Key Features:**
- 🔍 Search hotel inventory and prices
- 💼 Opportunity management
- 🛏️ Room tracking (active, sales, cancellations)
- 📑 Booking operations (pre-book, confirm, manual)
- 💰 Price comparison and market analysis
- 📊 Dashboard analytics

**Quick Start:**

1. Set environment variable:
   ```bash
   MEDICI_CLIENT_SECRET=your_client_secret
   ```

2. Test connection:
   ```bash
   curl http://localhost:3000/api/medici/health
   ```

3. Search hotels:
   ```bash
   curl -X POST http://localhost:3000/api/medici/search \
     -H "Content-Type: application/json" \
     -d '{"city":"Tel Aviv","checkIn":"2024-03-01","checkOut":"2024-03-05"}'
   ```

**Documentation:** See [MEDICI_INTEGRATION.md](MEDICI_INTEGRATION.md) for complete guide.

## Environment Variables

Required environment variables:

```bash
# Supabase
SUPABASE_SERVICE_ROLE_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# Medici Hotels API
MEDICI_CLIENT_SECRET=your_client_secret

# Optional: Scraping Services
TAVILY_API_KEY=your_key
SCRAPER_API_KEY=your_key
```

See `.env.example` for full configuration.

## API Endpoints

### Medici Hotels Integration

- `GET /api/medici/health` - Health check
- `POST /api/medici/search` - Search hotels
- `GET/POST /api/medici/opportunities` - Manage opportunities
- `GET/POST/DELETE /api/medici/rooms` - Manage rooms
- `POST/DELETE /api/medici/bookings` - Manage bookings
- `GET/POST /api/medici/dashboard` - Dashboard stats
- `POST /api/medici/sync` - Sync with price tracking
- `GET /api/medici/sync/compare` - Compare prices

### Core Application

- `GET/POST /api/hotels` - Hotel management
- `POST /api/scans/execute` - Execute price scan
- `POST /api/predictions/generate` - Generate predictions
- `GET/POST /api/autopilot` - Automation rules
- `GET/POST /api/bookings` - Booking management
- And many more...

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **Deployment:** Vercel

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Documentation

- [Medici Integration Guide](MEDICI_INTEGRATION.md) - Complete Medici Hotels API setup and usage
- [Database Schema](lib/medici/database-schema.md) - Database schema for Medici integration
- [API Reference](lib/medici/README.md) - Medici API client documentation