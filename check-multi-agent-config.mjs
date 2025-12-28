#!/usr/bin/env node

/**
 * Quick check for Multi-Agent System configuration
 * Run this to verify everything is set up correctly
 */

console.log('🔍 Multi-Agent System - Configuration Check\n')
console.log('='.repeat(60))

// Check 1: Environment Variables
console.log('\n📋 Step 1: Environment Variables')
console.log('-'.repeat(60))

const requiredVars = [
  { name: 'TAVILY_API_KEY', description: 'For internet research (events, trends)', required: true },
  { name: 'ANTHROPIC_API_KEY', description: 'For AI-powered insights', required: false },
  { name: 'OPENWEATHER_API_KEY', description: 'For weather-based predictions', required: false },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Database connection', required: true },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Database auth', required: true },
]

let allRequired = true

requiredVars.forEach(({ name, description, required }) => {
  const exists = !!process.env[name]
  const status = exists ? '✅' : (required ? '❌' : '⚠️')
  const badge = required ? '[REQUIRED]' : '[OPTIONAL]'
  
  console.log(`${status} ${badge} ${name}`)
  console.log(`   ${description}`)
  
  if (required && !exists) {
    allRequired = false
    console.log(`   ⚠️  Missing! Add to .env.local or Vercel`)
  }
  console.log()
})

// Check 2: File Structure
console.log('\n📁 Step 2: Multi-Agent System Files')
console.log('-'.repeat(60))

const { existsSync } = await import('fs')

const requiredFiles = [
  'lib/agents/events-agent.ts',
  'lib/agents/statistics-agent.ts',
  'lib/agents/historical-agent.ts',
  'lib/agents/orchestrator.ts',
  'lib/research/internet-agent.ts',
]

let allFilesExist = true

requiredFiles.forEach(file => {
  const exists = existsSync(file)
  console.log(`${exists ? '✅' : '❌'} ${file}`)
  if (!exists) allFilesExist = false
})

// Check 3: Dependencies
console.log('\n📦 Step 3: Node Modules')
console.log('-'.repeat(60))

const requiredDeps = [
  '@supabase/supabase-js',
  'next',
]

let allDepsInstalled = true

for (const dep of requiredDeps) {
  try {
    await import(dep)
    console.log(`✅ ${dep}`)
  } catch {
    console.log(`❌ ${dep} - Run: npm install`)
    allDepsInstalled = false
  }
}

// Check 4: API Endpoints
console.log('\n🌐 Step 4: API Routes')
console.log('-'.repeat(60))

const apiFiles = [
  'app/api/predictions/generate/route.ts',
  'app/api/predictions/ai-insights/route.ts',
]

apiFiles.forEach(file => {
  const exists = existsSync(file)
  console.log(`${exists ? '✅' : '❌'} ${file}`)
})

// Summary
console.log('\n' + '='.repeat(60))
console.log('📊 Summary')
console.log('='.repeat(60))

if (allRequired && allFilesExist && allDepsInstalled) {
  console.log('✅ All systems GO! Multi-Agent System is ready.')
  console.log('\n💡 Next steps:')
  console.log('   1. Run: npm run dev')
  console.log('   2. Test: node test-multi-agent-system.mjs')
  console.log('   3. Check: http://localhost:3000/predictions')
} else {
  console.log('⚠️  Some issues detected:')
  if (!allRequired) {
    console.log('   - Missing required environment variables')
    console.log('   - Add them to .env.local or Vercel dashboard')
  }
  if (!allFilesExist) {
    console.log('   - Missing agent files - check git status')
  }
  if (!allDepsInstalled) {
    console.log('   - Run: npm install')
  }
}

// Tavily-specific checks
if (process.env.TAVILY_API_KEY) {
  console.log('\n🔍 Tavily API Quick Test')
  console.log('-'.repeat(60))
  
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: 'test',
        max_results: 1,
      }),
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Tavily API is working!')
      console.log(`   Response received with ${data.results?.length || 0} results`)
    } else if (response.status === 401) {
      console.log('❌ Tavily API Key is invalid')
      console.log('   Get a new key from: https://tavily.com/dashboard')
    } else if (response.status === 429) {
      console.log('⚠️  Tavily rate limit reached')
      console.log('   Check your usage at: https://tavily.com/dashboard')
    } else {
      console.log(`⚠️  Tavily API returned status: ${response.status}`)
    }
  } catch (error) {
    console.log('❌ Failed to test Tavily API:', error.message)
  }
}

console.log('\n' + '='.repeat(60))
console.log('✨ Check complete!\n')
