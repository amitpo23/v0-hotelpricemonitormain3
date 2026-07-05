#!/usr/bin/env node
/**
 * Verify Decision Agent Tables Exist
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dqhmraeyisoigxzsitiz.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I'

console.log('🔍 Checking Decision Agent Tables...\n')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const requiredTables = [
  'agent_execution_logs',
  'agent_accuracy_tracking', 
  'decision_logs',
  'israeli_holidays',
  'external_data_cache',
  'autopilot_executions'
]

console.log('Required Tables:')
for (const table of requiredTables) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(0)
    
    if (error) {
      console.log(`❌ ${table} - NOT FOUND`)
    } else {
      console.log(`✅ ${table} - EXISTS`)
    }
  } catch (err) {
    console.log(`❌ ${table} - ERROR: ${err.message}`)
  }
}

console.log('\n📊 Sample Data Check:')

// Check israeli_holidays
try {
  const { data, error } = await supabase
    .from('israeli_holidays')
    .select('*')
    .limit(3)
  
  if (data && data.length > 0) {
    console.log(`✅ israeli_holidays has ${data.length} sample records`)
    console.log(`   Example: ${data[0].holiday_name} (${data[0].start_date})`)
  } else {
    console.log('⚠️  israeli_holidays is empty (needs sample data)')
  }
} catch (err) {
  console.log('❌ Could not check israeli_holidays')
}

console.log('\n💡 To create tables, visit Supabase SQL Editor:')
console.log('   https://supabase.com/dashboard/project/dqhmraeyisoigxzsitiz/editor')
console.log('\n   Then copy-paste contents of: create-decision-agent-tables.sql')
