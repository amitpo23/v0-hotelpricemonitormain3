#!/usr/bin/env python3
"""
Booking.com Price Scraper v6 - Enhanced Edition
Uses Playwright to scrape hotel prices with retry mechanism, logging, and error handling
"""

import sys
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds
PAGE_LOAD_TIMEOUT = 30000  # 30 seconds
WAIT_AFTER_LOAD = 1.5  # seconds
REQUEST_DELAY = 1  # seconds between requests

async def dismiss_popups(page):
    """Dismiss cookie consent and other popups"""
    try:
        # Try to close cookie consent
        cookie_selectors = [
            'button[id*="onetrust-accept"]',
            'button[id*="cookie-accept"]',
            'button:has-text("Accept")',
            'button:has-text("I agree")',
            '[aria-label*="Accept"]',
            '#gdpr-cookie-accept'
        ]

        for selector in cookie_selectors:
            try:
                button = page.locator(selector).first
                if await button.is_visible(timeout=2000):
                    await button.click()
                    logger.info("Dismissed cookie popup")
                    await asyncio.sleep(0.5)
                    break
            except:
                continue
    except Exception as e:
        logger.debug(f"No popups to dismiss or error: {e}")


async def scrape_single_date_with_retry(
    page,
    hotel_url: str,
    check_in_str: str,
    check_out_str: str,
    room_types: List[str]
) -> List[Dict]:
    """Scrape a single date with retry mechanism"""

    for attempt in range(MAX_RETRIES):
        try:
            url = f"{hotel_url}?checkin={check_in_str}&checkout={check_out_str}&group_adults=2&group_children=0&no_rooms=1"

            logger.info(f"Scraping {check_in_str} (attempt {attempt + 1}/{MAX_RETRIES})")

            # Navigate to page
            await page.goto(url, wait_until='networkidle', timeout=PAGE_LOAD_TIMEOUT)

            # Dismiss popups
            await dismiss_popups(page)

            # Wait for content to load
            await asyncio.sleep(WAIT_AFTER_LOAD)

            # Check if hotel is available
            no_availability = await page.locator('text=/no availability|sold out|not available/i').count() > 0

            if no_availability:
                logger.info(f"No availability for {check_in_str}")
                return [{
                    'date': check_in_str,
                    'price': None,
                    'currency': 'ILS',
                    'room_type': 'unavailable',
                    'available': False
                }]

            # Extract room prices
            price_selectors = [
                '[data-testid="price-and-discounted-price"]',
                '.prco-valign-middle-helper',
                '.bui-price-display__value',
                '.prco-text-nowrap-helper',
                'span[aria-hidden="true"]'
            ]

            room_blocks = await page.locator('[data-testid="property-card-container"], .hprt-table-row, [data-block-id]').all()

            if not room_blocks:
                room_blocks = await page.locator('.room-block, .hprt-table tbody tr').all()

            results = []
            for room_block in room_blocks[:10]:
                try:
                    # Get room description
                    room_desc_elem = room_block.locator('.hprt-roomtype-icon-link, [data-testid="title"], .room-name')
                    room_desc = await room_desc_elem.first.inner_text() if await room_desc_elem.count() > 0 else ""
                    room_desc = room_desc.lower()

                    # Determine room type
                    has_breakfast = any(keyword in room_desc for keyword in ['breakfast', 'ארוחת בוקר', 'כולל ארוחה'])
                    room_type = 'with_breakfast' if has_breakfast else 'room_only'

                    if room_type not in room_types:
                        continue

                    # Extract price
                    price_text = None
                    for selector in price_selectors:
                        price_elem = room_block.locator(selector)
                        if await price_elem.count() > 0:
                            price_text = await price_elem.first.inner_text()
                            if price_text and any(c.isdigit() for c in price_text):
                                break

                    if not price_text:
                        continue

                    # Parse price
                    price_clean = ''.join(c for c in price_text if c.isdigit() or c == '.')
                    if not price_clean:
                        continue

                    price = float(price_clean)

                    # Detect currency
                    currency = 'ILS'
                    if '₪' in price_text or 'ILS' in price_text:
                        currency = 'ILS'
                    elif '$' in price_text or 'USD' in price_text:
                        currency = 'USD'
                    elif '€' in price_text or 'EUR' in price_text:
                        currency = 'EUR'

                    results.append({
                        'date': check_in_str,
                        'price': price,
                        'currency': currency,
                        'room_type': room_type,
                        'available': True
                    })

                except Exception as e:
                    logger.debug(f"Error extracting room data: {e}")
                    continue

            if results:
                logger.info(f"Found {len(results)} prices for {check_in_str}")
                return results
            else:
                logger.warning(f"No prices found for {check_in_str}")
                return [{
                    'date': check_in_str,
                    'price': None,
                    'currency': 'ILS',
                    'room_type': 'unavailable',
                    'available': False
                }]

        except PlaywrightTimeout:
            logger.warning(f"Timeout for {check_in_str}, attempt {attempt + 1}")
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY)
                continue
            else:
                return [{
                    'date': check_in_str,
                    'price': None,
                    'currency': 'ILS',
                    'room_type': 'error',
                    'available': False,
                    'error': 'timeout'
                }]

        except Exception as e:
            logger.error(f"Error scraping {check_in_str}: {str(e)}")
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY)
                continue
            else:
                return [{
                    'date': check_in_str,
                    'price': None,
                    'currency': 'ILS',
                    'room_type': 'error',
                    'available': False,
                    'error': str(e)
                }]

    return []


async def scrape_hotel_prices(hotel_url: str, days_forward: int = 60, room_types: list = None):
    """
    Scrape hotel prices from Booking.com for multiple dates

    Args:
        hotel_url: Base Booking.com hotel URL
        days_forward: Number of days to scan forward
        room_types: List of room types to filter (e.g., ['room_only', 'with_breakfast'])

    Returns:
        List of price results with date, price, currency, room type, availability
    """
    if room_types is None:
        room_types = ['room_only', 'with_breakfast']

    logger.info(f"Starting scrape for {days_forward} days")
    results = []

    async with async_playwright() as p:
        # Launch browser in headless mode
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US'
        )

        # Set extra headers to appear more human-like
        await context.set_extra_http_headers({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        })

        try:
            page = await context.new_page()

            # Iterate through dates
            for day_offset in range(days_forward):
                check_in = datetime.now() + timedelta(days=day_offset)
                check_out = check_in + timedelta(days=1)

                check_in_str = check_in.strftime('%Y-%m-%d')
                check_out_str = check_out.strftime('%Y-%m-%d')

                # Scrape this date with retry mechanism
                date_results = await scrape_single_date_with_retry(
                    page, hotel_url, check_in_str, check_out_str, room_types
                )

                results.extend(date_results)

                # Delay between requests to avoid rate limiting
                await asyncio.sleep(REQUEST_DELAY)

            logger.info(f"Scraping completed. Total results: {len(results)}")

        finally:
            await page.close()
            await browser.close()

    return results


async def main():
    """Main entry point for CLI usage"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python scraper_v5.py <hotel_url> [days_forward] [room_types_json]'
        }))
        sys.exit(1)
    
    hotel_url = sys.argv[1]
    days_forward = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    room_types = json.loads(sys.argv[3]) if len(sys.argv) > 3 else ['room_only', 'with_breakfast']
    
    try:
        results = await scrape_hotel_prices(hotel_url, days_forward, room_types)
        print(json.dumps({
            'success': True,
            'results': results
        }))
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
