import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n🔍 Checking predictions for session gen-1767...\n');

// Check predictions
const { data: predictions, error } = await supabase
  .from('price_predictions')
  .select('*')
  .eq('session_id', 'gen-1767')
  .order('prediction_date', { ascending: true })
  .limit(10);

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log(`✅ Found ${predictions.length} predictions in database`);
  if (predictions.length > 0) {
    console.log('\n📊 Sample predictions:');
    predictions.slice(0, 3).forEach(p => {
      console.log(`  • ${p.prediction_date} - Hotel: ${p.hotel_id} - Price: ₪${p.predicted_price} - Confidence: ${p.confidence_score}%`);
    });
  }
}

// Check prediction logs
const { data: logs, error: logError } = await supabase
  .from('prediction_logs')
  .select('*')
  .eq('session_id', 'gen-1767')
  .limit(5);

if (logError) {
  console.error('❌ Log Error:', logError);
} else {
  console.log(`\n📝 Found ${logs.length} prediction logs`);
  if (logs.length > 0) {
    console.log('\n📋 Sample log:');
    const log = logs[0];
    console.log('  Hotel ID:', log.hotel_id);
    console.log('  Date:', log.prediction_date);
    console.log('  Current Price:', log.current_price);
    console.log('  Competitors Avg:', log.competitors_avg_price);
    console.log('  Recommendation:', log.recommendation);
  }
}

