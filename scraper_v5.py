#!/usr/bin/env python3
"""
Booking.com Price Scraper v5
Uses Playwright to scrape hotel prices for multiple dates and room types
"""

import sys
import json
import asyncio
from datetime import datetime, timedelta
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

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
    
    results = []
    
    async with async_playwright() as p:
        # Launch browser in headless mode
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        
        try:
            # Iterate through dates
            for day_offset in range(days_forward):
                check_in = datetime.now() + timedelta(days=day_offset)
                check_out = check_in + timedelta(days=1)
                
                check_in_str = check_in.strftime('%Y-%m-%d')
                check_out_str = check_out.strftime('%Y-%m-%d')
                
                # Build URL with date parameters
                url = f"{hotel_url}?checkin={check_in_str}&checkout={check_out_str}&group_adults=2&group_children=0&no_rooms=1"
                
                page = await context.new_page()
                
                try:
                    # Navigate to page
                    await page.goto(url, wait_until='networkidle', timeout=30000)
                    
                    # Wait for price elements to load
                    await asyncio.sleep(2)
                    
                    # Check if hotel is available
                    no_availability = await page.locator('text=/no availability|sold out|not available/i').count() > 0
                    
                    if no_availability:
                        results.append({
                            'date': check_in_str,
                            'price': None,
                            'currency': 'ILS',
                            'room_type': 'unavailable',
                            'available': False
                        })
                        await page.close()
                        continue
                    
                    # Extract room prices
                    # Try multiple selectors for price elements
                    price_selectors = [
                        '[data-testid="price-and-discounted-price"]',
                        '.prco-valign-middle-helper',
                        '.bui-price-display__value',
                        '.prco-text-nowrap-helper',
                        'span[aria-hidden="true"]'
                    ]
                    
                    room_blocks = await page.locator('[data-testid="property-card-container"], .hprt-table-row, [data-block-id]').all()
                    
                    if not room_blocks:
                        # Try alternative structure
                        room_blocks = await page.locator('.room-block, .hprt-table tbody tr').all()
                    
                    for room_block in room_blocks[:10]:  # Limit to first 10 rooms
                        try:
                            # Get room description
                            room_desc_elem = room_block.locator('.hprt-roomtype-icon-link, [data-testid="title"], .room-name')
                            room_desc = await room_desc_elem.first.inner_text() if await room_desc_elem.count() > 0 else ""
                            room_desc = room_desc.lower()
                            
                            # Determine room type based on description
                            has_breakfast = any(keyword in room_desc for keyword in ['breakfast', 'ארוחת בוקר', 'כולל ארוחה'])
                            room_type = 'with_breakfast' if has_breakfast else 'room_only'
                            
                            # Skip if not in requested room types
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
                            
                            # Parse price (remove currency symbols and commas)
                            price_clean = ''.join(c for c in price_text if c.isdigit() or c == '.')
                            if not price_clean:
                                continue
                            
                            price = float(price_clean)
                            
                            # Detect currency
                            currency = 'ILS'  # Default
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
                            # Skip this room block if extraction fails
                            continue
                    
                    # If no prices found, mark as unavailable
                    if not any(r['date'] == check_in_str for r in results):
                        results.append({
                            'date': check_in_str,
                            'price': None,
                            'currency': 'ILS',
                            'room_type': 'unavailable',
                            'available': False
                        })
                    
                except PlaywrightTimeout:
                    results.append({
                        'date': check_in_str,
                        'price': None,
                        'currency': 'ILS',
                        'room_type': 'error',
                        'available': False,
                        'error': 'timeout'
                    })
                except Exception as e:
                    results.append({
                        'date': check_in_str,
                        'price': None,
                        'currency': 'ILS',
                        'room_type': 'error',
                        'available': False,
                        'error': str(e)
                    })
                finally:
                    await page.close()
                
                # Small delay between requests
                await asyncio.sleep(1)
        
        finally:
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
