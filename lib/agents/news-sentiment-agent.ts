/**
 * News Sentiment Agent - Phase 2 Week 4
 * Analyzes news sentiment about locations to inform pricing decisions
 * 
 * Data Source: NewsAPI (https://newsapi.org)
 * Cost: FREE (100 requests/day)
 * 
 * Features:
 * - Fetch tourism-relevant news about locations
 * - Sentiment analysis (positive/negative/neutral)
 * - Impact calculation based on news volume and sentiment
 * - Tourism-specific news filtering
 */

import type { AgentOutput } from './decision-agent'

// NewsAPI Response Types
interface NewsArticle {
  title: string
  description: string
  content: string
  url: string
  publishedAt: string
  source: {
    id: string | null
    name: string
  }
  sentiment?: 'positive' | 'negative' | 'neutral'
  sentimentScore?: number // -1 to +1
}

interface NewsAPIResponse {
  status: string
  totalResults: number
  articles: NewsArticle[]
}

interface NewsSentimentData {
  location: string
  targetDate: Date
  articles: NewsArticle[]
  sentimentSummary: {
    positive: number // Count
    negative: number
    neutral: number
    avgScore: number // -1 to +1
  }
  tourismImpact: number // Multiplier (0.8x - 1.3x)
  confidence: number // 0-1
  keywords: string[]
  dominantSentiment: 'positive' | 'negative' | 'neutral'
  newsVolume: 'high' | 'medium' | 'low'
}

/**
 * Main function: Analyze news sentiment for a location
 */
export async function analyzeNewsSentiment(
  location: string,
  targetDate: Date
): Promise<AgentOutput> {
  try {
    // Fetch news data
    const newsData = await fetchNewsData(location, targetDate)
    
    // Analyze sentiment
    const sentimentAnalysis = analyzeSentiment(newsData.articles)
    
    // Calculate tourism impact
    const tourismImpact = calculateTourismImpact(sentimentAnalysis, newsData.articles.length)
    
    // Generate recommendation
    const recommendation = generateRecommendation(tourismImpact)
    
    // Build reasoning
    const reasoning = buildReasoning(sentimentAnalysis, newsData.articles.length, tourismImpact)
    
    return {
      agentName: 'News Sentiment Agent',
      recommendation,
      confidence: calculateConfidence(newsData.articles.length, sentimentAnalysis.avgScore),
      suggestedMultiplier: tourismImpact,
      reasoning,
      dataPoints: {
        location,
        targetDate: targetDate.toISOString(),
        articleCount: newsData.articles.length,
        sentimentSummary: sentimentAnalysis,
        dominantSentiment: sentimentAnalysis.avgScore > 0.2 ? 'positive' : sentimentAnalysis.avgScore < -0.2 ? 'negative' : 'neutral',
        newsVolume: newsData.articles.length > 15 ? 'high' : newsData.articles.length > 5 ? 'medium' : 'low',
        keywords: extractKeywords(newsData.articles),
        tourismImpact
      }
    }
  } catch (error) {
    console.error('[News Sentiment Agent] Error:', error)
    
    // Return neutral recommendation on error
    return {
      agentName: 'News Sentiment Agent',
      recommendation: 'maintain',
      confidence: 0.2,
      suggestedMultiplier: 1.0,
      reasoning: ['Error fetching news data', 'Using neutral recommendation'],
      dataPoints: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Fetch news data from NewsAPI
 * In production: Replace with real NewsAPI calls
 * For now: Returns realistic mock data
 */
async function fetchNewsData(
  location: string,
  targetDate: Date
): Promise<{ articles: NewsArticle[] }> {
  // TODO: In production, use real NewsAPI:
  // const apiKey = process.env.NEWS_API_KEY
  // const url = `https://newsapi.org/v2/everything?q=${location}+tourism+hotels&apiKey=${apiKey}`
  // const response = await fetch(url)
  // const data = await response.json()
  
  // Mock data for development - Realistic Israeli tourism news scenarios
  const month = targetDate.getMonth()
  const locationLower = location.toLowerCase()
  
  // Generate realistic articles based on location and season
  const articles: NewsArticle[] = []
  
  // Tel Aviv - Tech hub and beach city
  if (locationLower.includes('tel aviv')) {
    if (month >= 5 && month <= 8) {
      // Summer - positive beach tourism
      articles.push(
        {
          title: 'Tel Aviv Beaches Break Tourism Records This Summer',
          description: 'Record numbers of tourists flocking to Tel Aviv beaches',
          content: 'Tel Aviv sees unprecedented tourism growth with international visitors...',
          url: 'https://example.com/news1',
          publishedAt: new Date().toISOString(),
          source: { id: 'haaretz', name: 'Haaretz' },
          sentiment: 'positive',
          sentimentScore: 0.8
        },
        {
          title: 'Hotel Occupancy Rates Soar in Tel Aviv',
          description: 'Hotels report 95% occupancy during peak season',
          content: 'Tel Aviv hospitality industry thriving...',
          url: 'https://example.com/news2',
          publishedAt: new Date().toISOString(),
          source: { id: 'jpost', name: 'Jerusalem Post' },
          sentiment: 'positive',
          sentimentScore: 0.7
        }
      )
    } else if (month >= 11 || month <= 2) {
      // Winter - lower tourism but events
      articles.push(
        {
          title: 'Tel Aviv Hotel Prices Drop as Winter Season Begins',
          description: 'Tourism industry prepares for slower winter months',
          content: 'Hotel operators offering winter discounts...',
          url: 'https://example.com/news3',
          publishedAt: new Date().toISOString(),
          source: { id: 'globes', name: 'Globes' },
          sentiment: 'neutral',
          sentimentScore: 0.0
        }
      )
    }
  }
  
  // Jerusalem - Religious tourism
  if (locationLower.includes('jerusalem')) {
    if (month === 3 || month === 9) {
      // Holiday seasons - positive
      articles.push(
        {
          title: 'Jerusalem Welcomes Record Pilgrims for Holidays',
          description: 'Religious tourism booms during holiday season',
          content: 'Jerusalem hotels fully booked as pilgrims arrive...',
          url: 'https://example.com/news4',
          publishedAt: new Date().toISOString(),
          source: { id: 'jpost', name: 'Jerusalem Post' },
          sentiment: 'positive',
          sentimentScore: 0.9
        },
        {
          title: 'Hotels Near Old City Report Strong Demand',
          description: 'Hospitality sector thriving during peak season',
          content: 'Jerusalem tourism industry reports excellent results...',
          url: 'https://example.com/news5',
          publishedAt: new Date().toISOString(),
          source: { id: 'haaretz', name: 'Haaretz' },
          sentiment: 'positive',
          sentimentScore: 0.8
        }
      )
    }
  }
  
  // Eilat - Resort city
  if (locationLower.includes('eilat')) {
    if (month >= 10 || month <= 2) {
      // Winter - peak season
      articles.push(
        {
          title: 'Eilat Hotels Fill Up as Winter Tourists Arrive',
          description: 'Red Sea resort city welcomes winter visitors',
          content: 'Eilat experiencing busiest winter season in years...',
          url: 'https://example.com/news6',
          publishedAt: new Date().toISOString(),
          source: { id: 'ynet', name: 'Ynet' },
          sentiment: 'positive',
          sentimentScore: 0.85
        }
      )
    }
  }
  
  // Generic Israel tourism news
  articles.push(
    {
      title: 'Israel Tourism Ministry Reports Growth in International Visitors',
      description: 'Tourism sector shows positive trends',
      content: 'Israel welcomes increasing numbers of international tourists...',
      url: 'https://example.com/news7',
      publishedAt: new Date().toISOString(),
      source: { id: 'timesofisrael', name: 'Times of Israel' },
      sentiment: 'positive',
      sentimentScore: 0.6
    }
  )
  
  // Simulate some neutral/negative news occasionally
  const randomFactor = Math.random()
  if (randomFactor > 0.7) {
    articles.push({
      title: 'Hotel Industry Faces Rising Operating Costs',
      description: 'Tourism sector dealing with increased expenses',
      content: 'Hotels adjusting to higher costs...',
      url: 'https://example.com/news8',
      publishedAt: new Date().toISOString(),
      source: { id: 'globes', name: 'Globes' },
      sentiment: 'neutral',
      sentimentScore: -0.1
    })
  }
  
  return { articles }
}

/**
 * Analyze sentiment of news articles
 */
function analyzeSentiment(articles: NewsArticle[]): {
  positive: number
  negative: number
  neutral: number
  avgScore: number
} {
  if (articles.length === 0) {
    return { positive: 0, negative: 0, neutral: 0, avgScore: 0 }
  }
  
  let positive = 0
  let negative = 0
  let neutral = 0
  let totalScore = 0
  
  for (const article of articles) {
    const score = article.sentimentScore || 0
    totalScore += score
    
    if (score > 0.2) {
      positive++
    } else if (score < -0.2) {
      negative++
    } else {
      neutral++
    }
  }
  
  return {
    positive,
    negative,
    neutral,
    avgScore: totalScore / articles.length
  }
}

/**
 * Calculate tourism impact based on sentiment and news volume
 */
function calculateTourismImpact(
  sentiment: { positive: number; negative: number; neutral: number; avgScore: number },
  articleCount: number
): number {
  // Base multiplier
  let multiplier = 1.0
  
  // Sentiment impact (-0.2 to +0.3)
  const sentimentImpact = sentiment.avgScore * 0.3
  multiplier += sentimentImpact
  
  // News volume impact (more news = more attention)
  if (articleCount > 15) {
    multiplier += 0.05 // High volume bonus
  } else if (articleCount > 5) {
    multiplier += 0.02 // Medium volume bonus
  }
  // Low volume (< 5 articles) gets no bonus
  
  // Clamp to reasonable range (0.8x - 1.3x)
  multiplier = Math.max(0.8, Math.min(1.3, multiplier))
  
  return multiplier
}

/**
 * Generate recommendation based on tourism impact
 */
function generateRecommendation(
  tourismImpact: number
): 'increase' | 'decrease' | 'maintain' {
  if (tourismImpact >= 1.1) {
    return 'increase'
  } else if (tourismImpact <= 0.95) {
    return 'decrease'
  } else {
    return 'maintain'
  }
}

/**
 * Calculate confidence based on article count and sentiment strength
 */
function calculateConfidence(articleCount: number, avgSentiment: number): number {
  // Base confidence on article volume
  let confidence = 0.3 // Minimum
  
  if (articleCount > 10) {
    confidence = 0.75 // High volume = high confidence
  } else if (articleCount > 5) {
    confidence = 0.6 // Medium volume
  } else if (articleCount > 2) {
    confidence = 0.45 // Low volume
  }
  
  // Boost confidence for strong sentiment (either direction)
  const sentimentStrength = Math.abs(avgSentiment)
  if (sentimentStrength > 0.5) {
    confidence += 0.1 // Strong sentiment boost
  }
  
  return Math.min(0.85, confidence) // Cap at 0.85
}

/**
 * Build reasoning array for explanation
 */
function buildReasoning(
  sentiment: { positive: number; negative: number; neutral: number; avgScore: number },
  articleCount: number,
  tourismImpact: number
): string[] {
  const reasoning: string[] = []
  
  // News volume
  const volume = articleCount > 15 ? 'high' : articleCount > 5 ? 'medium' : 'low'
  reasoning.push(`News volume: ${volume} (${articleCount} articles)`)
  
  // Sentiment breakdown
  reasoning.push(`Sentiment: ${sentiment.positive} positive, ${sentiment.negative} negative, ${sentiment.neutral} neutral`)
  
  // Average sentiment
  const avgSentiment = sentiment.avgScore > 0.2 ? 'positive' : sentiment.avgScore < -0.2 ? 'negative' : 'neutral'
  reasoning.push(`Overall sentiment: ${avgSentiment} (${sentiment.avgScore.toFixed(2)})`)
  
  // Tourism impact
  const impactPct = ((tourismImpact - 1) * 100).toFixed(1)
  reasoning.push(`Tourism impact: ${impactPct > '0' ? '+' : ''}${impactPct}% (${tourismImpact.toFixed(2)}x)`)
  
  return reasoning
}

/**
 * Extract keywords from articles
 */
function extractKeywords(articles: NewsArticle[]): string[] {
  const keywords = new Set<string>()
  
  // Common tourism-related keywords to look for
  const tourismKeywords = [
    'tourism', 'hotel', 'visitor', 'tourist', 'travel',
    'occupancy', 'booking', 'hospitality', 'vacation',
    'beach', 'resort', 'attraction', 'destination'
  ]
  
  for (const article of articles) {
    const text = (article.title + ' ' + article.description).toLowerCase()
    
    for (const keyword of tourismKeywords) {
      if (text.includes(keyword)) {
        keywords.add(keyword)
      }
    }
  }
  
  return Array.from(keywords).slice(0, 8) // Return top 8 keywords
}
