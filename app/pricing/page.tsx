import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUpIcon, TrendingDownIcon, MinusIcon, DollarSignIcon, BarChart3Icon } from "@/components/icons"

export default async function PricingPage() {
  const supabase = await createClient()

  const { data: hotels } = await supabase.from("hotels").select("*").order("name")

  const { data: recommendations } = await supabase
    .from("price_recommendations")
    .select(`*, hotels (name, base_price)`)
    .order("created_at", { ascending: false })
    .limit(20)

  const { data: recentResults } = await supabase
    .from("scan_results")
    .select(`*, hotels (name)`)
    .order("scraped_at", { ascending: false })
    .limit(50)

  // Calculate market averages by hotel
  const marketData: Record<string, { prices: number[]; avg: number }> = {}
  recentResults?.forEach((result: any) => {
    const hotelId = result.hotel_id
    if (!marketData[hotelId]) {
      marketData[hotelId] = { prices: [], avg: 0 }
    }
    marketData[hotelId].prices.push(result.price)
  })

  Object.keys(marketData).forEach((hotelId) => {
    const prices = marketData[hotelId].prices
    marketData[hotelId].avg = prices.reduce((a, b) => a + b, 0) / prices.length
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Pricing Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400">AI-powered pricing recommendations and market analysis</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Hotels</CardDescription>
            <CardTitle className="text-4xl">{hotels?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Recommendations</CardDescription>
            <CardTitle className="text-4xl">{recommendations?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Price Points Collected</CardDescription>
            <CardTitle className="text-4xl">{recentResults?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5 text-green-600" />
              Price Recommendations
            </CardTitle>
            <CardDescription>AI-generated optimal pricing suggestions</CardDescription>
          </CardHeader>
          <CardContent>
            {!recommendations || recommendations.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3Icon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No recommendations yet. Run scans to generate pricing insights.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recommendations.map((rec: any) => {
                  const basePrice = rec.hotels?.base_price || 0
                  const diff = rec.recommended_price - basePrice
                  const diffPercent = basePrice ? ((diff / basePrice) * 100).toFixed(1) : 0

                  return (
                    <div key={rec.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{rec.hotels?.name}</div>
                          <div className="text-sm text-slate-500">Base: ${basePrice}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">${rec.recommended_price}</div>
                          <div className="flex items-center gap-1 text-sm">
                            {diff > 0 ? (
                              <TrendingUpIcon className="h-3 w-3 text-green-600" />
                            ) : diff < 0 ? (
                              <TrendingDownIcon className="h-3 w-3 text-red-600" />
                            ) : (
                              <MinusIcon className="h-3 w-3 text-slate-400" />
                            )}
                            <span
                              className={diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-slate-400"}
                            >
                              {diff > 0 ? "+" : ""}
                              {diffPercent}%
                            </span>
                          </div>
                        </div>
                      </div>
                      {rec.reasoning && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{rec.reasoning}</p>
                      )}
                      {rec.confidence_score && (
                        <Badge variant="outline" className="mt-2">
                          Confidence: {(rec.confidence_score * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSignIcon className="h-5 w-5 text-blue-600" />
              Market Overview
            </CardTitle>
            <CardDescription>Current competitor pricing by hotel</CardDescription>
          </CardHeader>
          <CardContent>
            {!hotels || hotels.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Add hotels to see market data</p>
            ) : (
              <div className="space-y-4">
                {hotels.map((hotel: any) => {
                  const data = marketData[hotel.id]
                  return (
                    <div key={hotel.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{hotel.name}</div>
                          <div className="text-sm text-slate-500">Your price: ${hotel.base_price || "Not set"}</div>
                        </div>
                        <div className="text-right">
                          {data ? (
                            <>
                              <div className="text-xl font-bold">${data.avg.toFixed(2)}</div>
                              <div className="text-sm text-slate-500">Market avg ({data.prices.length} prices)</div>
                            </>
                          ) : (
                            <span className="text-slate-400">No data</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
