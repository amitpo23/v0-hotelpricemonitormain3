#!/usr/bin/env node

/**
 * QA Full Check - בדיקה מקיפה של הפרויקט
 * בודק: מבנה DB, API endpoints, קוד, נתונים, ועוד
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'

console.log('🔍 QA Full Check - מתחיל בדיקה מקיפה...\n')
console.log('═'.repeat(60))

// Load environment
let supabase
try {
  const envFile = readFileSync('.env.local', 'utf-8')
  const envVars = {}
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) envVars[match[1].trim()] = match[2].trim()
  })

  supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL,
    envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  console.log('✅ חיבור ל-Supabase הצליח\n')
} catch (error) {
  console.error('❌ שגיאה בחיבור ל-Supabase:', error.message)
  process.exit(1)
}

const issues = []
const warnings = []
const passed = []

// ============================================
// 1. בדיקת מבנה בסיס נתונים
// ============================================
console.log('📊 1. בודק מבנה בסיס נתונים...')
console.log('─'.repeat(60))

const requiredTables = [
  { name: 'hotels', minRecords: 1, critical: true },
  { name: 'hotel_room_types', minRecords: 0, critical: false },
  { name: 'hotel_competitors', minRecords: 1, critical: true },
  { name: 'competitor_room_types', minRecords: 0, critical: false },
  { name: 'daily_prices', minRecords: 0, critical: false },
  { name: 'competitor_daily_prices', minRecords: 10, critical: true },
  { name: 'scan_results', minRecords: 10, critical: true },
  { name: 'scans', minRecords: 1, critical: false },
  { name: 'scan_configs', minRecords: 1, critical: false },
  { name: 'price_predictions', minRecords: 0, critical: false },
  { name: 'bookings', minRecords: 0, critical: false },
  { name: 'revenue_budgets', minRecords: 0, critical: false },
  { name: 'monthly_forecasts', minRecords: 0, critical: false },
  { name: 'rooms', minRecords: 0, critical: false },
  { name: 'users', minRecords: 0, critical: false },
]

for (const table of requiredTables) {
  const { count, error } = await supabase
    .from(table.name)
    .select('*', { count: 'exact', head: true })

  if (error) {
    const msg = `❌ טבלה ${table.name}: לא קיימת או לא נגישה`
    if (table.critical) {
      issues.push(msg)
    } else {
      warnings.push(msg)
    }
    console.log(msg)
  } else {
    if (count < table.minRecords) {
      const msg = `⚠️  טבלה ${table.name}: ${count} רשומות (מינימום: ${table.minRecords})`
      warnings.push(msg)
      console.log(msg)
    } else {
      const msg = `✅ טבלה ${table.name}: ${count} רשומות`
      passed.push(msg)
      console.log(msg)
    }
  }
}

console.log('')

// ============================================
// 2. בדיקת שלמות נתונים
// ============================================
console.log('🔗 2. בודק שלמות נתונים וקשרים...')
console.log('─'.repeat(60))

// בדיקה: האם יש scan_results ללא hotel_id?
const { count: orphanScanResults } = await supabase
  .from('scan_results')
  .select('*', { count: 'exact', head: true })
  .is('hotel_id', null)

if (orphanScanResults > 0) {
  warnings.push(`⚠️  ${orphanScanResults} scan_results ללא hotel_id`)
  console.log(`⚠️  ${orphanScanResults} scan_results ללא hotel_id`)
} else {
  passed.push('✅ כל scan_results קשורים למלון')
  console.log('✅ כל scan_results קשורים למלון')
}

// בדיקה: האם יש competitor_daily_prices ללא date?
const { count: pricesWithoutDate } = await supabase
  .from('competitor_daily_prices')
  .select('*', { count: 'exact', head: true })
  .is('date', null)

if (pricesWithoutDate > 0) {
  issues.push(`❌ ${pricesWithoutDate} competitor_daily_prices ללא תאריך`)
  console.log(`❌ ${pricesWithoutDate} competitor_daily_prices ללא תאריך`)
} else {
  passed.push('✅ כל competitor_daily_prices עם תאריך')
  console.log('✅ כל competitor_daily_prices עם תאריך')
}

// בדיקה: האם יש מחירים עם currency?
const { data: samplePrices } = await supabase
  .from('competitor_daily_prices')
  .select('currency')
  .limit(10)

const hasCurrency = samplePrices?.some(p => p.currency)
if (!hasCurrency) {
  warnings.push('⚠️  עמודת currency לא מלאה')
  console.log('⚠️  עמודת currency לא מלאה (נתונים ישנים?)')
} else {
  passed.push('✅ נתוני currency קיימים')
  console.log('✅ נתוני currency קיימים')
}

console.log('')

// ============================================
// 3. בדיקת כיסוי נתונים לQ1 2026
// ============================================
console.log('📅 3. בודק כיסוי נתונים Q1 2026...')
console.log('─'.repeat(60))

const { data: q1Dates } = await supabase
  .from('competitor_daily_prices')
  .select('date')
  .gte('date', '2026-01-01')
  .lte('date', '2026-03-31')
  .order('date')

const uniqueDates = [...new Set(q1Dates?.map(d => d.date))].sort()
console.log(`📊 תאריכים ייחודיים ב-Q1 2026: ${uniqueDates.length}/90`)

if (uniqueDates.length < 30) {
  issues.push(`❌ כיסוי חלקי: ${uniqueDates.length}/90 תאריכים`)
  console.log(`❌ כיסוי חלקי - נדרש לפחות 30 תאריכים`)
} else if (uniqueDates.length < 60) {
  warnings.push(`⚠️  כיסוי בינוני: ${uniqueDates.length}/90`)
  console.log(`⚠️  כיסוי בינוני - ${uniqueDates.length}/90 תאריכים`)
} else {
  passed.push(`✅ כיסוי טוב: ${uniqueDates.length}/90`)
  console.log(`✅ כיסוי טוב: ${uniqueDates.length}/90 תאריכים`)
}

// הצג 5 תאריכים ראשונים ואחרונים
if (uniqueDates.length > 0) {
  console.log(`📆 ראשונים: ${uniqueDates.slice(0, 3).join(', ')}${uniqueDates.length > 3 ? '...' : ''}`)
  console.log(`📆 אחרונים: ${uniqueDates.slice(-3).join(', ')}`)
}

console.log('')

// ============================================
// 4. בדיקת API Endpoints
// ============================================
console.log('🌐 4. בודק API endpoints...')
console.log('─'.repeat(60))

try {
  const apiFiles = execSync('find app/api -name "route.ts" -o -name "route.js"', { encoding: 'utf-8' })
  const endpoints = apiFiles.trim().split('\n').filter(Boolean)
  
  console.log(`✅ נמצאו ${endpoints.length} API endpoints`)
  
  // בדיקות ספציפיות
  const criticalEndpoints = [
    'app/api/scans/execute/route.ts',
    'app/api/predictions/generate/route.ts',
    'app/api/predictions/enhanced/route.ts',
    'app/api/cron/auto-scan/route.ts',
    'app/api/cron/monitor-scan/route.ts',
  ]
  
  for (const endpoint of criticalEndpoints) {
    if (existsSync(endpoint)) {
      passed.push(`✅ ${endpoint.split('/').slice(-2).join('/')}`)
      console.log(`✅ ${endpoint.split('/').slice(-2).join('/')}`)
    } else {
      issues.push(`❌ חסר: ${endpoint}`)
      console.log(`❌ חסר: ${endpoint}`)
    }
  }
} catch (error) {
  warnings.push('⚠️  לא ניתן לסרוק API endpoints')
  console.log('⚠️  לא ניתן לסרוק API endpoints:', error.message)
}

console.log('')

// ============================================
// 5. בדיקת קבצים קריטיים
// ============================================
console.log('📁 5. בודק קבצים קריטיים...')
console.log('─'.repeat(60))

const criticalFiles = [
  { path: '.env.local', critical: true },
  { path: 'vercel.json', critical: true },
  { path: 'package.json', critical: true },
  { path: 'next.config.mjs', critical: true },
  { path: 'lib/supabase/client.ts', critical: true },
  { path: 'lib/supabase/server.ts', critical: true },
  { path: 'lib/prediction-algorithms.ts', critical: false },
  { path: 'lib/external/weather-service.ts', critical: false },
  { path: 'lib/llm/claude-client.ts', critical: false },
  { path: 'lib/research/internet-agent.ts', critical: false },
  { path: 'docs/database-schema.json', critical: false },
]

for (const file of criticalFiles) {
  if (existsSync(file.path)) {
    passed.push(`✅ ${file.path}`)
    console.log(`✅ ${file.path}`)
  } else {
    const msg = `${file.critical ? '❌' : '⚠️ '} חסר: ${file.path}`
    if (file.critical) {
      issues.push(msg)
    } else {
      warnings.push(msg)
    }
    console.log(msg)
  }
}

console.log('')

// ============================================
// 6. בדיקת משתני סביבה
// ============================================
console.log('🔧 6. בודק משתני סביבה...')
console.log('─'.repeat(60))

try {
  const envContent = readFileSync('.env.local', 'utf-8')
  const requiredEnvVars = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', critical: true },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', critical: true },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', critical: true },
    { key: 'APIFY_API_KEY', critical: true },
    { key: 'OPENWEATHER_API_KEY', critical: false },
    { key: 'ANTHROPIC_API_KEY', critical: false },
    { key: 'TAVILY_API_KEY', critical: false },
  ]

  for (const envVar of requiredEnvVars) {
    const regex = new RegExp(`^${envVar.key}=(.+)$`, 'm')
    const match = envContent.match(regex)
    
    if (match && match[1] && match[1].length > 10) {
      passed.push(`✅ ${envVar.key}`)
      console.log(`✅ ${envVar.key}: מוגדר`)
    } else {
      const msg = `${envVar.critical ? '❌' : '⚠️ '} ${envVar.key}: לא מוגדר או ריק`
      if (envVar.critical) {
        issues.push(msg)
      } else {
        warnings.push(msg)
      }
      console.log(msg)
    }
  }
} catch (error) {
  issues.push('❌ לא ניתן לקרוא .env.local')
  console.log('❌ לא ניתן לקרוא .env.local')
}

console.log('')

// ============================================
// 7. בדיקת Cron Configuration
// ============================================
console.log('⏰ 7. בודק Cron configuration...')
console.log('─'.repeat(60))

try {
  const vercelJson = JSON.parse(readFileSync('vercel.json', 'utf-8'))
  
  if (vercelJson.crons && Array.isArray(vercelJson.crons)) {
    console.log(`✅ מוגדרים ${vercelJson.crons.length} cron jobs:`)
    vercelJson.crons.forEach(cron => {
      console.log(`   • ${cron.path} (${cron.schedule})`)
      passed.push(`✅ Cron: ${cron.path}`)
    })
    
    // בדיקה ספציפית
    const hasAutoScan = vercelJson.crons.some(c => c.path === '/api/cron/auto-scan')
    const hasMonitor = vercelJson.crons.some(c => c.path === '/api/cron/monitor-scan')
    
    if (!hasAutoScan) {
      issues.push('❌ חסר: auto-scan cron')
      console.log('❌ חסר: /api/cron/auto-scan')
    }
    if (!hasMonitor) {
      issues.push('❌ חסר: monitor-scan cron')
      console.log('❌ חסר: /api/cron/monitor-scan')
    }
  } else {
    warnings.push('⚠️  אין cron jobs מוגדרים')
    console.log('⚠️  אין cron jobs מוגדרים ב-vercel.json')
  }
} catch (error) {
  warnings.push('⚠️  לא ניתן לקרוא vercel.json')
  console.log('⚠️  לא ניתן לקרוא vercel.json')
}

console.log('')

// ============================================
// 8. בדיקת TypeScript Errors
// ============================================
console.log('🔍 8. בודק שגיאות TypeScript...')
console.log('─'.repeat(60))

try {
  console.log('מריץ: npx tsc --noEmit (זה יכול לקחת זמן)...')
  execSync('npx tsc --noEmit', { encoding: 'utf-8', stdio: 'pipe' })
  passed.push('✅ אין שגיאות TypeScript')
  console.log('✅ אין שגיאות TypeScript')
} catch (error) {
  const errors = error.stdout || error.stderr || ''
  const errorLines = errors.split('\n').filter(l => l.includes('error TS'))
  
  if (errorLines.length > 0) {
    warnings.push(`⚠️  ${errorLines.length} שגיאות TypeScript`)
    console.log(`⚠️  נמצאו ${errorLines.length} שגיאות TypeScript`)
    console.log('   (הצג עם: npx tsc --noEmit)')
  } else {
    passed.push('✅ TypeScript תקין')
    console.log('✅ TypeScript תקין')
  }
}

console.log('')

// ============================================
// סיכום
// ============================================
console.log('═'.repeat(60))
console.log('📋 סיכום QA\n')

console.log(`✅ עברו: ${passed.length} בדיקות`)
console.log(`⚠️  אזהרות: ${warnings.length}`)
console.log(`❌ בעיות קריטיות: ${issues.length}`)
console.log('')

if (issues.length > 0) {
  console.log('🚨 בעיות קריטיות שנדרשות לתיקון:')
  console.log('─'.repeat(60))
  issues.forEach((issue, i) => console.log(`${i + 1}. ${issue}`))
  console.log('')
}

if (warnings.length > 0 && warnings.length <= 10) {
  console.log('⚠️  אזהרות (לא חוסמות):')
  console.log('─'.repeat(60))
  warnings.forEach((warning, i) => console.log(`${i + 1}. ${warning}`))
  console.log('')
}

// המלצות
console.log('💡 המלצות:')
console.log('─'.repeat(60))

if (issues.length === 0 && warnings.length === 0) {
  console.log('🎉 מצוין! הפרויקט במצב מעולה')
  console.log('✅ כל המערכות תקינות')
  console.log('✅ מוכן לעבודה ב-production')
} else {
  if (issues.length > 0) {
    console.log('1. תקן תחילה את הבעיות הקריטיות')
  }
  if (warnings.length > 5) {
    console.log('2. שקול לטפל באזהרות לשיפור היציבות')
  }
  if (uniqueDates.length < 60) {
    console.log('3. המשך את סריקת Q1 2026 להשלמת נתונים')
  }
}

console.log('')
console.log('═'.repeat(60))

// Exit code
if (issues.length > 0) {
  console.log('❌ QA נכשל - יש בעיות קריטיות\n')
  process.exit(1)
} else {
  console.log('✅ QA הושלם בהצלחה\n')
  process.exit(0)
}
