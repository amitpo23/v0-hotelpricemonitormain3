#!/bin/bash

echo "🔍 בודק מחירים אמיתיים בבסיס הנתונים"
echo ""

# Connect to database and check
PGPASSWORD="Aa123456" psql -h aws-0-us-east-1.pooler.supabase.com -p 6543 -U postgres.nrfucvwvsjhojlcsbjuw -d postgres << 'SQL'
\echo '📊 10 רשומות אחרונות מבסיס הנתונים:\n'

SELECT 
  TO_CHAR(scraped_at, 'HH24:MI:SS') as time,
  DATE(date) as date,
  source,
  price,
  currency,
  room_type
FROM competitor_daily_prices
WHERE hotel_id = '716e1e8f-3537-4f67-875d-de3a89642175'
  AND date >= '2026-01-10'
ORDER BY scraped_at DESC
LIMIT 10;

\echo '\n📈 סיכום לפי מקור:\n'

SELECT 
  source,
  COUNT(*) as count,
  MIN(price) as min_price,
  MAX(price) as max_price,
  COUNT(DISTINCT currency) as currencies
FROM competitor_daily_prices
WHERE hotel_id = '716e1e8f-3537-4f67-875d-de3a89642175'
  AND date >= '2026-01-10'
GROUP BY source;

SQL
