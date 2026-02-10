/**
 * Enhanced Feature Engineering for Pricing Predictions
 * Consolidates all features from multiple sources into ML-ready format
 */

import { weatherService } from '@/lib/external/weather-service';
import { bookingVelocityTracker } from '@/lib/analytics/booking-velocity';
import { yoyService } from '@/lib/analytics/year-over-year';
import { createClient } from '@/lib/supabase/client';

export interface PredictionFeatures {
  // Temporal features
  dayOfWeek: number; // 0-6
  weekOfYear: number; // 1-52
  month: number; // 1-12
  quarter: number; // 1-4
  daysUntilCheckIn: number;
  isWeekend: boolean;
  isHoliday: boolean;
  daysUntilNextHoliday: number;
  daysSinceLastHoliday: number;

  // Demand signals
  bookingVelocity7d: number;
  bookingVelocity30d: number;
  bookingVelocityTrend: number; // -1 to 1
  bookingMomentumScore: number; // 0-1
  currentOccupancy: number; // 0-100
  historicalOccupancy: number; // average for this period
  demandScore: number; // 0-1

  // Competition features
  competitorAvgPrice: number;
  competitorMinPrice: number;
  competitorMaxPrice: number;
  competitorPriceStd: number;
  pricePositionVsCompetitors: number; // -1 to 1 (-1 = cheapest, 1 = most expensive)
  competitorsAvailable: number;
  marketShareEstimate: number; // 0-1

  // Weather features
  weatherScore: number; // -1 to 1
  weatherMultiplier: number; // 0.85 to 1.15
  temperature: number;
  isGoodWeather: boolean;

  // Historical patterns
  yoyPriceChange: number; // percentage
  seasonalIndex: number; // multiplier
  historicalAveragePrice: number;
  priceVolatility: number; // standard deviation
  longTermTrend: number; // annual growth rate

  // Event features
  hasNearbyEvent: boolean;
  eventImpactScore: number; // 0-1
  conferenceProximity: number; // days until nearest conference

  // Price optimization features
  daysSinceLastPriceChange: number;
  priceChangeVelocity: number; // rate of recent price changes
  currentPriceMomentum: number; // trending up or down

  // Urgency features
  urgencyScore: number; // 0-1
  isLastMinute: boolean; // < 7 days
  isEarlyBooking: boolean; // > 60 days

  // Quality indicators
  dataQuality: number; // 0-1, how complete is the data
  confidenceLevel: number; // 0-1, overall confidence in features
}

export class FeatureEngineer {
  private supabase = createClient();

  /**
   * Generate all features for a prediction
   */
  async generateFeatures(
    hotelId: string,
    targetDate: string,
    location: string = 'Tel Aviv'
  ): Promise<PredictionFeatures> {
    const targetDateObj = new Date(targetDate);
    const now = new Date();

    // Collect data in parallel for speed
    const [
      weather,
      bookingVelocity,
      yoyComparison,
      competitorData,
      bookingMomentum,
      occupancyData,
      historicalTrend,
    ] = await Promise.all([
      weatherService.getWeatherImpact(location, targetDate),
      bookingVelocityTracker.getVelocityForDate(hotelId, targetDate),
      yoyService.compareYearOverYear(hotelId, targetDate, 3),
      this.getCompetitorFeatures(hotelId, targetDate),
      bookingVelocityTracker.getBookingMomentum(hotelId),
      this.getOccupancyFeatures(hotelId, targetDate),
      yoyService.analyzeHistoricalTrend(hotelId, 3),
    ]);

    // Calculate temporal features
    const temporalFeatures = this.calculateTemporalFeatures(targetDateObj, now);

    // Calculate demand signals
    const demandFeatures = this.calculateDemandFeatures(
      bookingVelocity,
      bookingMomentum,
      occupancyData
    );

    // Calculate urgency features
    const urgencyFeatures = this.calculateUrgencyFeatures(targetDateObj, now);

    // Calculate data quality
    const dataQuality = this.calculateDataQuality({
      hasWeather: weather.score !== 0,
      hasBookingData: bookingVelocity.totalBookings > 0,
      hasYoYData: yoyComparison.historicalPrices.length > 0,
      hasCompetitorData: competitorData.competitorsAvailable > 0,
    });

    // Build complete feature set
    const features: PredictionFeatures = {
      // Temporal
      ...temporalFeatures,

      // Demand signals
      ...demandFeatures,

      // Competition
      ...competitorData,

      // Weather
      weatherScore: weather.score,
      weatherMultiplier: weather.multiplier,
      temperature: weather.temp,
      isGoodWeather: weather.score > 0.05,

      // Historical patterns
      yoyPriceChange: yoyComparison.priceChange,
      seasonalIndex: yoyComparison.seasonalIndex,
      historicalAveragePrice: yoyComparison.lastYearPrice || 0,
      priceVolatility: historicalTrend.volatility,
      longTermTrend: historicalTrend.rate,

      // Event features (placeholder - would integrate with events API)
      hasNearbyEvent: false,
      eventImpactScore: 0,
      conferenceProximity: 999,

      // Price optimization (placeholder - would need price change history)
      daysSinceLastPriceChange: 1,
      priceChangeVelocity: 0,
      currentPriceMomentum: 0,

      // Urgency
      ...urgencyFeatures,

      // Quality
      dataQuality,
      confidenceLevel: this.calculateConfidenceLevel(dataQuality, [
        bookingVelocity.demandScore,
        yoyComparison.confidence,
        competitorData.marketShareEstimate,
      ]),
    };

    return features;
  }

  /**
   * Generate features for multiple dates in batch
   */
  async generateFeaturesBatch(
    hotelId: string,
    dates: string[],
    location: string = 'Tel Aviv'
  ): Promise<Map<string, PredictionFeatures>> {
    const features = new Map<string, PredictionFeatures>();

    await Promise.all(
      dates.map(async (date) => {
        const dateFeatures = await this.generateFeatures(hotelId, date, location);
        features.set(date, dateFeatures);
      })
    );

    return features;
  }

  /**
   * Convert features to array format for ML models
   */
  featuresToArray(features: PredictionFeatures): number[] {
    return [
      features.dayOfWeek / 7,
      features.weekOfYear / 52,
      features.month / 12,
      features.quarter / 4,
      Math.min(features.daysUntilCheckIn / 365, 1),
      features.isWeekend ? 1 : 0,
      features.isHoliday ? 1 : 0,
      Math.min(features.daysUntilNextHoliday / 30, 1),
      features.bookingVelocity7d,
      features.bookingVelocity30d,
      (features.bookingVelocityTrend + 1) / 2, // Normalize to 0-1
      features.bookingMomentumScore,
      features.currentOccupancy / 100,
      features.historicalOccupancy / 100,
      features.demandScore,
      features.competitorAvgPrice / 1000,
      (features.pricePositionVsCompetitors + 1) / 2, // Normalize to 0-1
      features.competitorsAvailable / 20,
      features.marketShareEstimate,
      (features.weatherScore + 1) / 2, // Normalize to 0-1
      features.weatherMultiplier,
      features.temperature / 40,
      features.yoyPriceChange / 100,
      features.seasonalIndex,
      features.eventImpactScore,
      features.urgencyScore,
      features.isLastMinute ? 1 : 0,
      features.isEarlyBooking ? 1 : 0,
      features.dataQuality,
      features.confidenceLevel,
    ];
  }

  /**
   * Get feature importance weights (for interpretability)
   */
  getFeatureImportance(): Map<string, number> {
    return new Map([
      ['bookingVelocity7d', 0.15],
      ['competitorAvgPrice', 0.12],
      ['seasonalIndex', 0.10],
      ['weatherMultiplier', 0.08],
      ['currentOccupancy', 0.08],
      ['demandScore', 0.08],
      ['urgencyScore', 0.07],
      ['yoyPriceChange', 0.06],
      ['bookingMomentumScore', 0.06],
      ['daysUntilCheckIn', 0.05],
      ['isWeekend', 0.04],
      ['isHoliday', 0.04],
      ['pricePositionVsCompetitors', 0.04],
      ['eventImpactScore', 0.03],
    ]);
  }

  // Private helper methods

  private calculateTemporalFeatures(targetDate: Date, now: Date) {
    const dayOfWeek = targetDate.getDay();
    const month = targetDate.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    
    // Calculate week of year
    const startOfYear = new Date(targetDate.getFullYear(), 0, 1);
    const weekOfYear = Math.ceil(
      ((targetDate.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    );

    const daysUntilCheckIn = Math.floor(
      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check if holiday (simplified - would integrate with holiday API)
    const isHoliday = this.isIsraeliHoliday(targetDate);

    return {
      dayOfWeek,
      weekOfYear,
      month,
      quarter,
      daysUntilCheckIn,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6, // Friday/Saturday
      isHoliday,
      daysUntilNextHoliday: this.getDaysUntilNextHoliday(targetDate),
      daysSinceLastHoliday: this.getDaysSinceLastHoliday(targetDate),
    };
  }

  private calculateDemandFeatures(
    bookingVelocity: { velocity7d: number; velocity30d: number; trend: string; demandScore: number; totalBookings: number },
    bookingMomentum: { score: number },
    occupancyData: { current: number; historical: number }
  ) {
    const trendMap = {
      accelerating: 1,
      stable: 0,
      slowing: -1,
      insufficient_data: 0,
    };

    return {
      bookingVelocity7d: bookingVelocity.velocity7d,
      bookingVelocity30d: bookingVelocity.velocity30d,
      bookingVelocityTrend: trendMap[bookingVelocity.trend as keyof typeof trendMap] || 0,
      bookingMomentumScore: bookingMomentum.score,
      currentOccupancy: occupancyData.current,
      historicalOccupancy: occupancyData.historical,
      demandScore: bookingVelocity.demandScore,
    };
  }

  private calculateUrgencyFeatures(targetDate: Date, now: Date) {
    const daysUntil = Math.floor(
      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isLastMinute = daysUntil <= 7;
    const isEarlyBooking = daysUntil >= 60;

    // Urgency score increases as date approaches
    let urgencyScore = 0;
    if (daysUntil <= 3) urgencyScore = 1.0;
    else if (daysUntil <= 7) urgencyScore = 0.8;
    else if (daysUntil <= 14) urgencyScore = 0.6;
    else if (daysUntil <= 30) urgencyScore = 0.4;
    else if (daysUntil <= 60) urgencyScore = 0.2;
    else urgencyScore = 0.1;

    return {
      urgencyScore,
      isLastMinute,
      isEarlyBooking,
    };
  }

  private async getCompetitorFeatures(hotelId: string, targetDate: string) {
    try {
      const { data, error } = await this.supabase
        .from('competitor_daily_prices')
        .select('price, competitor_id')
        .eq('date', targetDate);

      if (error || !data || data.length === 0) {
        return this.createDefaultCompetitorFeatures();
      }

      const prices = data.map((d: { price: number }) => d.price);
      const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const std = this.calculateStandardDeviation(prices);

      // Get our hotel's price to calculate position
      const ourPrice = avg; // Placeholder - would fetch actual hotel price
      const pricePosition = (ourPrice - avg) / std;

      return {
        competitorAvgPrice: avg,
        competitorMinPrice: min,
        competitorMaxPrice: max,
        competitorPriceStd: std,
        pricePositionVsCompetitors: Math.max(-1, Math.min(1, pricePosition)),
        competitorsAvailable: data.length,
        marketShareEstimate: 1 / (data.length + 1), // Simplified
      };
    } catch (error) {
      return this.createDefaultCompetitorFeatures();
    }
  }

  private async getOccupancyFeatures(hotelId: string, targetDate: string) {
    // This would integrate with booking/reservation system
    // For now, return defaults
    return {
      current: 50, // 50% occupancy
      historical: 55, // Historical average
    };
  }

  private calculateDataQuality(checks: Record<string, boolean>): number {
    const values = Object.values(checks);
    const trueCount = values.filter(v => v).length;
    return trueCount / values.length;
  }

  private calculateConfidenceLevel(
    dataQuality: number,
    scores: number[]
  ): number {
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    return (dataQuality * 0.4 + avgScore * 0.6);
  }

  private calculateStandardDeviation(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  private isIsraeliHoliday(date: Date): boolean {
    // Simplified - would integrate with Hebcal API or holiday calendar
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Major Israeli holidays (approximate dates)
    const holidays = [
      { month: 4, day: 14 }, // Passover
      { month: 5, day: 26 }, // Independence Day
      { month: 9, day: 10 }, // Rosh Hashanah (approximate)
      { month: 9, day: 19 }, // Yom Kippur (approximate)
      { month: 9, day: 24 }, // Sukkot (approximate)
    ];

    return holidays.some(h => h.month === month && Math.abs(h.day - day) <= 1);
  }

  private getDaysUntilNextHoliday(date: Date): number {
    // Simplified - would calculate actual days to next holiday
    return 15; // Placeholder
  }

  private getDaysSinceLastHoliday(date: Date): number {
    // Simplified - would calculate actual days from last holiday
    return 10; // Placeholder
  }

  private createDefaultCompetitorFeatures() {
    return {
      competitorAvgPrice: 500,
      competitorMinPrice: 400,
      competitorMaxPrice: 600,
      competitorPriceStd: 50,
      pricePositionVsCompetitors: 0,
      competitorsAvailable: 0,
      marketShareEstimate: 0.5,
    };
  }
}

// Singleton instance
export const featureEngineer = new FeatureEngineer();
