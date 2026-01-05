import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get total prediction generations
    const { count: totalPredictions, error: predError } = await supabase
      .from('price_predictions')
      .select('*', { count: 'exact', head: true });

    if (predError) throw predError;

    // Get accuracy data - predictions vs actual results
    const { data: accuracyData, error: accError } = await supabase
      .from('price_predictions')
      .select('predicted_price, prediction_date')
      .not('predicted_price', 'is', null)
      .order('prediction_date', { ascending: false })
      .limit(100);

    if (accError) throw accError;

    // Calculate avg price from recent predictions
    const avgPredictedPrice = accuracyData && accuracyData.length > 0
      ? accuracyData.reduce((sum, p) => sum + (p.predicted_price || 0), 0) / accuracyData.length
      : 0;

    // Get learning system health - recent activity
    const { data: recentPredictions, error: recentError } = await supabase
      .from('price_predictions')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentError) throw recentError;

    const lastPredictionTime = recentPredictions && recentPredictions.length > 0
      ? recentPredictions[0].created_at
      : null;

    // System health status
    const systemHealth = lastPredictionTime
      ? (new Date().getTime() - new Date(lastPredictionTime).getTime()) < 86400000
        ? 'healthy'
        : 'needs_attention'
      : 'inactive';

    return NextResponse.json({
      totalPredictions: totalPredictions || 0,
      avgPredictedPrice: Math.round(avgPredictedPrice),
      lastPredictionTime,
      systemHealth,
      recentActivity: accuracyData?.length || 0
    });
  } catch (error) {
    console.error('Error fetching learning stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning stats' },
      { status: 500 }
    );
  }
}