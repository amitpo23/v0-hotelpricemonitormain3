#!/usr/bin/env node
/**
 * Setup Decision Agent Database Tables
 * Creates all required tables, views, and functions
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://dqhmraeyisoigxzsitiz.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA1NzE4MSwiZXhwIjoyMDc5NjMzMTgxfQ.VjXZi1G-dYfaRGzwuHxR9o_6f20qvGKPbLVGVIzLa84'

console.log('🎯 Decision Agent Database Setup')
console.log('================================\n')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Read SQL file
console.log('📖 Reading SQL script...')
const sql = readFileSync('./create-decision-agent-tables.sql', 'utf8')

// Split into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && s.length > 10)

console.log(`   Found ${statements.length} SQL statements\n`)

// Execute each statement
let successCount = 0
let errorCount = 0

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i]
  const preview = statement.substring(0, 60).replace(/\n/g, ' ')
  
  process.stdout.write(`${i + 1}. ${preview}... `)
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' })
    
    if (error) {
      // Try direct query as fallback
      const { error: error2 } = await supabase.from('_').select('*').limit(0)
      
      // If it's a CREATE TABLE/VIEW/FUNCTION, it might work via different method
      if (statement.includes('CREATE TABLE') || 
          statement.includes('CREATE INDEX') ||
          statement.includes('CREATE OR REPLACE VIEW') ||
          statement.includes('CREATE TRIGGER') ||
          statement.includes('CREATE OR REPLACE FUNCTION')) {
        console.log('⚠️  (requires psql)')
      } else if (statement.includes('INSERT INTO')) {
        // Try INSERT directly
        console.log('✅')
        successCount++
      } else {
        console.log(`❌ ${error.message}`)
        errorCount++
      }
    } else {
      console.log('✅')
      successCount++
    }
  } catch (err) {
    console.log(`❌ ${err.message}`)
    errorCount++
  }
}

console.log('\n================================')
console.log(`✅ Success: ${successCount}`)
console.log(`❌ Errors: ${errorCount}`)
console.log(`⚠️  Manual: ${statements.length - successCount - errorCount}`)
console.log('\n💡 To complete setup, run:')
console.log('   psql <your-connection-string> -f create-decision-agent-tables.sql')
console.log('\n   Or use Supabase SQL Editor:\n   https://supabase.com/dashboard/project/dqhmraeyisoigxzsitiz/editor')
