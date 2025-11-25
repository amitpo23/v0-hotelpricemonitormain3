import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { hotels } = await request.json()

  if (!hotels || hotels.length === 0) {
    return NextResponse.json({ error: "No hotels provided" }, { status: 400 })
  }

  // Get recent scan results to inform predictions
  const { data: recentResults } = await supabase
    .from("scan_results")
    .select("*")
    .order("scraped_at", { ascending: false })
    .limit(100)

  // Calculate market averages
  const marketAvgByHotel: Record<string, number> = {}
  recentResults?.forEach((r: any) => {
    if (!marketAvgByHotel[r.hotel_id]) {
      marketAvgByHotel[r.hotel_id] = Number(r.price)
    } else {
      marketAvgByHotel[r.hotel_id] = (marketAvgByHotel[r.hotel_id] + Number(r.price)) / 2
    }
  })

  const predictions: any[] = []
  const today = new Date()

  for (const hotel of hotels) {
    const basePrice = hotel.base_price || marketAvgByHotel[hotel.id] || 150

    // Generate predictions for the next 30 days
    for (let i = 0; i < 30; i++) {
      const predDate = new Date(today)
      predDate.setDate(predDate.getDate() + i)

      const dayOfWeek = predDate.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
      const month = predDate.getMonth()

      // Seasonality factor
      const seasonalityFactors: Record<number, number> = {
        0: 0.85,
        1: 0.8,
        2: 0.9,
        3: 1.0,
        4: 1.05,
        5: 1.15,
        6: 1.25,
        7: 1.3,
        8: 1.1,
        9: 0.95,
        10: 0.9,
        11: 1.2,
      }
      const seasonality = seasonalityFactors[month] || 1.0

      // Weekend premium
      const weekendFactor = isWeekend ? 1.15 : 1.0

      // Random market variation
      const variation = 0.95 + Math.random() * 0.1

      // Calculate predicted price
      const predictedPrice = Math.round(basePrice * seasonality * weekendFactor * variation)

      // Determine demand level
      let demand: string
      const demandScore = seasonality * weekendFactor
      if (demandScore > 1.3) demand = "very_high"
      else if (demandScore > 1.1) demand = "high"
      else if (demandScore > 0.9) demand = "medium"
      else demand = "low"

      // Confidence based on data availability
      const confidence = recentResults && recentResults.length > 10 ? 0.85 : 0.65

      predictions.push({
        hotel_id: hotel.id,
        prediction_date: predDate.toISOString().split("T")[0],
        predicted_price: predictedPrice,
        predicted_demand: demand,
        confidence_score: confidence,
        factors: {
          seasonality: month >= 5 && month <= 8 ? "high" : month >= 11 || month <= 1 ? "holiday" : "normal",
          day_of_week: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek],
          competitor_avg: marketAvgByHotel[hotel.id] ? Math.round(marketAvgByHotel[hotel.id]) : null,
          events: isWeekend ? ["Weekend"] : [],
        },
      })
    }
  }

  // Delete old predictions for these hotels
  const hotelIds = hotels.map((h: any) => h.id)
  await supabase
    .from("price_predictions")
    .delete()
    .in("hotel_id", hotelIds)
    .gte("prediction_date", today.toISOString().split("T")[0])

  // Insert new predictions
  const { error } = await supabase.from("price_predictions").insert(predictions)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    count: predictions.length,
    message: `Generated ${predictions.length} predictions for ${hotels.length} hotels`,
  })
}
