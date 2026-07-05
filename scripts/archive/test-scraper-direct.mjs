#!/usr/bin/env node
/**
 * Direct test for scraper with detailed logging
 */

import { scrapeBookingPrices } from './lib/scraper/booking-scraper.tsx'

async function testScraperDirect() {
  console.log('='.repeat(80))
  console.log('DIRECT SCRAPER TEST')
  console.log('='.repeat(80))
  
  const testCases = [
    {
      name: 'Test 1: CoCo Hotel',
      hotelName: 'cucu hotel',
      city: 'Tel Aviv',
      checkIn: '2025-12-26',
      checkOut: '2025-12-27',
      bookingUrl: 'https://www.booking.com/hotel/il/cucu.html'
    }
  ]
  
  for (const test of testCases) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`${test.name}`)
    console.log(`${'='.repeat(80)}`)
    console.log(`Hotel: ${test.hotelName}`)
    console.log(`City: ${test.city}`)
    console.log(`Dates: ${test.checkIn} to ${test.checkOut}`)
    console.log(`URL: ${test.bookingUrl || 'Not provided'}`)
    console.log(`${'='.repeat(80)}\n`)
    
    try {
      const startTime = Date.now()
      
      const result = await scrapeBookingPrices(
        test.hotelName,
        test.city,
        test.checkIn,
        test.checkOut,
        test.bookingUrl
      )
      
      const elapsed = Date.now() - startTime
      
      console.log(`\n${'='.repeat(80)}`)
      console.log(`RESULT for ${test.name}`)
      console.log(`${'='.repeat(80)}`)
      console.log(`Success: ${result.success}`)
      console.log(`Source: ${result.source}`)
      console.log(`Method: ${result.method}`)
      console.log(`Rooms found: ${result.results?.length || 0}`)
      console.log(`Time: ${elapsed}ms`)
      console.log(`Error: ${result.error || 'None'}`)
      
      if (result.results && result.results.length > 0) {
        console.log(`\nRooms:`)
        result.results.forEach((room, i) => {
          console.log(`  ${i + 1}. ${room.roomType}: ₪${room.price} (${room.currency})`)
        })
      }
      console.log(`${'='.repeat(80)}\n`)
      
    } catch (error) {
      console.error(`\n❌ ERROR in ${test.name}:`, error)
      console.error('Stack:', error.stack)
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('TEST COMPLETED')
  console.log('='.repeat(80))
}

testScraperDirect().catch(console.error)
