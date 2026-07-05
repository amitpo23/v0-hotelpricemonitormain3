import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read env file
const envContent = readFileSync('.env.local', 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkLearningTables() {
  const tables = ['prediction_accuracy', 'model_performance_summary', 'prediction_generation_logs']
  
  console.log('🔍 Checking learning system tables...\n')
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    
    if (error) {
      console.log(`❌ Table '${table}': NOT EXISTS`)
      console.log(`   Error: ${error.message}\n`)
    } else {
      console.log(`✅ Table '${table}': EXISTS`)
      console.log(`   Sample row count: ${data?.length || 0}\n`)
    }
  }
  
  console.log('\n📋 Summary:')
  console.log('If tables are missing, run the SQL files in Supabase SQL Editor:')
  console.log('  1. create-feedback-loop-system.sql')
  console.log('  2. create-prediction-generation-logs.sql')
}

checkLearningTables().catch(console.error)
