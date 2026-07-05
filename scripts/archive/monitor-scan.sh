#!/bin/bash

echo "📊 Monitoring 90-day scan progress..."
echo "================================================"
echo ""

# Monitor the logs in real-time
tail -f /tmp/next-server.log | grep --line-buffered -E "Scraping date:|SUCCESS|rooms|competitor" | while read line; do
    if [[ "$line" == *"Scraping date"* ]]; then
        echo "📅 $line"
    elif [[ "$line" == *"SUCCESS"* ]]; then
        echo "✅ $line"
    elif [[ "$line" == *"rooms"* ]]; then
        echo "🛏️  $line"
    fi
done
