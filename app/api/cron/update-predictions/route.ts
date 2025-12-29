/**
 * Update Predictions Cron Job
 * 
 * Runs every hour to:
 * 1. Collect latest competitor prices
 * 2. Run enhanced prediction algorithm
 * 3. Generate forecasts for 12 months ahead
 * 4. Update price_predictions and monthly_forecasts tables
 * 
 * Schedule: Every hour (0 * * * *)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { 
  calculateDemandForecast, 
  calculateSeasonalMultiplier,
  calculateCompetitorInfluence,
  applyPricingStrategy 
} from "@/lib/prediction-algorithms";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify cron secret
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.warn('⚠️ CRON_SECRET לא מוגדר - מריץ בכל מקרה');
    return true;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  console.log('🔄 Update Predictions Cron - התחלה');
  
  // Verify auth
  if (!verifyCronAuth(request)) {
    console.error('❌ אימות נכשל');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    
    // 1. Get hotel configuration
    const { data: hotels, error: hotelsError } = await supabase
      .from('hotels')
      .select('id, name, base_price, total_rooms')
      .limit(1)
      .single();

    if (hotelsError || !hotels) {
      throw new Error('לא נמצא מלון');
    }

    console.log(`🏨 מעבד תחזיות עבור: ${hotels.name}`);

    // 2. Get competitor data for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentPrices, error: pricesError } = await supabase
      .from('competitor_daily_prices')
      .select(`
        date,
        price,
        currency,
        availability,
        hotel_competitors (
          name,
          star_rating,
          base_price
        )
      `)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (pricesError) {
      throw new Error(`שגיאה בטעינת מחירים: ${pricesError.message}`);
    }

    console.log(`📊 נטענו ${recentPrices?.length || 0} מחירי מתחרים`);

    // 3. Calculate statistics from recent data
    const priceStats = calculatePriceStatistics(recentPrices || []);
    
    // 4. Generate predictions for 12 months ahead
    const predictions = [];
    const monthlyForecasts = [];
    const today = new Date();
    
    // Generate daily predictions for next 365 days
    for (let daysAhead = 0; daysAhead < 365; daysAhead++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysAhead);
      const dateStr = targetDate.toISOString().split('T')[0];

      // Calculate prediction components
      const demandForecast = calculateDemandForecast(targetDate, priceStats);
      const seasonalMultiplier = calculateSeasonalMultiplier(targetDate);
      const competitorInfluence = calculateCompetitorInfluence(
        priceStats.avgPrice,
        priceStats.minPrice,
        priceStats.maxPrice
      );

      // Calculate recommended price
      const basePrice = hotels.base_price || 500;
      let recommendedPrice = basePrice * demandForecast * seasonalMultiplier;
      
      // Apply competitor influence
      recommendedPrice = recommendedPrice * (1 + competitorInfluence * 0.1);
      
      // Apply pricing strategy (min/max bounds)
      const finalPrice = applyPricingStrategy(recommendedPrice, basePrice);

      predictions.push({
        hotel_id: hotels.id,
        date: dateStr,
        predicted_price: Math.round(finalPrice),
        confidence_level: calculateConfidence(daysAhead, priceStats.dataPoints),
        demand_forecast: demandForecast,
        seasonal_multiplier: seasonalMultiplier,
        competitor_influence: competitorInfluence,
        prediction_factors: {
          base_price: basePrice,
          demand: demandForecast,
          seasonal: seasonalMultiplier,
          competitor: competitorInfluence,
          days_ahead: daysAhead
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    console.log(`📈 נוצרו ${predictions.length} תחזיות יומיות`);

    // 5. Calculate monthly aggregates
    const monthlyData = aggregateToMonthly(predictions, hotels.id);
    
    console.log(`📅 נוצרו ${monthlyData.length} תחזיות חודשיות`);

    // 6. Delete old predictions and insert new ones
    const { error: deleteError } = await supabase
      .from('price_predictions')
      .delete()
      .eq('hotel_id', hotels.id);

    if (deleteError) {
      console.warn('⚠️ שגיאה במחיקת תחזיות ישנות:', deleteError);
    }

    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < predictions.length; i += batchSize) {
      const batch = predictions.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('price_predictions')
        .insert(batch);

      if (insertError) {
        console.error(`❌ שגיאה בהכנסת batch ${i / batchSize + 1}:`, insertError);
      } else {
        inserted += batch.length;
      }
    }

    console.log(`✅ הוכנסו ${inserted} תחזיות יומיות`);

    // 7. Update monthly forecasts
    const { error: deleteMonthlyError } = await supabase
      .from('monthly_forecasts')
      .delete()
      .eq('hotel_id', hotels.id);

    if (deleteMonthlyError) {
      console.warn('⚠️ שגיאה במחיקת תחזיות חודשיות:', deleteMonthlyError);
    }

    const { error: insertMonthlyError } = await supabase
      .from('monthly_forecasts')
      .insert(monthlyData);

    if (insertMonthlyError) {
      console.error('❌ שגיאה בהכנסת תחזיות חודשיות:', insertMonthlyError);
    } else {
      console.log(`✅ הוכנסו ${monthlyData.length} תחזיות חודשיות`);
    }

    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: 'תחזיות עודכנו בהצלחה',
      hotel: hotels.name,
      daily_predictions: inserted,
      monthly_forecasts: monthlyData.length,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ שגיאה בעדכון תחזיות:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Helper: Calculate statistics from recent prices
function calculatePriceStatistics(prices: any[]) {
  if (prices.length === 0) {
    return {
      avgPrice: 500,
      minPrice: 400,
      maxPrice: 800,
      dataPoints: 0,
      trend: 0
    };
  }

  const priceValues = prices
    .map(p => p.price)
    .filter(p => p && p > 0);

  const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
  const minPrice = Math.min(...priceValues);
  const maxPrice = Math.max(...priceValues);

  // Calculate trend (last 7 days vs previous 7 days)
  const last7 = priceValues.slice(0, 7);
  const prev7 = priceValues.slice(7, 14);
  
  const last7Avg = last7.length > 0 
    ? last7.reduce((a, b) => a + b, 0) / last7.length 
    : avgPrice;
  const prev7Avg = prev7.length > 0 
    ? prev7.reduce((a, b) => a + b, 0) / prev7.length 
    : avgPrice;
  
  const trend = prev7Avg > 0 ? (last7Avg - prev7Avg) / prev7Avg : 0;

  return {
    avgPrice,
    minPrice,
    maxPrice,
    dataPoints: priceValues.length,
    trend
  };
}

// Helper: Calculate confidence based on data availability
function calculateConfidence(daysAhead: number, dataPoints: number): number {
  // Base confidence decreases with distance
  let confidence = 1.0 - (daysAhead / 365) * 0.3; // Max 30% decrease
  
  // Adjust for data availability
  if (dataPoints < 10) {
    confidence *= 0.7; // Low data = low confidence
  } else if (dataPoints < 50) {
    confidence *= 0.85;
  }
  
  return Math.max(0.5, Math.min(1.0, confidence));
}

// Helper: Aggregate daily predictions to monthly
function aggregateToMonthly(predictions: any[], hotelId: string) {
  const monthlyMap = new Map<string, any[]>();

  // Group by month
  predictions.forEach(pred => {
    const month = pred.date.substring(0, 7); // YYYY-MM
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, []);
    }
    monthlyMap.get(month)!.push(pred);
  });

  // Calculate monthly aggregates
  const monthlyForecasts = [];
  
  for (const [month, preds] of monthlyMap.entries()) {
    const avgPrice = preds.reduce((sum, p) => sum + p.predicted_price, 0) / preds.length;
    const minPrice = Math.min(...preds.map(p => p.predicted_price));
    const maxPrice = Math.max(...preds.map(p => p.predicted_price));
    const avgDemand = preds.reduce((sum, p) => sum + p.demand_forecast, 0) / preds.length;
    const avgConfidence = preds.reduce((sum, p) => sum + p.confidence_level, 0) / preds.length;

    monthlyForecasts.push({
      hotel_id: hotelId,
      month: month,
      predicted_avg_price: Math.round(avgPrice),
      predicted_min_price: Math.round(minPrice),
      predicted_max_price: Math.round(maxPrice),
      expected_demand: avgDemand,
      confidence_score: avgConfidence,
      total_days: preds.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  return monthlyForecasts;
}
