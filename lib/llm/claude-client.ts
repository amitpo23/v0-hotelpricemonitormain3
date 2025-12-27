/**
 * Claude AI Client for Intelligent Analysis
 * Uses Anthropic's Claude for analyzing market data and external information
 */

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeResponse {
  id: string
  type: string
  role: string
  content: Array<{
    type: string
    text: string
  }>
  model: string
  stop_reason: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * Send a query to Claude AI
 */
export async function queryClaude(
  messages: ClaudeMessage[],
  systemPrompt: string,
  temperature: number = 0.7
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in environment variables')
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Claude API error: ${response.status} - ${error}`)
    }

    const data: ClaudeResponse = await response.json()
    return data.content[0]?.text || ''
  } catch (error) {
    console.error('[Claude] Query failed:', error)
    throw error
  }
}

/**
 * Analyze market data and provide insights
 */
export async function analyzeMarketData(data: {
  hotelName: string
  location: string
  targetDate: string
  externalInfo: string
  historicalPrices: number[]
  competitorPrices: { name: string; price: number }[]
  currentOccupancy?: number
}): Promise<{
  insights: string
  recommendation: 'increase' | 'decrease' | 'maintain'
  confidence: number
  reasoning: string
}> {
  const systemPrompt = `אתה מומחה בניהול הכנסות למלונות (Revenue Management Expert).
אתה מנתח נתוני שוק, מחירי מתחרים, אירועים חיצוניים ונותן המלצות מחיר מבוססות נתונים.
תן תשובות בעברית, ברורות וממוקדות.`

  const avgHistorical = data.historicalPrices.length > 0
    ? Math.round(data.historicalPrices.reduce((a, b) => a + b, 0) / data.historicalPrices.length)
    : 0

  const avgCompetitor = data.competitorPrices.length > 0
    ? Math.round(data.competitorPrices.reduce((sum, c) => sum + c.price, 0) / data.competitorPrices.length)
    : 0

  const userPrompt = `נתח את המידע הבא ותן המלצת מחיר למלון:

📍 **מלון**: ${data.hotelName}
🌍 **מיקום**: ${data.location}
📅 **תאריך יעד**: ${data.targetDate}

📊 **נתוני מחיר**:
- ממוצע היסטורי: ₪${avgHistorical}
- ממוצע מתחרים: ₪${avgCompetitor}
${data.currentOccupancy ? `- תפוסה נוכחית: ${data.currentOccupancy}%` : ''}

🏨 **מחירי מתחרים**:
${data.competitorPrices.map(c => `- ${c.name}: ₪${c.price}`).join('\n')}

🌐 **מידע חיצוני (אירועים, חדשות, מזג אוויר)**:
${data.externalInfo}

**נדרש**:
1. **insights** - תובנות מרכזיות (2-3 משפטים)
2. **recommendation** - המלצה: "increase" / "decrease" / "maintain"
3. **confidence** - רמת ביטחון 0-100
4. **reasoning** - נימוק להמלצה (2-3 משפטים)

החזר JSON בפורמט:
\`\`\`json
{
  "insights": "...",
  "recommendation": "increase|decrease|maintain",
  "confidence": 85,
  "reasoning": "..."
}
\`\`\``

  try {
    const response = await queryClaude(
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
      0.3 // Low temperature for consistent recommendations
    )

    // Extract JSON from response
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                     response.match(/{[\s\S]*}/)
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0]
      const parsed = JSON.parse(jsonStr)
      return {
        insights: parsed.insights || '',
        recommendation: parsed.recommendation || 'maintain',
        confidence: parsed.confidence || 50,
        reasoning: parsed.reasoning || '',
      }
    }

    // Fallback if no JSON found
    return {
      insights: response.slice(0, 300),
      recommendation: 'maintain',
      confidence: 50,
      reasoning: 'לא הצלחתי לחלץ המלצה ברורה מהניתוח',
    }
  } catch (error) {
    console.error('[Claude] Analysis failed:', error)
    throw error
  }
}
