#!/usr/bin/env node

/**
 * סקריפט ליצירת טבלת prediction_logs ב-Supabase
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

console.log('🔧 Creating prediction_logs table in Supabase...\n')

// קריאת משתני הסביבה
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials')
  console.error('   Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// קריאת SQL מהקובץ
const sqlScript = fs.readFileSync('./create-prediction-logs-table.sql', 'utf-8')

// ביצוע ה-SQL
console.log('📝 Executing SQL script...')
console.log('=' .repeat(80))

try {
  // לצערי, Supabase JS client לא תומך בביצוע SQL ישיר
  // צריך להריץ את זה דרך Supabase Dashboard או CLI
  
  console.log('ℹ️  Supabase JS Client cannot execute raw SQL directly.')
  console.log('📋 Please follow these steps:\n')
  console.log('1. Go to your Supabase Dashboard:')
  console.log(`   ${supabaseUrl.replace('.supabase.co', '.supabase.co')}/project/_/sql\n`)
  console.log('2. Copy and paste the contents of: create-prediction-logs-table.sql\n')
  console.log('3. Click "Run" to create the table\n')
  console.log('Alternatively, use Supabase CLI:')
  console.log('   supabase db push\n')
  
  console.log('=' .repeat(80))
  console.log('\n📄 SQL Script Preview:')
  console.log('=' .repeat(80))
  console.log(sqlScript.substring(0, 500) + '...\n')
  console.log('(See full script in: create-prediction-logs-table.sql)')
  console.log('=' .repeat(80))
  
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

console.log('\n✅ Instructions printed. Please create the table manually.')
console.log('📖 For more info, see: PREDICTION_SYSTEM_GUIDE.md')
