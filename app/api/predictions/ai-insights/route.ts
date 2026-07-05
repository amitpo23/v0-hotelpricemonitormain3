/**
 * AI-Powered Price Intelligence API
 * Combines Tavily search + Claude analysis for comprehensive market insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { researchMarketIntelligence } from '@/lib/research/internet-agent'
import { analyzeMarketData } from '@/lib/llm/claude-client'
import { getWeatherForecast } from '@/lib/external/weather-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow longer execution for research

/**
 * POST /api/predictions/ai-insights
 * Get AI-powered market insights using Tavily + Claude
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hotelId, hotelName, targetDate, location = 'Tel Aviv' } = body

    if (!hotelId || !hotelName || !targetDate) {
      return NextResponse.json(
        { error: 'hotelId, hotelName, and targetDate are required' },
        { status: 400 }
      )
    }

    console.log(`[AIInsights] Starting research for ${hotelName} on ${targetDate}`)

    const supabase = await createClient()

    // Step 1: Research external market intelligence (Tavily)
    console.log('[AIInsights] Step 1: Researching external data...')
    const externalData = await researchMarketIntelligence(hotelName, location, targetDate)

    // Step 2: Get weather forecast
    console.log('[AIInsights] Step 2: Getting weather forecast...')
    let weatherInfo = ''
    try {
      const weather = await getWeatherForecast(location, targetDate)
      if (weather) {
        weatherInfo = `מזג אוויר צפוי: ${weather.condition}, טמפרטורה: ${weather.temp}°C`
      }
    } catch (error) {
      console.warn('[AIInsights] Weather fetch failed:', error)
      weatherInfo = 'לא זמין'
    }

    // Step 3: Get historical prices
    console.log('[AIInsights] Step 3: Fetching historical data...')
    const { data: historicalPrices } = await supabase
      .from('daily_prices')
      .select('price, date')
      .eq('hotel_id', hotelId)
      .order('date', { ascending: false })
      .limit(90)

    const prices = historicalPrices?.map(p => p.price) || []

    // Step 4: Get competitor prices
    const { data: competitorData } = await supabase
      .from('scan_results')
      .select('competitor_name, price')
      .gte('check_in_date', new Date().toISOString().split('T')[0])
      .order('scraped_at', { ascending: false })
      .limit(10)

    const competitorPrices = competitorData?.map(c => ({
      name: c.competitor_name,
      price: c.price,
    })) || []

    // Step 5: Get current occupancy
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('hotel_id', hotelId)
      .eq('check_in_date', targetDate)
      .eq('status', 'confirmed')

    const { data: rooms } = await supabase
      .from('rooms')
      .select('id')
      .eq('hotel_id', hotelId)

    const occupancy = rooms && rooms.length > 0
      ? Math.round((bookings?.length || 0) / rooms.length * 100)
      : undefined

    // Compile external information for Claude
    const externalInfo = `
${externalData.events.length > 0 ? `
📅 **אירועים ב${location}**:
${externalData.events.map(e => `- ${e.name} (השפעה: ${e.impact})`).join('\n')}
` : ''}

${externalData.news.length > 0 ? `
📰 **חדשות רלוונטיות**:
${externalData.news.map(n => `- ${n.title} (${n.sentiment})`).join('\n')}
` : ''}

${externalData.marketTrends.factors.length > 0 ? `
📈 **מגמות שוק**:
${externalData.marketTrends.factors.join(', ')}
` : ''}

${weatherInfo ? `
🌤️ **${weatherInfo}**
` : ''}

${externalData.weatherAlerts.length > 0 ? `
⚠️ **התראות מזג אוויר**:
${externalData.weatherAlerts.map(a => `- ${a.type}: ${a.description}`).join('\n')}
` : ''}
    `.trim()

    // Step 6: Analyze with Claude
    console.log('[AIInsights] Step 4: Analyzing with Claude AI...')
    const analysis = await analyzeMarketData({
      hotelName,
      location,
      targetDate,
      externalInfo: externalInfo || 'אין מידע חיצוני זמין',
      historicalPrices: prices,
      competitorPrices,
      currentOccupancy: occupancy,
    })

    console.log('[AIInsights] Analysis complete')

    // Return comprehensive insights
    return NextResponse.json({
      success: true,
      hotelName,
      targetDate,
      location,
      aiAnalysis: {
        insights: analysis.insights,
        recommendation: analysis.recommendation,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
      },
      marketIntelligence: {
        events: externalData.events,
        news: externalData.news.slice(0, 3), // Top 3 news
        marketTrends: externalData.marketTrends,
        weatherAlerts: externalData.weatherAlerts,
      },
      historicalContext: {
        avgPrice: prices.length > 0 
          ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
          : null,
        priceRange: prices.length > 0
          ? { min: Math.min(...prices), max: Math.max(...prices) }
          : null,
        dataPoints: prices.length,
      },
      competitorContext: {
        avgPrice: competitorPrices.length > 0
          ? Math.round(competitorPrices.reduce((sum, c) => sum + c.price, 0) / competitorPrices.length)
          : null,
        competitors: competitorPrices.slice(0, 5), // Top 5
        totalCompetitors: competitorPrices.length,
      },
      occupancyContext: occupancy !== undefined ? {
        current: occupancy,
        level: occupancy > 80 ? 'high' : occupancy > 50 ? 'medium' : 'low',
      } : null,
      metadata: {
        researchedAt: new Date().toISOString(),
        dataQuality: {
          hasExternalEvents: externalData.events.length > 0,
          hasNews: externalData.news.length > 0,
          hasHistoricalData: prices.length > 0,
          hasCompetitorData: competitorPrices.length > 0,
        },
      },
    })
  } catch (error) {
    console.error('[AIInsights] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate AI insights',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/predictions/ai-insights/search?query=xxx
 * Quick search for specific market information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')

    if (!query) {
      return NextResponse.json(
        { error: 'query parameter is required' },
        { status: 400 }
      )
    }

    console.log(`[AIInsights] Quick search: ${query}`)

    // Use internet agent for quick search
    const { quickSearch } = await import('@/lib/research/internet-agent')
    const result = await quickSearch(query)

    return NextResponse.json({
      success: true,
      query,
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[AIInsights] Search error:', error)
    return NextResponse.json(
      { 
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
