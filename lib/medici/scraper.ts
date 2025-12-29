/**
 * Medici Hotels - Scraper Integration
 * Integrates Medici API as a competitor data source for price monitoring
 */

import { getMediciClient } from './client';
import { SearchPriceResult, RoomActive } from './types';

export interface MediciScraperResult {
  source: 'medici';
  hotel_name: string;
  city?: string;
  stars?: number;
  check_in: string;
  check_out: string;
  price: number;
  currency: string;
  room_type?: string;
  board_type?: string;
  availability: boolean;
  provider?: string;
  scraped_at: string;
  metadata?: {
    hotel_id?: number;
    room_category?: string;
    amenities?: string[];
    rating?: number;
    reviews?: number;
    location?: {
      latitude?: number;
      longitude?: number;
      address?: string;
    };
  };
}

export interface MediciActiveRoomResult {
  source: 'medici';
  hotel_name: string;
  city?: string;
  stars?: number;
  check_in: string;
  check_out: string;
  buy_price: number;
  push_price: number;
  profit_margin: number;
  room_board?: string;
  room_category?: string;
  provider?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Search Medici hotels and format as competitor data
 */
export async function scrapeMediciPrices(
  city: string,
  checkIn: string,
  checkOut: string,
  options?: {
    stars?: number;
    adults?: number;
    children?: number[];
    limit?: number;
    hotelName?: string;
  }
): Promise<MediciScraperResult[]> {
  try {
    const medici = getMediciClient();

    // Search for hotels
    const results = await medici.searchHotels(city, checkIn, checkOut, {
      stars: options?.stars,
      adults: options?.adults,
      children: options?.children,
      limit: options?.limit,
      showExtendedData: true,
    });

    // Filter by hotel name if specified
    let filteredResults = results;
    if (options?.hotelName) {
      const searchTerm = options.hotelName.toLowerCase();
      filteredResults = results.filter(r =>
        r.hotelName.toLowerCase().includes(searchTerm)
      );
    }

    // Transform to scraper format
    const scrapedData: MediciScraperResult[] = filteredResults.map(result => ({
      source: 'medici' as const,
      hotel_name: result.hotelName,
      city: result.city,
      stars: result.stars,
      check_in: result.checkIn,
      check_out: result.checkOut,
      price: result.price,
      currency: result.currency || 'ILS',
      room_type: result.roomType,
      board_type: result.boardType,
      availability: result.availability,
      provider: result.provider,
      scraped_at: new Date().toISOString(),
      metadata: result.extendedData ? {
        hotel_id: result.hotelId,
        amenities: result.extendedData.amenities,
        rating: result.extendedData.rating,
        reviews: result.extendedData.reviews,
        location: result.extendedData.location,
      } : undefined,
    }));

    return scrapedData;
  } catch (error) {
    console.error('Medici scraper error:', error);
    throw error;
  }
}

/**
 * Get Medici active rooms and format as competitor data
 */
export async function getMediciActiveRooms(
  filters?: {
    city?: string;
    hotelName?: string;
    hotelStars?: number;
    provider?: string;
  }
): Promise<MediciActiveRoomResult[]> {
  try {
    const medici = getMediciClient();

    // Get active rooms
    const rooms = await medici.getRoomsActive(filters);

    // Transform to standardized format
    const formattedRooms: MediciActiveRoomResult[] = rooms.map(room => {
      const profitMargin = room.pushPrice > 0
        ? ((room.pushPrice - room.buyPrice) / room.pushPrice) * 100
        : 0;

      return {
        source: 'medici' as const,
        hotel_name: room.hotelName,
        city: room.city,
        stars: room.hotelStars,
        check_in: room.startDate,
        check_out: room.endDate,
        buy_price: room.buyPrice,
        push_price: room.pushPrice,
        profit_margin: profitMargin,
        room_board: room.roomBoard,
        room_category: room.roomCategory,
        provider: room.provider,
        status: room.status,
        created_at: room.createdAt,
        updated_at: room.updatedAt,
      };
    });

    return formattedRooms;
  } catch (error) {
    console.error('Medici active rooms error:', error);
    throw error;
  }
}

/**
 * Integrate Medici data into competitor_daily_prices table
 * This function converts Medici search results to the format expected by the price tracking system
 */
export async function integrateMediciPrices(
  hotelId: number,
  competitorId: number,
  city: string,
  checkIn: string,
  checkOut: string,
  options?: {
    stars?: number;
    adults?: number;
    hotelName?: string;
  }
): Promise<any[]> {
  try {
    // Scrape Medici prices
    const scrapedData = await scrapeMediciPrices(city, checkIn, checkOut, {
      stars: options?.stars,
      adults: options?.adults,
      hotelName: options?.hotelName,
    });

    // Transform to competitor_daily_prices format
    const priceRecords = scrapedData
      .filter(data => data.availability && data.price > 0)
      .map(data => ({
        hotel_id: hotelId,
        competitor_id: competitorId,
        date: data.check_in,
        price: data.price,
        source: 'medici',
        room_type: data.room_type,
        board_type: data.board_type,
        currency: data.currency,
        metadata: {
          hotel_name: data.hotel_name,
          city: data.city,
          stars: data.stars,
          check_out: data.check_out,
          provider: data.provider,
          scraped_at: data.scraped_at,
          ...data.metadata,
        },
      }));

    return priceRecords;
  } catch (error) {
    console.error('Medici integration error:', error);
    throw error;
  }
}

/**
 * Get Medici opportunities as potential competitor insights
 */
export async function getMediciOpportunities(): Promise<any[]> {
  try {
    const medici = getMediciClient();
    const opportunities = await medici.getOpportunities();

    // Transform to competitor insights format
    const insights = opportunities.map(opp => ({
      source: 'medici',
      hotel_name: opp.hotelName,
      city: opp.city,
      stars: opp.stars,
      check_in: opp.startDate,
      check_out: opp.endDate,
      buy_price: opp.buyPrice,
      sell_price: opp.pushPrice,
      profit_margin: ((opp.pushPrice - opp.buyPrice) / opp.pushPrice) * 100,
      available_rooms: opp.availableRooms,
      max_rooms: opp.maxRooms,
      status: opp.status,
      created_at: opp.createdAt,
      metadata: {
        opportunity_id: opp.id,
        hotel_id: opp.hotelId,
        board_id: opp.boardId,
        category_id: opp.categoryId,
        provider_id: opp.providerId,
        pax_adults: opp.paxAdults,
        pax_children: opp.paxChildren,
      },
    }));

    return insights;
  } catch (error) {
    console.error('Medici opportunities error:', error);
    throw error;
  }
}

/**
 * Calculate average Medici prices for market analysis
 */
export async function getMediciMarketAverage(
  city: string,
  checkIn: string,
  checkOut: string,
  stars?: number
): Promise<{
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  count: number;
  source: string;
}> {
  try {
    const scrapedData = await scrapeMediciPrices(city, checkIn, checkOut, {
      stars,
      limit: 100,
    });

    const availablePrices = scrapedData
      .filter(data => data.availability && data.price > 0)
      .map(data => data.price);

    if (availablePrices.length === 0) {
      return {
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        count: 0,
        source: 'medici',
      };
    }

    const averagePrice = availablePrices.reduce((sum, price) => sum + price, 0) / availablePrices.length;
    const minPrice = Math.min(...availablePrices);
    const maxPrice = Math.max(...availablePrices);

    return {
      averagePrice,
      minPrice,
      maxPrice,
      count: availablePrices.length,
      source: 'medici',
    };
  } catch (error) {
    console.error('Medici market average error:', error);
    throw error;
  }
}

/**
 * Compare your hotel's price with Medici market prices
 */
export async function comparePriceWithMedici(
  yourPrice: number,
  city: string,
  checkIn: string,
  checkOut: string,
  stars?: number
): Promise<{
  yourPrice: number;
  marketAverage: number;
  difference: number;
  differencePercent: number;
  position: 'below' | 'at' | 'above';
  competitiveScore: number; // 0-100, higher is more competitive
  recommendation: string;
}> {
  try {
    const market = await getMediciMarketAverage(city, checkIn, checkOut, stars);

    if (market.count === 0) {
      return {
        yourPrice,
        marketAverage: 0,
        difference: 0,
        differencePercent: 0,
        position: 'at',
        competitiveScore: 50,
        recommendation: 'No Medici market data available for comparison',
      };
    }

    const difference = yourPrice - market.averagePrice;
    const differencePercent = (difference / market.averagePrice) * 100;

    let position: 'below' | 'at' | 'above';
    let competitiveScore: number;
    let recommendation: string;

    if (differencePercent < -5) {
      position = 'below';
      competitiveScore = 90;
      recommendation = `Your price is ${Math.abs(differencePercent).toFixed(1)}% below Medici market average. Highly competitive!`;
    } else if (differencePercent > 5) {
      position = 'above';
      competitiveScore = 30;
      recommendation = `Your price is ${differencePercent.toFixed(1)}% above Medici market average. Consider lowering to increase bookings.`;
    } else {
      position = 'at';
      competitiveScore = 70;
      recommendation = 'Your price is aligned with Medici market average. Good positioning.';
    }

    return {
      yourPrice,
      marketAverage: market.averagePrice,
      difference,
      differencePercent,
      position,
      competitiveScore,
      recommendation,
    };
  } catch (error) {
    console.error('Medici price comparison error:', error);
    throw error;
  }
}
