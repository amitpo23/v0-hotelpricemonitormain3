import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envLocal = readFileSync('.env.local', 'utf8');
const envVars = {};
envLocal.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('🔍 בודק אם טבלת prediction_logs קיימת...\n');

try {
  const { count, error } = await supabase
    .from('prediction_logs')
    .select('*', { count: 'exact', head: true });
  
  if (!error) {
    console.log(`✅ הטבלה prediction_logs קיימת עם ${count} רשומות`);
    
    const { data: samples } = await supabase
      .from('prediction_logs')
      .select('id, hotel_name, prediction_date, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (samples && samples.length > 0) {
      console.log('\n📊 5 לוגים אחרונים:');
      samples.forEach((log, i) => {
        console.log(`   ${i + 1}. ${log.hotel_name} - ${log.prediction_date}`);
      });
    }
  } else {
    console.log(`❌ הטבלה prediction_logs לא קיימת:`);
    console.log(`   ${error.message}`);
    console.log('\n💡 צריך ליצור את הטבלה עם הקובץ create-prediction-logs-table.sql');
  }
} catch (err) {
  console.error('❌ שגיאה:', err.message);
}

process.exit(0);
