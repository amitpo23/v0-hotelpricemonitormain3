#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dqhmraeyisoigxzsitiz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

console.log('🔌 מתחבר ל-Supabase...')

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

console.log('✅ מחובר!')

// First, let's check current schema
console.log('\n🔍 בודק סכמה נוכחית...')
try {
  const { data, error } = await supabase
    .from('competitor_daily_prices')
    .select('*')
    .limit(1)
  
  if (data && data.length > 0) {
    console.log('📊 עמודות קיימות:', Object.keys(data[0]))
    
    if ('currency' in data[0]) {
      console.log('✅ עמודת currency כבר קיימת!')
      process.exit(0)
    } else {
      console.log('⚠️  עמודת currency חסרה')
    }
  }
} catch (err) {
  console.log('⚠️  לא הצלחתי לבדוק:', err.message)
}

console.log('\n📝 יוצר קובץ migration SQL...')
const sql = `
-- Add currency column
ALTER TABLE competitor_daily_prices 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS';

-- Update existing NULL values
UPDATE competitor_daily_prices 
SET currency = 'ILS' 
WHERE currency IS NULL;

-- Verify
SELECT COUNT(*) as total, 
       COUNT(currency) as with_currency,
       currency
FROM competitor_daily_prices 
GROUP BY currency;
`

console.log(sql)
console.log('\n' + '='.repeat(60))
console.log('⚠️  צריך להריץ את ה-SQL הזה ב-Supabase Dashboard:')
console.log('🔗 https://supabase.com/dashboard/project/dqhmraeyisoigxzsitiz/sql/new')
console.log('='.repeat(60))
