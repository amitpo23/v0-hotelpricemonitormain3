import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TargetIcon,
  CalendarIcon,
  SparklesIcon,
  TrendingUpIcon,
  GlobeIcon,
  MessageSquareIcon,
  DollarSignIcon,
  BedDoubleIcon,
  UsersIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  BarChart3Icon,
} from "@/components/icons"
import { PredictionChart } from "./prediction-chart"
import { GeneratePredictionsButton } from "./generate-button"
import { YearlyPredictions } from "./yearly-predictions"
import { MarketIntelligence } from "./market-intelligence"
import { PredictionChat } from "./prediction-chat"
import { RevenueForecast } from "./revenue-forecast"
import { EnhancedPredictionCard } from "./enhanced-prediction-card"
import { LivePredictions } from "./live-predictions"
import { DailyPredictionsTab } from "./daily-predictions-tab"

export default async function PredictionsPage() {
  const supabase = await createClient()

  const [
    { data: predictions },
    { data: hotels },
    { data: roomTypes },
    { data: budgets },
    { data: forecasts },
    { data: bookings },
    { data: competitorPrices },
    { data: scans },
  ] = await Promise.all([
    supabase
      .from("price_predictions")
      .select("*, hotels (name)")
      .order("prediction_date", { ascending: true })
      .gte("prediction_date", new Date().toISOString().split("T")[0]),
    supabase.from("hotels").select("id, name, base_price, location, total_rooms"),
    supabase.from("hotel_room_types").select("*").eq("is_active", true),
    supabase.from("revenue_budgets").select("*"),
    supabase.from("monthly_forecasts").select("*").eq("year", new Date().getFullYear()),
    supabase
      .from("bookings")
      .select("*")
      .eq("status", "confirmed")
      .gte("check_in_date", new Date().toISOString().split("T")[0]),
    supabase
      .from("competitor_daily_prices")
      .select("date, price, source")
      .gte("date", new Date().toISOString().split("T")[0]),
    supabase.from("scans").select("created_at").order("created_at", { ascending: false }).limit(1),
  ])

  const stats = predictions?.length
    ? {
        avgConfidence: predictions.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / predictions.length,
        avgPrice: predictions.reduce((sum, p) => sum + (p.predicted_price || 0), 0) / predictions.length,
        minPrice: Math.min(...predictions.map((p) => p.predicted_price || 0)),
        maxPrice: Math.max(...predictions.map((p) => p.predicted_price || 0)),
        demandDistribution: predictions.reduce(
          (acc, p) => {
            acc[p.predicted_demand || "unknown"] = (acc[p.predicted_demand || "unknown"] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        ),
        withRecommendations: predictions.filter((p) => p.recommendation).length,
      }
    : null

  const recommendations = predictions?.filter((p) => p.recommendation).slice(0, 10) || []

  const lastScan = scans?.[0]?.created_at
  const hoursSinceLastScan = lastScan
    ? Math.round((Date.now() - new Date(lastScan).getTime()) / (1000 * 60 * 60))
    : null

  const getDemandColor = (demand: string | null) => {
    switch (demand) {
      case "very_high":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700"
      case "low":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    }
  }

  const predictionsByHotel =
    predictions?.reduce((acc: any, pred: any) => {
      const hotelId = pred.hotel_id
      if (!acc[hotelId]) {
        acc[hotelId] = {
          hotelName: pred.hotels?.name || "Unknown",
          predictions: [],
        }
      }
      acc[hotelId].predictions.push(pred)
      return acc
    }, {}) || {}

  const getOccupancyForHotel = (hotelId: string) => {
    const hotelBookings = bookings?.filter((b) => b.hotel_id === hotelId) || []
    const hotel = hotels?.find((h) => h.id === hotelId)
    const totalRooms = hotel?.total_rooms || 50
    const today = new Date().toISOString().split("T")[0]

    let bookedToday = 0
    hotelBookings.forEach((b) => {
      if (b.check_in_date <= today && b.check_out_date > today) {
        bookedToday += b.room_count || 1
      }
    })

    return {
      bookedToday,
      totalRooms,
      occupancyRate: Math.round((bookedToday / totalRooms) * 100),
      futureBookings: hotelBookings.length,
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <TargetIcon className="h-10 w-10 text-purple-500" />
            AI Price Predictions / חיזוי מחירים
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            AI-powered demand forecasting with market intelligence - מתחשב בתפוסה, תקציב ונתוני שוק
          </p>
        </div>
        <GeneratePredictionsButton hotels={hotels || []} />
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Avg Confidence</div>
              <div className="text-2xl font-bold text-purple-400">{(stats.avgConfidence * 100).toFixed(0)}%</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Avg Price</div>
              <div className="text-2xl font-bold text-cyan-400">₪{Math.round(stats.avgPrice)}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Price Range</div>
              <div className="text-lg font-bold text-green-400">
                ₪{stats.minPrice} - ₪{stats.maxPrice}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Predictions</div>
              <div className="text-2xl font-bold text-orange-400">{predictions?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Recommendations</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.withRecommendations}</div>
            </CardContent>
          </Card>
          <Card
            className={`bg-gradient-to-br ${hoursSinceLastScan && hoursSinceLastScan < 24 ? "from-green-500/10 to-green-600/5 border-green-500/20" : "from-red-500/10 to-red-600/5 border-red-500/20"}`}
          >
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Data Freshness</div>
              <div
                className={`text-lg font-bold ${hoursSinceLastScan && hoursSinceLastScan < 24 ? "text-green-400" : "text-red-400"}`}
              >
                {hoursSinceLastScan ? `${hoursSinceLastScan}h ago` : "Unknown"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mb-6 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <GlobeIcon className="h-5 w-5 text-blue-500" />
            Data Sources / מקורות נתונים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="flex items-center gap-2 p-2 rounded bg-slate-800/50">
              <BedDoubleIcon className="h-4 w-4 text-cyan-500" />
              <div>
                <div className="text-xs text-muted-foreground">Bookings</div>
                <div className="font-semibold">{bookings?.length || 0}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-slate-800/50">
              <UsersIcon className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-xs text-muted-foreground">Competitor Prices</div>
                <div className="font-semibold">{competitorPrices?.length || 0}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-slate-800/50">
              <DollarSignIcon className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-xs text-muted-foreground">Budgets</div>
                <div className="font-semibold">{budgets?.length || 0}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-slate-800/50">
              <CalendarIcon className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-xs text-muted-foreground">Forecasts</div>
                <div className="font-semibold">{forecasts?.length || 0}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-slate-800/50">
              <TargetIcon className="h-4 w-4 text-yellow-500" />
              <div>
                <div className="text-xs text-muted-foreground">Room Types</div>
                <div className="font-semibold">{roomTypes?.length || 0}</div>
              </div>
            </div>
            <div
              className={`flex items-center gap-2 p-2 rounded ${hoursSinceLastScan && hoursSinceLastScan < 24 ? "bg-green-900/30" : "bg-red-900/30"}`}
            >
              <TrendingUpIcon
                className={`h-4 w-4 ${hoursSinceLastScan && hoursSinceLastScan < 24 ? "text-green-500" : "text-red-500"}`}
              />
              <div>
                <div className="text-xs text-muted-foreground">Last Scan</div>
                <div
                  className={`font-semibold ${hoursSinceLastScan && hoursSinceLastScan < 24 ? "text-green-400" : "text-red-400"}`}
                >
                  {hoursSinceLastScan ? `${hoursSinceLastScan}h ago` : "N/A"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {stats && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3Icon className="h-5 w-5" />
              Demand Distribution / התפלגות ביקוש
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.demandDistribution).map(([demand, count]) => (
                <div key={demand} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${getDemandColor(demand)}`}>
                  <span className="font-medium capitalize">{demand.replace("_", " ")}</span>
                  <Badge variant="secondary">{count} days</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <Card className="mb-6 border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-500">
              <AlertTriangleIcon className="h-5 w-5" />
              AI Recommendations / המלצות ({recommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommendations.map((rec: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    rec.recommendation_type === "price_increase"
                      ? "bg-green-500/10 border-green-500/30"
                      : rec.recommendation_type === "promotion"
                        ? "bg-blue-500/10 border-blue-500/30"
                        : rec.recommendation_type === "competitor_alert"
                          ? "bg-orange-500/10 border-orange-500/30"
                          : "bg-purple-500/10 border-purple-500/30"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {rec.recommendation_type === "price_increase" && (
                      <TrendingUpIcon className="h-4 w-4 text-green-500 mt-0.5" />
                    )}
                    {rec.recommendation_type === "promotion" && (
                      <DollarSignIcon className="h-4 w-4 text-blue-500 mt-0.5" />
                    )}
                    {rec.recommendation_type === "competitor_alert" && (
                      <AlertTriangleIcon className="h-4 w-4 text-orange-500 mt-0.5" />
                    )}
                    {rec.recommendation_type === "opportunity" && (
                      <CheckCircleIcon className="h-4 w-4 text-purple-500 mt-0.5" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{rec.recommendation}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ₪{rec.predicted_price} | {(rec.confidence_score * 100).toFixed(0)}% confidence
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="live" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="live" className="flex items-center gap-2">
            <SparklesIcon className="h-4 w-4" />
            Live / חי
          </TabsTrigger>
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Daily / יומי
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <DollarSignIcon className="h-4 w-4" />
            Revenue / הכנסות
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4" />
            Monthly / חודשי
          </TabsTrigger>
          <TabsTrigger value="market" className="flex items-center gap-2">
            <GlobeIcon className="h-4 w-4" />
            Market Intel / שוק
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquareIcon className="h-4 w-4" />
            AI Chat / צ'אט
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-6">
          <LivePredictions />
        </TabsContent>

        <TabsContent value="daily" className="space-y-6">
          <DailyPredictionsTab
            predictions={predictions || []}
            hotels={hotels || []}
            competitorPrices={competitorPrices || []}
            recommendations={recommendations}
            predictionsByHotel={predictionsByHotel}
            bookings={bookings || []}
          />
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueForecast
            hotels={hotels || []}
            budgets={budgets || []}
            forecasts={forecasts || []}
            roomTypes={roomTypes || []}
          />
        </TabsContent>

        <TabsContent value="monthly">
          <YearlyPredictions hotels={hotels || []} roomTypes={roomTypes || []} />
        </TabsContent>

        <TabsContent value="market">
          <MarketIntelligence hotels={hotels || []} />
        </TabsContent>

        <TabsContent value="chat">
          <PredictionChat predictions={predictions || []} hotels={hotels || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
