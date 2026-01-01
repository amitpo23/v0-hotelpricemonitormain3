import { createClient } from '@supabase/supabase-js';

// Use environment variables from Codespace
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('🔍 בודק טבלת prediction_logs...\n');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
console.log('Key:', (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? '✅' : '❌');
console.log('');

try {
  const { count, error } = await supabase
    .from('prediction_logs')
    .select('*', { count: 'exact', head: true });
  
  if (!error) {
    console.log(`✅ הטבלה prediction_logs קיימת עם ${count} רשומות\n`);
    
    if (count > 0) {
      const { data } = await supabase
        .from('prediction_logs')
        .select('hotel_name, prediction_date, algorithm_version')
        .order('created_at', { ascending: false })
        .limit(3);
      
      console.log('📊 3 לוגים אחרונים:');
      data.forEach((log, i) => {
        console.log(`   ${i + 1}. ${log.hotel_name} - ${log.prediction_date} (v${log.algorithm_version})`);
      });
    } else {
      console.log('⚠️  הטבלה ריקה - אין לוגים עדיין');
    }
  } else {
    console.log(`❌ שגיאה: ${error.message}`);
    console.log('\n💡 הטבלה prediction_logs לא קיימת. צריך להריץ:\n');
    console.log('   create-prediction-logs-table.sql ב-Supabase Dashboard');
  }
} catch (err) {
  console.error('❌ שגיאה:', err.message);
}
