// Quick script to fix competitor URLs and run a test scan
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  // Get hotel and competitors
  const { data: hotel } = await supabase
    .from('hotels')
    .select('*')
    .eq('name', 'scarlet')
    .single()
  
  if (!hotel) {
    return Response.json({ error: 'Hotel not found' })
  }
  
  const { data: competitors } = await supabase
    .from('hotel_competitors')
    .select('*')
    .eq('hotel_id', hotel.id)
  
  return Response.json({
    hotel: {
      id: hotel.id,
      name: hotel.name,
      city: hotel.location
    },
    competitors: competitors?.map(c => ({
      id: c.id,
      name: c.competitor_hotel_name,
      url: c.booking_url,
      city: c.city,
      active: c.is_active
    }))
  })
}
