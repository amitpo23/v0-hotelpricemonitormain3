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

#### Recommended Setup: Tavily API

The scraper uses **Tavily Search API** for reliable scraping that works on Vercel:

1. Get a Tavily API key from [Tavily.com](https://tavily.com)
2. Configure in Vercel **Environment Variables**:
   ```
   TAVILY_API_KEY=tvly-xxxxxxxxxx
   ```
3. Redeploy your project

#### Alternative Methods (Built-in)

The scraper also tries these methods automatically:
- Direct Booking.com API calls (may be blocked by CAPTCHA)
- HTML parsing of search results

#### Why Not Bright Data?

Bright Data and Puppeteer **do not work** on Vercel because:
- No Chrome/Chromium available
- 50MB bundle size limit
- Cannot run browser processes
- Limited execution time

See **[BRIGHT_DATA_SETUP.md](./BRIGHT_DATA_SETUP.md)** for more details about limitations.