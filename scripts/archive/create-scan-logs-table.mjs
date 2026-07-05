import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env.local', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('📊 Creating scan_logs table in Supabase...\n');

const createTableSQL = `
CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL,
  status TEXT NOT NULL,
  start_date DATE NOT NULL,
  days_scanned INTEGER NOT NULL,
  results_count INTEGER DEFAULT 0,
  competitors_scanned INTEGER DEFAULT 0,
  prices_found INTEGER DEFAULT 0,
  prices_updated INTEGER DEFAULT 0,
  price_changes_detected INTEGER DEFAULT 0,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  error_details JSONB,
  scan_metadata JSONB,
  checkpoint_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

const createIndexesSQL = `
CREATE INDEX IF NOT EXISTS idx_scan_logs_hotel ON scan_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_type ON scan_logs(scan_type);
CREATE INDEX IF NOT EXISTS idx_scan_logs_status ON scan_logs(status);
CREATE INDEX IF NOT EXISTS idx_scan_logs_triggered ON scan_logs(triggered_at DESC);
`;

// Use Supabase REST API to execute SQL
const url = `${envVars.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`;
const headers = {
  'Content-Type': 'application/json',
  'apikey': envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
};

console.log('🔧 Creating table...');

// Try multiple approaches
(async () => {
  // Approach 1: Direct insert (this will fail but shows the SQL)
  console.log('\n📝 SQL to run manually in Supabase SQL Editor:\n');
  console.log(createTableSQL);
  console.log(createIndexesSQL);
  
  console.log('\n📋 Steps to create table:');
  console.log('1. Go to: https://supabase.com/dashboard/project/_/sql');
  console.log('2. Copy the SQL above');
  console.log('3. Paste and click "Run"');
  console.log('\nOR use the SQL file:');
  console.log('   scripts/002_create_scan_logs_table.sql');
})();
