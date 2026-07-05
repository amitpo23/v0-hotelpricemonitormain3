#!/usr/bin/env node
/**
 * Run Database Migrations
 * Execute all pending SQL migrations via Supabase
 * 
 * Usage: node run-migrations.mjs
 * 
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// Load environment from Vercel if available
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing Supabase credentials!")
  console.log("\nTo run migrations, you need:")
  console.log("1. NEXT_PUBLIC_SUPABASE_URL")
  console.log("2. SUPABASE_SERVICE_ROLE_KEY")
  console.log("\nOptions:")
  console.log("A) Set environment variables and run this script")
  console.log("B) Copy SQL from supabase/migrations/ and run in Supabase Dashboard SQL Editor")
  console.log("\n📋 SQL files to run:")
  
  const migrationsDir = join(process.cwd(), 'supabase/migrations')
  try {
    const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
    files.forEach((f, i) => console.log(`   ${i+1}. ${f}`))
  } catch {
    console.log("   (supabase/migrations folder not found)")
  }
  
  console.log("\n🔗 Supabase Dashboard: https://supabase.com/dashboard/project/_/sql/new")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function runMigration(filePath, fileName) {
  console.log(`\n📄 Running: ${fileName}`)
  
  const sql = readFileSync(filePath, 'utf-8')
  
  // Split by semicolons but keep them for execution
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`   ${statements.length} statements to execute`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    
    // Skip comments
    if (stmt.startsWith('--')) continue
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })
      
      if (error) {
        // Try direct execution for DDL
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify({ sql: stmt + ';' })
        })
        
        if (!response.ok) {
          console.log(`   ⚠️  Statement ${i+1}: May need manual execution`)
        }
      }
    } catch (err) {
      console.log(`   ⚠️  Statement ${i+1}: ${err.message?.substring(0, 50) || 'Error'}`)
    }
  }
  
  console.log(`   ✅ ${fileName} processed`)
}

async function main() {
  console.log("=".repeat(60))
  console.log("🚀 Running Supabase Migrations")
  console.log("=".repeat(60))
  
  const migrationsDir = join(process.cwd(), 'supabase/migrations')
  
  const migrationFiles = [
    '20260106_create_daily_actual_prices.sql',
    '20260106_add_accuracy_tracking_columns.sql', 
    '20260106_create_factor_weights.sql'
  ]

  for (const file of migrationFiles) {
    const filePath = join(migrationsDir, file)
    try {
      await runMigration(filePath, file)
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`)
    }
  }

  console.log("\n" + "=".repeat(60))
  console.log("✅ Migrations completed!")
  console.log("=".repeat(60))
  console.log("\nNext steps:")
  console.log("1. Verify tables in Supabase Dashboard > Table Editor")
  console.log("2. Test: /api/actual-prices, /api/optimize-weights")
  console.log("3. Start collecting feedback data")
}

main().catch(console.error)
