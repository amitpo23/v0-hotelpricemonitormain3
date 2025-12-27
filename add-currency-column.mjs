#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🔧 Adding currency column to competitor_daily_prices table...')

try {
  // Use raw SQL through RPC
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE competitor_daily_prices 
      ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS';
      
      UPDATE competitor_daily_prices 
      SET currency = 'ILS' 
      WHERE currency IS NULL;
    `
  })

  if (error) {
    console.error('❌ Error:', error)
    console.log('\n⚠️  Need to run SQL manually in Supabase Dashboard:')
    console.log(`
ALTER TABLE competitor_daily_prices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS';
UPDATE competitor_daily_prices SET currency = 'ILS' WHERE currency IS NULL;
    `)
    process.exit(1)
  }

  console.log('✅ Currency column added successfully!')
  
  // Verify the column exists
  const { data: testData, error: testError } = await supabase
    .from('competitor_daily_prices')
    .select('currency')
    .limit(1)
  
  if (testError) {
    console.error('❌ Verification failed:', testError)
  } else {
    console.log('✅ Column verified!')
  }
  
} catch (err) {
  console.error('❌ Exception:', err)
  console.log('\n⚠️  Run this SQL in Supabase Dashboard (https://supabase.com/dashboard):')
  console.log(`
ALTER TABLE competitor_daily_prices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS';
UPDATE competitor_daily_prices SET currency = 'ILS' WHERE currency IS NULL;
  `)
  process.exit(1)
}
