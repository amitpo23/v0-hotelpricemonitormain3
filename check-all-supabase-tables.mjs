import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read env file
const envContent = readFileSync('.env.example', 'utf-8')
console.log('⚠️  Using .env.example - results may not reflect actual database\n')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-key'

console.log('🔗 Checking Supabase at:', SUPABASE_URL.substring(0, 30) + '...\n')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkAllTables() {
  const tableGroups = {
    '🏨 Core Tables': [
      'hotels',
      'bookings',
      'price_predictions',
      'competitor_prices',
      'scan_history'
    ],
    '🧠 Learning System Tables': [
      'prediction_accuracy',
      'model_performance_summary', 
      'prediction_generation_logs'
    ],
    '📊 Analytics Tables': [
      'cbs_tourism_data',
      'hotel_events',
      'market_trends'
    ],
    '💾 Cache & Logs': [
      'api_cache',
      'scan_logs',
      'error_logs'
    ]
  }
  
  console.log('═══════════════════════════════════════════════════════════\n')
  console.log('            SUPABASE DATABASE STATUS CHECK\n')
  console.log('═══════════════════════════════════════════════════════════\n')
  
  const missingTables = []
  const existingTables = []
  
  for (const [groupName, tables] of Object.entries(tableGroups)) {
    console.log(`\n${groupName}`)
    console.log('─'.repeat(60))
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(0)
        
        if (error) {
          if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
            console.log(`  ❌ ${table.padEnd(35)} NOT EXISTS`)
            missingTables.push(table)
          } else {
            console.log(`  ⚠️  ${table.padEnd(35)} ERROR: ${error.message}`)
            missingTables.push(table)
          }
        } else {
          const rowCount = count !== null ? count : '?'
          console.log(`  ✅ ${table.padEnd(35)} ${rowCount} rows`)
          existingTables.push({ table, rows: rowCount })
        }
      } catch (err) {
        console.log(`  ❌ ${table.padEnd(35)} ERROR: ${err.message}`)
        missingTables.push(table)
      }
    }
  }
  
  console.log('\n\n═══════════════════════════════════════════════════════════')
  console.log('                         SUMMARY')
  console.log('═══════════════════════════════════════════════════════════\n')
  
  console.log(`✅ Existing tables: ${existingTables.length}`)
  console.log(`❌ Missing tables:  ${missingTables.length}\n`)
  
  if (missingTables.length > 0) {
    console.log('🔧 ACTIONS REQUIRED:\n')
    console.log('Run these SQL files in Supabase SQL Editor:\n')
    
    const sqlFiles = {
      'prediction_accuracy': '   1. create-feedback-loop-system.sql',
      'model_performance_summary': '   1. create-feedback-loop-system.sql',
      'prediction_generation_logs': '   2. create-prediction-generation-logs.sql',
      'cbs_tourism_data': '   3. create-cbs-tourism-table.sql',
      'api_cache': '   4. Run cache system SQL (if exists)',
      'scan_logs': '   5. Create scan_logs table',
      'error_logs': '   6. Create error_logs table'
    }
    
    const filesToRun = new Set()
    missingTables.forEach(table => {
      if (sqlFiles[table]) {
        filesToRun.add(sqlFiles[table])
      }
    })
    
    filesToRun.forEach(file => console.log(file))
    
    console.log('\n📍 SQL Files Location:')
    console.log('   /workspaces/v0-hotelpricemonitormain3/create-*.sql\n')
    
    console.log('🌐 Supabase SQL Editor:')
    console.log(`   ${SUPABASE_URL}/project/_/sql\n`)
  } else {
    console.log('🎉 All tables exist! Database is ready.\n')
  }
  
  console.log('═══════════════════════════════════════════════════════════\n')
}

checkAllTables().catch(err => {
  console.error('💥 Fatal error:', err.message)
  process.exit(1)
})
