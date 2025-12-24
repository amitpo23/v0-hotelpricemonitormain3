# Hotel Price Monitor

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/guyofiror/v0-hotelpricemonitormain3-yx)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/UurNYsnzDWP)

## Overview

A comprehensive hotel price monitoring and revenue management system that tracks competitor pricing, analyzes market trends, and provides intelligent pricing recommendations.

### Key Features

- **Real-time Price Scraping**: Automated competitor price monitoring using Apify
- **Market Intelligence**: AI-powered insights using Perplexity AI
- **Revenue Predictions**: Advanced algorithms for demand forecasting
- **Competitor Analysis**: Track and compare multiple competitors
- **Budget Management**: Yearly budget planning and tracking
- **Analytics Dashboard**: Comprehensive data visualization

## Prerequisites

Before setting up the project, ensure you have:

1. **Supabase Account**: For database and authentication
2. **Apify Account**: For web scraping functionality
   - Sign up at [apify.com](https://apify.com)
   - Get your API token from [console.apify.com/account/integrations](https://console.apify.com/account/integrations)
3. **Perplexity AI Account** (Optional): For LLM-enhanced predictions

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/amitpo23/v0-hotelpricemonitormain3.git
cd v0-hotelpricemonitormain3
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Apify Configuration (Required)
APIFY_API_KEY=your_apify_api_token

# Perplexity AI (Optional)
PERPLEXITY_API_KEY=your_perplexity_api_key
```

### 4. Apify Actor Setup

This project uses a custom Apify Actor for scraping. The Actor ID is: `poetic_ant/v0-hotelpricemonitormain3`

**Important**: Make sure you have access to this actor or deploy your own:

1. Go to [Apify Console](https://console.apify.com)
2. Navigate to Actors
3. Verify the actor `poetic_ant/v0-hotelpricemonitormain3` is available
4. Or use the fallback actor: `oeiQgfg5fsmIJB7Cn` for Booking.com scraping

### 5. Database Setup

Run the database migration scripts:

```bash
# Run the setup scripts from the scripts/ directory
psql -h your_supabase_host -U postgres -d postgres -f scripts/001_create_hotel_tables.sql
```

### 6. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Architecture

### Scraping System

The project uses two approaches for scraping:

1. **New Apify Integration** ([lib/scraper/apify-scraper-integration.ts](lib/scraper/apify-scraper-integration.ts))
   - Custom actor: `poetic_ant/v0-hotelpricemonitormain3`
   - Handles multiple competitors in a single run
   - Directly saves to Supabase

2. **Fallback Booking.com Scraper** ([lib/scraper/booking-scraper.tsx](lib/scraper/booking-scraper.tsx))
   - Uses actor: `oeiQgfg5fsmIJB7Cn`
   - Individual hotel scraping
   - HTML parsing for room details

### API Endpoints

- `POST /api/scans/execute` - Execute a scan for competitors
- `POST /api/scans/batch` - Batch scan multiple configurations
- `GET /api/predictions/generate` - Generate price predictions
- `GET /api/analytics/*` - Analytics and reporting endpoints

## Deployment

Your project is live at:

**[https://vercel.com/guyofiror/v0-hotelpricemonitormain3-yx](https://vercel.com/guyofiror/v0-hotelpricemonitormain3-yx)**

### Deploying to Vercel

1. Push your changes to GitHub
2. Vercel will automatically deploy
3. **⚠️ IMPORTANT**: Add environment variables in Vercel dashboard
   - Go to: **Settings → Environment Variables**
   - Add `APIFY_API_KEY` and all other variables from `.env.example`
   - **Select all environments**: Production, Preview, Development
   - **Redeploy** after adding variables

📖 **Detailed Vercel Setup Guide**: See [docs/VERCEL_ENV_SETUP.md](docs/VERCEL_ENV_SETUP.md)
   - Settings → Environment Variables
   - Add all variables from `.env.local`

## Troubleshooting

### Apify Issues

If scraping fails:

1. **Check API Key**: Verify your `APIFY_API_KEY` is set correctly
2. **Actor Access**: Ensure you have access to the actor `poetic_ant/v0-hotelpricemonitormain3`
3. **Credits**: Check your Apify account has sufficient credits
4. **Logs**: Check Apify console for actor run logs

### Common Errors

- `Missing APIFY_API_KEY`: Add the key to your environment variables
- `Actor not found`: Verify actor ID and access permissions
- `Actor run failed`: Check actor logs in Apify console

## Build your app

Continue building your app on:

**[https://v0.app/chat/UurNYsnzDWP](https://v0.app/chat/UurNYsnzDWP)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Contributing

This is an auto-synced repository from v0.app. For major changes, please work through the v0 interface.

## License

MIT