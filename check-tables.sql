-- ═══════════════════════════════════════════════════════════
--       SUPABASE TABLES STATUS CHECK QUERY
--       Run this in Supabase SQL Editor to see what exists
-- ═══════════════════════════════════════════════════════════

-- Check all important tables
WITH table_checks AS (
  SELECT 
    tablename as table_name,
    'Core' as category,
    CASE 
      WHEN tablename IN ('hotels', 'bookings', 'price_predictions', 'competitor_prices', 'scan_history') THEN 1
      ELSE 2
    END as priority
  FROM pg_tables 
  WHERE schemaname = 'public'
    AND tablename IN ('hotels', 'bookings', 'price_predictions', 'competitor_prices', 'scan_history')
  
  UNION ALL
  
  SELECT 
    tablename,
    'Learning System' as category,
    3 as priority
  FROM pg_tables 
  WHERE schemaname = 'public'
    AND tablename IN ('prediction_accuracy', 'model_performance_summary', 'prediction_generation_logs')
  
  UNION ALL
  
  SELECT 
    tablename,
    'Analytics' as category,
    4 as priority
  FROM pg_tables 
  WHERE schemaname = 'public'
    AND tablename IN ('cbs_tourism_data', 'hotel_events', 'market_trends')
  
  UNION ALL
  
  SELECT 
    tablename,
    'Cache & Logs' as category,
    5 as priority
  FROM pg_tables 
  WHERE schemaname = 'public'
    AND tablename IN ('api_cache', 'scan_logs', 'error_logs')
),

-- Count rows in each table
row_counts AS (
  SELECT 'hotels' as table_name, COUNT(*) as row_count FROM hotels
  UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
  UNION ALL SELECT 'price_predictions', COUNT(*) FROM price_predictions
  UNION ALL SELECT 'competitor_prices', COUNT(*) FROM competitor_prices
  UNION ALL SELECT 'scan_history', COUNT(*) FROM scan_history
  UNION ALL SELECT 'prediction_accuracy', COUNT(*) FROM prediction_accuracy WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_accuracy')
  UNION ALL SELECT 'model_performance_summary', COUNT(*) FROM model_performance_summary WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'model_performance_summary')
  UNION ALL SELECT 'prediction_generation_logs', COUNT(*) FROM prediction_generation_logs WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_generation_logs')
  UNION ALL SELECT 'cbs_tourism_data', COUNT(*) FROM cbs_tourism_data WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cbs_tourism_data')
  UNION ALL SELECT 'hotel_events', COUNT(*) FROM hotel_events WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hotel_events')
  UNION ALL SELECT 'market_trends', COUNT(*) FROM market_trends WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'market_trends')
  UNION ALL SELECT 'api_cache', COUNT(*) FROM api_cache WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_cache')
  UNION ALL SELECT 'scan_logs', COUNT(*) FROM scan_logs WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_logs')
  UNION ALL SELECT 'error_logs', COUNT(*) FROM error_logs WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'error_logs')
)

-- Main result
SELECT 
  tc.category,
  tc.table_name,
  CASE 
    WHEN tc.table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  COALESCE(rc.row_count, 0) as rows
FROM (
  -- All expected tables
  VALUES 
    ('Core', 'hotels', 1),
    ('Core', 'bookings', 1),
    ('Core', 'price_predictions', 1),
    ('Core', 'competitor_prices', 1),
    ('Core', 'scan_history', 1),
    ('Learning System', 'prediction_accuracy', 3),
    ('Learning System', 'model_performance_summary', 3),
    ('Learning System', 'prediction_generation_logs', 3),
    ('Analytics', 'cbs_tourism_data', 4),
    ('Analytics', 'hotel_events', 4),
    ('Analytics', 'market_trends', 4),
    ('Cache & Logs', 'api_cache', 5),
    ('Cache & Logs', 'scan_logs', 5),
    ('Cache & Logs', 'error_logs', 5)
) AS expected(category, table_name, priority)
LEFT JOIN table_checks tc USING (table_name)
LEFT JOIN row_counts rc ON tc.table_name = rc.table_name
ORDER BY expected.priority, expected.table_name;

-- Summary
SELECT 
  '═══════════════════════════════════════════════════════════' as separator
UNION ALL
SELECT 'SUMMARY:' 
UNION ALL
SELECT '═══════════════════════════════════════════════════════════'
UNION ALL
SELECT CONCAT('✅ Total tables found: ', COUNT(*)) 
FROM pg_tables 
WHERE schemaname = 'public'
UNION ALL
SELECT CONCAT('❌ Missing learning tables: ', 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_accuracy') THEN 'prediction_accuracy, '
    ELSE ''
  END ||
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'model_performance_summary') THEN 'model_performance_summary, '
    ELSE ''
  END ||
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_generation_logs') THEN 'prediction_generation_logs'
    ELSE ''
  END
)
UNION ALL
SELECT '═══════════════════════════════════════════════════════════';

-- Action items
SELECT 
  '📋 ACTIONS REQUIRED:' as message
WHERE 
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_accuracy')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'model_performance_summary')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_generation_logs')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cbs_tourism_data')
UNION ALL
SELECT ''
UNION ALL
SELECT '1. If prediction_accuracy or model_performance_summary missing:'
WHERE 
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_accuracy')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'model_performance_summary')
UNION ALL
SELECT '   → Run: create-feedback-loop-system.sql (271 lines)'
WHERE 
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_accuracy')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'model_performance_summary')
UNION ALL
SELECT ''
UNION ALL
SELECT '2. If prediction_generation_logs missing:'
WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_generation_logs')
UNION ALL
SELECT '   → Run: create-prediction-generation-logs.sql (91 lines)'
WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_generation_logs')
UNION ALL
SELECT ''
UNION ALL
SELECT '3. If cbs_tourism_data missing:'
WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cbs_tourism_data')
UNION ALL
SELECT '   → Run: create-cbs-tourism-table.sql (101 lines + 36 rows data!)'
WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cbs_tourism_data');
