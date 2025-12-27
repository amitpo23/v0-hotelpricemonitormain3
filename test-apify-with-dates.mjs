#!/usr/bin/env node

/**
 * Test Apify scraper with dates
 */

import { scrapeBookingWithApify } from './lib/scraper/apify-booking-scraper.ts'

async function testScraper() {
  console.log('🧪 Testing Apify Scraper with Dates')
  console.log('=====================================\n')
  
  // Test with a well-known hotel in NYC
  const testData = {
    bookingUrl: 'https://www.booking.com/hotel/us/the-plaza.html',
    checkIn: '2026-02-15',
    checkOut: '2026-02-16',
    adults: 2,
    rooms: 1,
    maxItems: 5
  }
  
  console.log('Test parameters:')
  console.log(JSON.stringify(testData, null, 2))
  console.log('\nStarting scrape...\n')
  
  try {
    const result = await scrapeBookingWithApify(testData)
    
    console.log('\n✅ Scrape completed!')
    console.log('Success:', result.success)
    console.log('Results found:', result.results?.length || 0)
    
    if (result.success && result.results && result.results.length > 0) {
      console.log('\nFirst result:')
      console.log(JSON.stringify(result.results[0], null, 2))
      
      // Check if we have prices
      const withPrices = result.results.filter(r => r.price && r.price > 0)
      console.log(`\n💰 Results with prices: ${withPrices.length}/${result.results.length}`)
      
      if (withPrices.length > 0) {
        console.log('\n✅ SUCCESS! Found prices:')
        withPrices.forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.name}: ${r.price} ${r.currency}`)
        })
      } else {
        console.log('\n⚠️ WARNING: No prices found in results')
        console.log('This might mean:')
        console.log('  1. The Actor does not support extracting prices')
        console.log('  2. The dates are too far in the future')
        console.log('  3. The hotel has no availability')
      }
    } else {
      console.log('\n❌ Failed or no results')
      if (result.error) {
        console.log('Error:', result.error)
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error during scrape:')
    console.error(error.message)
    console.error('\nFull error:')
    console.error(error)
  }
}

testScraper().catch(console.error)
