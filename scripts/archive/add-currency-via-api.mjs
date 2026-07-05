#!/usr/bin/env node

const token = 'sbp_40b4c30e38cda3ffd52d941942915Za099d69f71'
const projectRef = 'dqhmraeyisoigxzsitiz'

const sql = `
ALTER TABLE competitor_daily_prices 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS';

UPDATE competitor_daily_prices 
SET currency = 'ILS' 
WHERE currency IS NULL;
`

console.log('🔧 מריץ SQL דרך Supabase Management API...\n')
console.log('SQL:', sql)

try {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    }
  )

  const text = await response.text()
  console.log('\n📊 Response Status:', response.status)
  console.log('📊 Response:', text)

  if (!response.ok) {
    console.error('❌ שגיאה:', text)
    process.exit(1)
  }

  console.log('\n✅ SQL הורץ בהצלחה!')
  
  // Verify
  const verifyResponse = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: `SELECT column_name, data_type, column_default
                FROM information_schema.columns 
                WHERE table_name = 'competitor_daily_prices' 
                AND column_name = 'currency';` 
      })
    }
  )

  const verifyData = await verifyResponse.json()
  console.log('\n🔍 אימות:', JSON.stringify(verifyData, null, 2))
  
} catch (error) {
  console.error('❌ שגיאה:', error.message)
  process.exit(1)
}
