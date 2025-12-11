/**
 * Perplexity AI Client for Hotel Price Intelligence
 * Uses Perplexity's Sonar models for real-time market insights
 */

interface PerplexityMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface PerplexityResponse {
  id: string
  model: string
  choices: {
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface HotelPriceQuery {
  hotelName: string
  location: string
  date: string
  competitorPrices: { name: string; price: number }[]
  currentOccupancy: number
  historicalContext: string
}

interface MarketInsight {
  recommendation: "increase" | "decrease" | "maintain"
  suggestedPrice: number
  reasoning: string
  confidence: number
  marketTrends: string[]
  risks: string[]
  opportunities: string[]
}

/**
 * Send a query to Perplexity AI
 */
async function queryPerplexity(messages: PerplexityMessage[]): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY

  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is not set in environment variables")
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "sonar", // Use Sonar for real-time web search
        messages,
        temperature: 0.3, // Lower temperature for more consistent pricing advice
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Perplexity API error: ${response.status} - ${error}`)
    }

    const data: PerplexityResponse = await response.json()
    return data.choices[0]?.message?.content || ""
  } catch (error) {
    console.error("[Perplexity] Query failed:", error)
    throw error
  }
}

/**
 * Get market insights for hotel pricing
 */
export async function getHotelPricingInsights(query: HotelPriceQuery): Promise<MarketInsight> {
  const systemPrompt = `You are an expert hotel revenue management AI assistant. 
You provide data-driven pricing recommendations based on real-time market conditions, 
competitor analysis, and demand forecasting. Your recommendations should be specific, 
actionable, and include clear reasoning.`

  const userPrompt = `Analyze hotel pricing for:
Hotel: ${query.hotelName}
Location: ${query.location}
Target Date: ${query.date}
Current Occupancy: ${query.currentOccupancy}%

Competitor Prices:
${query.competitorPrices.map((c) => `- ${c.name}: $${c.price}`).join("\n")}

Historical Context:
${query.historicalContext}

Please provide:
1. Pricing recommendation (increase/decrease/maintain)
2. Suggested price point with reasoning
3. Current market trends affecting this date
4. Potential risks to consider
5. Revenue opportunities
6. Confidence level (0-100)

Format your response as JSON with this structure:
{
  "recommendation": "increase|decrease|maintain",
  "suggestedPrice": number,
  "reasoning": "detailed explanation",
  "confidence": number,
  "marketTrends": ["trend1", "trend2"],
  "risks": ["risk1", "risk2"],
  "opportunities": ["opp1", "opp2"]
}`

  try {
    const response = await queryPerplexity([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ])

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as MarketInsight
      return parsed
    }

    // Fallback parsing if JSON not found
    return {
      recommendation: "maintain",
      suggestedPrice: query.competitorPrices[0]?.price || 0,
      reasoning: response,
      confidence: 50,
      marketTrends: [],
      risks: [],
      opportunities: [],
    }
  } catch (error) {
    console.error("[Perplexity] Failed to get insights:", error)
    throw error
  }
}

/**
 * Get real-time event and demand intelligence
 */
export async function getEventIntelligence(
  location: string,
  startDate: string,
  endDate: string,
): Promise<{
  events: { name: string; date: string; impact: "high" | "medium" | "low" }[]
  demandForecast: string
  priceImpact: string
}> {
  const prompt = `Search for events, conferences, holidays, and demand drivers in ${location} 
between ${startDate} and ${endDate}. List major events that could impact hotel demand and pricing.

Provide:
1. List of significant events with dates and expected impact (high/medium/low)
2. Overall demand forecast
3. Price impact recommendation

Format as JSON:
{
  "events": [{"name": "event", "date": "YYYY-MM-DD", "impact": "high|medium|low"}],
  "demandForecast": "description",
  "priceImpact": "recommendation"
}`

  try {
    const response = await queryPerplexity([
      {
        role: "user",
        content: prompt,
      },
    ])

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return {
      events: [],
      demandForecast: response,
      priceImpact: "No significant impact expected",
    }
  } catch (error) {
    console.error("[Perplexity] Event intelligence failed:", error)
    return {
      events: [],
      demandForecast: "Unable to fetch event data",
      priceImpact: "Unknown",
    }
  }
}

/**
 * Get competitor intelligence
 */
export async function getCompetitorIntelligence(
  hotelName: string,
  location: string,
): Promise<{
  competitors: string[]
  marketPosition: string
  pricingStrategy: string
}> {
  const prompt = `Research ${hotelName} in ${location}. Identify:
1. Main competitors (similar properties)
2. Market positioning
3. Current pricing strategies in the market

Format as JSON:
{
  "competitors": ["hotel1", "hotel2"],
  "marketPosition": "description",
  "pricingStrategy": "market strategy insights"
}`

  try {
    const response = await queryPerplexity([
      {
        role: "user",
        content: prompt,
      },
    ])

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return {
      competitors: [],
      marketPosition: "Unknown",
      pricingStrategy: response,
    }
  } catch (error) {
    console.error("[Perplexity] Competitor intelligence failed:", error)
    return {
      competitors: [],
      marketPosition: "Unable to determine",
      pricingStrategy: "Data unavailable",
    }
  }
}
