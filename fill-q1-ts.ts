/**
 * Q1 2026 Direct Data Population using TypeScript scraper
 */

import { createClient } from '@supabase/supabase-js';
import { scrapeBookingPrice } from './lib/scraper/booking-scraper';
import { readFileSync } from 'fs';

// Load .env.local manually
let SUPABASE_URL: string, SUPABASE_KEY: string;
try {
  const envContent = readFileSync('.env.local', 'utf-8');
  const envVars = Object.fromEntries(
    envContent.split('\n')
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split('=').map(s => s.trim()))
  );
  SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
  SUPABASE_KEY = envVars.SUPABASE_SERVICE_KEY;
} catch (e) {
  SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function main() {
  console.log('🚀 Q1 2026 Data Population with TypeScript Scraper\n');
  
  // Get competitors
  const { data: competitors } = await supabase
    .from('hotel_competitors')
    .select('*')
    .eq('hotel_id', HOTEL_ID)
    .eq('is_active', true);
  
  if (!competitors || competitors.length === 0) {
    console.error('❌ No competitors');
    return;
  }
  
  // Filter competitors with booking URLs
  const validCompetitors = competitors.filter(c => c.booking_url && c.booking_url.length > 20);
  console.log(`👥 Found ${validCompetitors.length}/${competitors.length} competitors with URLs\n`);
  
  const startDate = new Date('2026-01-01');
  const endDate = new Date('2026-03-31');
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  console.log(`📅 Range: ${formatDate(startDate)} to ${formatDate(endDate)} (${totalDays} days)\n`);
  
  let savedCount = 0;
  let errorCount = 0;
  let currentDate = new Date(startDate);
  let dayNum = 0;
  
  while (currentDate <= endDate) {
    dayNum++;
    const checkIn = formatDate(currentDate);
    const checkOut = formatDate(addDays(currentDate, 1));
    
    console.log(`\n📆 ${dayNum}/${totalDays}: ${checkIn}`);
    
    // Process competitors in parallel (3 at a time)
    const BATCH_SIZE = 3;
    for (let i = 0; i < validCompetitors.length; i += BATCH_SIZE) {
      const batch = validCompetitors.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (competitor) => {
        try {
          const result = await scrapeBookingPrice(
            competitor.competitor_hotel_name,
            'Tel Aviv',
            checkIn,
            checkOut,
            competitor.booking_url  // Pass the booking URL!
          );
          
          if (result.success && result.results.length > 0) {
            // Save to DB
            for (const room of result.results) {
              const { error } = await supabase
                .from('competitor_daily_prices')
                .insert({
                  hotel_id: HOTEL_ID,
                  competitor_id: competitor.id,
                  date: checkIn,
                  price: room.price,
                  room_type: room.roomType,
                  source: 'Booking.com',
                  currency: room.currency,
                  scraped_at: new Date().toISOString()
                });
              
              if (!error) {
                savedCount++;
                process.stdout.write('.');
              } else if (error.code === '23505') {
                process.stdout.write('-');  // Duplicate
              } else {
                errorCount++;
                process.stdout.write('x');
              }
            }
          } else {
            process.stdout.write('_');
          }
        } catch (e: any) {
          process.stdout.write('!');
          errorCount++;
        }
      }));
      
      // Small delay between batches
      await new Promise(r => setTimeout(r, 500));
    }
    
    currentDate = addDays(currentDate, 1);
    
    if (dayNum % 10 === 0) {
      console.log(`\n   Progress: Saved=${savedCount}, Errors=${errorCount}`);
    }
  }
  
  console.log('\n\n✅ Complete!');
  console.log(`📊 Saved: ${savedCount} | Errors: ${errorCount}`);
}

main().catch(console.error);
