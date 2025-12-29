#!/bin/bash

echo "🔍 Scan Status Check"
echo "===================="
echo ""

# Check if process is running
if ps aux | grep -q "[c]url.*scraper.*run-full"; then
    echo "✅ Scan is RUNNING"
    
    # Get process start time
    START_TIME=$(ps -eo pid,lstart,cmd | grep "[c]url.*scraper" | awk '{print $2, $3, $4, $5, $6}')
    echo "⏰ Started: $START_TIME"
    
    # Calculate runtime
    PID=$(ps aux | grep "[c]url.*scraper" | grep -v grep | awk '{print $2}' | head -1)
    if [ -n "$PID" ]; then
        ELAPSED=$(ps -o etime= -p $PID | tr -d ' ')
        echo "⏱️  Runtime: $ELAPSED"
    fi
else
    echo "❌ Scan is NOT running"
    
    # Check if results file exists
    if [ -f "/tmp/scan_result.json" ]; then
        echo ""
        echo "📄 Last scan result:"
        cat /tmp/scan_result.json | jq '.' 2>/dev/null || cat /tmp/scan_result.json
    fi
fi

echo ""
echo "📊 Database Status:"
echo "-------------------"

# Count total records saved today
cd /workspaces/v0-hotelpricemonitormain3

# Load environment variables
export $(cat .env.local 2>/dev/null | grep -v '^#' | xargs)

node << 'NODE_SCRIPT'
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Count records saved today
    const { count, error } = await supabase
      .from('competitor_daily_prices')
      .select('*', { count: 'exact', head: true })
      .gte('scraped_at', `${today}T00:00:00`);
    
    if (error) throw error;
    
    console.log(`✅ Records saved today: ${count || 0}`);
    
    // Count records for Q1 2026
    const { count: q1Count, error: q1Error } = await supabase
      .from('competitor_daily_prices')
      .select('*', { count: 'exact', head: true })
      .gte('date', '2026-01-01')
      .lte('date', '2026-03-31');
    
    if (q1Error) throw q1Error;
    
    console.log(`📅 Q1 2026 records: ${q1Count || 0}`);
    
    // Get date range
    const { data, error: rangeError } = await supabase
      .from('competitor_daily_prices')
      .select('date')
      .gte('date', '2026-01-01')
      .lte('date', '2026-03-31')
      .order('date', { ascending: true })
      .limit(1);
    
    if (!rangeError && data && data.length > 0) {
      const firstDate = data[0].date;
      
      const { data: lastData } = await supabase
        .from('competitor_daily_prices')
        .select('date')
        .gte('date', '2026-01-01')
        .lte('date', '2026-03-31')
        .order('date', { ascending: false })
        .limit(1);
      
      const lastDate = lastData && lastData[0] ? lastData[0].date : firstDate;
      console.log(`📆 Date range: ${firstDate} to ${lastDate}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabase();
NODE_SCRIPT

echo ""
echo "💡 Tips:"
echo "  - Run this script again: ./check-scan-status.sh"
echo "  - Watch live progress: tail -f /tmp/scan_result.json"
echo "  - Expected time: 30-60 minutes for 90 days"
