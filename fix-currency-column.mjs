#!/usr/bin/env node

import pg from 'pg'
const { Client } = pg

const connectionString = 'postgresql://postgres:QlTimiwBcItInsPS@db.dqhmraeyisoigxzsitiz.supabase.co:5432/postgres'

console.log('🔌 מתחבר ל-PostgreSQL...')

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

try {
  await client.connect()
  console.log('✅ התחברות הצליחה!')

  console.log('\n🔧 מוסיף עמודת currency...')
  await client.query(`
    ALTER TABLE competitor_daily_prices 
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS';
  `)
  console.log('✅ עמודה נוספה!')

  console.log('\n🔄 מעדכן ערכים קיימים...')
  const result = await client.query(`
    UPDATE competitor_daily_prices 
    SET currency = 'ILS' 
    WHERE currency IS NULL;
  `)
  console.log(`✅ עודכנו ${result.rowCount} שורות`)

  console.log('\n🔍 בודק את העמודה...')
  const check = await client.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns 
    WHERE table_name = 'competitor_daily_prices' 
    AND column_name = 'currency';
  `)
  console.log('✅ העמודה קיימת:', check.rows[0])

  console.log('\n🎉 הכל הצליח!')
  
} catch (error) {
  console.error('❌ שגיאה:', error.message)
  process.exit(1)
} finally {
  await client.end()
}
