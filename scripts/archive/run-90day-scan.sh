#!/bin/bash

echo "🚀 Starting 90-day scan directly..."
echo "📅 Scanning January 1 - March 31, 2026"
echo "⏰ Started at: $(date)"
echo ""

# Run the scan directly by calling the scraper for each competitor and date
cd /workspaces/v0-hotelpricemonitormain3

/home/codespace/.python/current/bin/python3 << 'PYTHON_SCRIPT'
import asyncio
import subprocess
import json
from datetime import datetime, timedelta
import sys

async def run_scraper_for_date(hotel_url, date_str, room_types):
    """Run scraper for a specific date"""
    cmd = [
        '/home/codespace/.python/current/bin/python3',
        'scraper_v5.py',
        hotel_url,
        '1',  # 1 day forward
        json.dumps(room_types),
        date_str
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return data
        else:
            return {"success": False, "error": result.stderr}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def main():
    # Configuration
    hotel_id = "716e1e8f-3537-4f67-875d-de3a89642175"
    
    # Get competitors from database
    import os
    supabase_url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    # For now, using sample competitors - in production, fetch from DB
    competitors = [
        {"url": "https://www.booking.com/hotel/il/the-rothschild-hotel-tel-aviv.html", "name": "Rothschild Hotel"},
        # Add more competitors here
    ]
    
    room_types = ["room_only", "breakfast_included"]
    
    # Generate dates for 90 days (Jan 1 - Mar 31, 2026)
    start_date = datetime(2026, 1, 1)
    dates = [start_date + timedelta(days=i) for i in range(90)]
    
    total_scans = len(competitors) * len(dates)
    completed = 0
    success_count = 0
    
    print(f"📊 Total scans to perform: {total_scans}")
    print(f"📍 Competitors: {len(competitors)}")
    print(f"📅 Days: {len(dates)}")
    print("")
    
    for competitor in competitors:
        print(f"\n🏨 Scanning: {competitor['name']}")
        for date in dates:
            date_str = date.strftime('%Y-%m-%d')
            result = await run_scraper_for_date(competitor['url'], date_str, room_types)
            
            completed += 1
            if result.get('success'):
                success_count += 1
                prices = result.get('results', [])
                if prices:
                    print(f"  ✅ {date_str}: {len(prices)} prices found")
                else:
                    print(f"  ⚠️  {date_str}: No prices")
            else:
                print(f"  ❌ {date_str}: {result.get('error', 'Unknown error')}")
            
            # Progress update every 10 scans
            if completed % 10 == 0:
                progress = (completed / total_scans) * 100
                print(f"\n📈 Progress: {completed}/{total_scans} ({progress:.1f}%) - Success: {success_count}")
    
    print(f"\n✅ Scan completed!")
    print(f"📊 Results: {success_count}/{total_scans} successful")
    print(f"⏰ Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    asyncio.run(main())
PYTHON_SCRIPT
