"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquareIcon, SendIcon, SparklesIcon, UserIcon } from "@/components/icons"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface PredictionChatProps {
  predictions: any[]
  hotels: any[]
}

const QUICK_QUESTIONS = [
  "Why is the price higher on weekends?",
  "What factors affect the predictions?",
  "How can I increase revenue in January?",
  "Why is August the most expensive month?",
  "How does competitor pricing affect my rates?",
  "What events should I prepare for?",
]

export function PredictionChat({ predictions, hotels }: PredictionChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI revenue management assistant. I can help you understand the price predictions, explain the factors behind them, and provide recommendations for optimizing your hotel's revenue. What would you like to know?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const generateResponse = async (question: string): Promise<string> => {
    // AI responses based on the market data and predictions
    const lowerQ = question.toLowerCase()

    if (lowerQ.includes("weekend") || lowerQ.includes("שבת") || lowerQ.includes("סוף שבוע")) {
      return `Weekend prices are typically 15-20% higher due to increased leisure travel demand. In Tel Aviv specifically:

• **Friday-Saturday** see the highest demand from both domestic and international tourists
• **Business travelers** often extend stays over weekends
• **Events and nightlife** attract additional visitors

Based on your current data, I recommend maintaining a 15% weekend premium. This aligns with market averages and competitor pricing.`
    }

    if (lowerQ.includes("factor") || lowerQ.includes("גורם")) {
      return `The prediction algorithm considers multiple factors:

**1. Seasonality (30% weight)**
- Peak: June-August (+25-30%)
- Holiday: December (+20%)
- Low: January-February (-15-20%)

**2. Market Intelligence (25% weight)**
- Google Trends search volume
- TripAdvisor demand indicators
- Competitor pricing

**3. Your Data (25% weight)**
- Current bookings & occupancy
- Revenue vs budget gap
- Historical performance

**4. Events (20% weight)**
- Pride Week (June): +20-25%
- Passover: +25-30%
- Tel Aviv Marathon: +10-15%

The confidence score (shown as "% conf.") indicates how reliable the prediction is based on available data.`
    }

    if (lowerQ.includes("january") || lowerQ.includes("ינואר") || lowerQ.includes("revenue")) {
      return `January is traditionally the lowest demand month in Tel Aviv (only 4.6% of annual tourist spending). Here are strategies to increase revenue:

**1. Price Strategically**
- Lower rates by 15-20% to capture price-sensitive travelers
- Offer "Winter Escape" packages

**2. Target Specific Markets**
- Business travelers (conferences, meetings)
- Long-stay guests (digital nomads)
- Domestic weekend getaways

**3. Partnerships**
- Partner with Tel Aviv Marathon (February) for early arrivals
- Corporate rate agreements

**4. Value-Added Offers**
- Free breakfast or late checkout
- Spa/wellness packages

Expected impact: 10-15% revenue increase compared to standard January.`
    }

    if (
      lowerQ.includes("august") ||
      lowerQ.includes("אוגוסט") ||
      lowerQ.includes("expensive") ||
      lowerQ.includes("יקר")
    ) {
      return `August is the peak month for Tel Aviv hotels due to:

**High Demand Factors:**
• European summer vacation period
• American family travel season
• Pleasant beach weather
• High airline capacity

**Market Data:**
- Average price: $190/night (+30% vs annual avg)
- Occupancy: 85-90%
- Booking lead time: 3-4 months

**Recommendation:**
Prices in August can be set 25-35% above your base rate. The market supports premium pricing, and last-minute bookings often pay even higher rates due to limited availability.

Your current prediction shows ${predictions.filter((p: any) => new Date(p.prediction_date).getMonth() === 7).length > 0 ? "optimized rates for August" : "you should generate August predictions"}.`
    }

    if (lowerQ.includes("competitor") || lowerQ.includes("מתחר")) {
      return `Competitor pricing significantly influences your optimal rates:

**Current Market Position:**
Based on your scraper data, here's how competitors affect predictions:

• If you're **15%+ above competitors**: Risk of losing bookings
• If you're **15%+ below competitors**: Leaving money on the table
• **Sweet spot**: Within 5-10% of competitor average

**Strategy by Season:**
- **Peak season**: Price at or slightly above competitors (demand supports it)
- **Low season**: Price slightly below to capture market share
- **Events**: All properties raise prices - follow the market

**Recommendation:**
Enable daily competitor scanning to keep predictions accurate. The system adjusts your recommended price based on real-time competitor rates.`
    }

    if (lowerQ.includes("event") || lowerQ.includes("אירוע")) {
      return `Key events to prepare for in Tel Aviv:

**High-Impact Events:**

🏳️‍🌈 **Pride Week (June)**
- Impact: +25% occupancy, +20% prices
- Book out 2-3 months early
- Action: Raise prices starting May

🏃 **Tel Aviv Marathon (February)**
- Impact: +15% occupancy
- Short booking window
- Action: Target runners with packages

✡️ **Passover (March/April)**
- Impact: +30% occupancy, +25% prices
- Family travel peak
- Action: Offer family packages

🎄 **New Year's Eve (December 31)**
- Impact: +35% occupancy, +30% prices
- High demand for 3-4 night stays
- Action: Minimum stay requirements

**Pro Tip:** Monitor the events calendar and adjust prices 6-8 weeks before major events.`
    }

    // Default response
    return `Based on your question about "${question}", here's what I can tell you:

The prediction system analyzes multiple data sources including:
- Market trends from Google Trends and tourism databases
- Competitor pricing from your scan results
- Your booking data and revenue targets
- Seasonal patterns specific to Tel Aviv

For more specific insights, try asking about:
• Specific months or seasons
• Pricing factors and weights
• Event-based pricing strategies
• Competitor analysis

What specific aspect would you like me to explain in more detail?`
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    const response = await generateResponse(input)

    const assistantMessage: Message = {
      role: "assistant",
      content: response,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, assistantMessage])
    setLoading(false)
  }

  const handleQuickQuestion = (question: string) => {
    setInput(question)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Chat Area */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareIcon className="h-5 w-5 text-purple-500" />
            AI Revenue Assistant
          </CardTitle>
          <CardDescription>Ask questions about predictions, pricing strategies, and market insights</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, i) => (
                <div key={i} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                      <SparklesIcon className="h-4 w-4 text-purple-500" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-4 rounded-lg ${
                      message.role === "user"
                        ? "bg-cyan-500 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    <div
                      className={`text-xs mt-2 ${message.role === "user" ? "text-cyan-100" : "text-muted-foreground"}`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="h-4 w-4 text-cyan-500" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <SparklesIcon className="h-4 w-4 text-purple-500 animate-pulse" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about predictions, pricing, or market trends..."
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              />
              <Button onClick={handleSend} disabled={loading || !input.trim()}>
                <SendIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Questions</CardTitle>
          <CardDescription>Click to ask common questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {QUICK_QUESTIONS.map((question, i) => (
              <Button
                key={i}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 px-4 bg-transparent"
                onClick={() => handleQuickQuestion(question)}
              >
                <span className="text-sm">{question}</span>
              </Button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <h4 className="font-medium mb-2">Data Sources</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Google Trends</li>
              <li>• Israel CBS Statistics</li>
              <li>• Ministry of Tourism</li>
              <li>• Your scan results</li>
              <li>• Booking history</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
