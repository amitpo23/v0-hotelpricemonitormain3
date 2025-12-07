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

## Configuration

### Booking.com Scraper Setup

⚠️ **Important**: This project runs on Vercel Serverless Functions, which **cannot** run Puppeteer or browser automation tools.

#### Recommended Setup: Choose One

**Option 1: Tavily API (Best for search-based scraping)**
1. Get a Tavily API key from [Tavily.com](https://tavily.com)
2. Configure in Vercel **Environment Variables**:
   ```
   TAVILY_API_KEY=tvly-xxxxxxxxxx
   ```

**Option 2: ScraperAPI (Best for bypassing blocks)**
1. Get a ScraperAPI key from [ScraperAPI.com](https://www.scraperapi.com/)
2. Configure in Vercel **Environment Variables**:
   ```
   SCRAPER_API_KEY=your-api-key-here
   ```

**You can use both!** The scraper will try:
1. Tavily first (fastest)
2. ScraperAPI second (bypasses blocks)
3. Direct API calls (fallback)
4. HTML parsing (fallback)

Then redeploy your project.

#### How It Works

The scraper tries multiple methods in order:
- **Tavily Search**: Fast AI-powered search (needs `TAVILY_API_KEY`)
- **ScraperAPI**: Bypasses CAPTCHA and blocks (needs `SCRAPER_API_KEY`)
- **Direct Booking.com API**: Free but may be blocked
- **HTML Parsing**: Free but may be blocked

#### Why Not Bright Data?

Bright Data and Puppeteer **do not work** on Vercel because:
- No Chrome/Chromium available
- 50MB bundle size limit
- Cannot run browser processes
- Limited execution time

See **[BRIGHT_DATA_SETUP.md](./BRIGHT_DATA_SETUP.md)** for more details about limitations.