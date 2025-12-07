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

This project uses Bright Data for scraping hotel prices from Booking.com. To set it up:

1. See **[BRIGHT_DATA_SETUP.md](./BRIGHT_DATA_SETUP.md)** for detailed setup instructions
2. Configure environment variables in Vercel:
   - `BRIGHT_DATA_USERNAME` - Your Bright Data username (format: `brd-customer-<id>-zone-scraping_browser`)
   - `BRIGHT_DATA_PASSWORD` - Your Bright Data password
   - `TAVILY_API_KEY` - Your Tavily API key for search

**Important**: Make sure your zone name is `scraping_browser` without any number suffix!