"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UsersIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon } from "@/components/icons"

interface HotelCompetitorTableProps {
  competitorData: any[]
  hotelBasePrice: number
}

export function HotelCompetitorTable({ competitorData, hotelBasePrice }: HotelCompetitorTableProps) {
  // Group by competitor and get latest data
  const competitorMap: Record<string, any[]> = {}
  competitorData.forEach((item: any) => {
    if (!competitorMap[item.competitor_name]) {
      competitorMap[item.competitor_name] = []
    }
    competitorMap[item.competitor_name].push(item)
  })

  const competitors = Object.entries(competitorMap)
    .map(([name, data]) => {
      const latest = data[0]
      const avgPrice = data.reduce((s: number, d: any) => s + Number(d.price), 0) / data.length
      const avgRating =
        data.filter((d: any) => d.rating).length > 0
          ? data.filter((d: any) => d.rating).reduce((s: number, d: any) => s + Number(d.rating), 0) /
            data.filter((d: any) => d.rating).length
          : null
      const priceDiff = hotelBasePrice - avgPrice
      const priceDiffPercent = hotelBasePrice > 0 ? (priceDiff / hotelBasePrice) * 100 : 0

      return {
        name,
        latestPrice: Number(latest.price),
        avgPrice,
        avgRating,
        reviewCount: latest.review_count,
        availability: latest.availability,
        priceDiff,
        priceDiffPercent,
        dataPoints: data.length,
        lastUpdated: latest.scraped_at,
      }
    })
    .sort((a, b) => a.avgPrice - b.avgPrice)

  if (competitors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Competitor Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Competitor Data</h3>
            <p className="text-muted-foreground">Run a scan to gather competitor pricing data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5" />
          Competitor Analysis
        </CardTitle>
        <CardDescription>
          Comparing your base price (${hotelBasePrice}) against {competitors.length} competitors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {competitors.map((comp) => (
            <div key={comp.name} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{comp.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {comp.avgRating && <span>⭐ {comp.avgRating.toFixed(1)}</span>}
                    {comp.reviewCount && <span>({comp.reviewCount} reviews)</span>}
                    <Badge variant={comp.availability ? "default" : "secondary"} className="text-xs">
                      {comp.availability ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">${comp.avgPrice.toFixed(0)}</div>
                  <div
                    className={`flex items-center justify-end text-sm ${
                      comp.priceDiff > 0
                        ? "text-green-600"
                        : comp.priceDiff < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {comp.priceDiff > 0 ? (
                      <>
                        <TrendingDownIcon className="h-3 w-3 mr-1" />${Math.abs(comp.priceDiff).toFixed(0)} cheaper
                      </>
                    ) : comp.priceDiff < 0 ? (
                      <>
                        <TrendingUpIcon className="h-3 w-3 mr-1" />${Math.abs(comp.priceDiff).toFixed(0)} more expensive
                      </>
                    ) : (
                      <>
                        <MinusIcon className="h-3 w-3 mr-1" />
                        Same price
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Price comparison bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Price comparison</span>
                  <span>
                    {comp.priceDiffPercent > 0 ? "+" : ""}
                    {comp.priceDiffPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${comp.priceDiff >= 0 ? "bg-green-500" : "bg-red-500"}`}
                    style={{
                      width: `${Math.min(100, Math.max(0, 50 + comp.priceDiffPercent))}%`,
                      marginLeft: comp.priceDiff < 0 ? `${50 + comp.priceDiffPercent}%` : "50%",
                    }}
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>{comp.dataPoints} data points</span>
                <span>Updated {new Date(comp.lastUpdated).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50">
          <h4 className="font-medium mb-2">Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Cheapest</div>
              <div className="font-bold">${Math.min(...competitors.map((c) => c.avgPrice)).toFixed(0)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Average</div>
              <div className="font-bold">
                ${(competitors.reduce((s, c) => s + c.avgPrice, 0) / competitors.length).toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Most Expensive</div>
              <div className="font-bold">${Math.max(...competitors.map((c) => c.avgPrice)).toFixed(0)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
