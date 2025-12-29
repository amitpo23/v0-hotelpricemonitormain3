/**
 * Year-over-Year Comparison Service
 * Analyzes historical patterns and seasonality
 */

import { createClient } from '@/lib/supabase/client';

interface YoYComparison {
  currentYearPrice?: number;
  lastYearPrice?: number;
  priceChange: number; // Percentage change
  priceChangeAmount: number; // Absolute change
  pattern: 'higher' | 'lower' | 'same' | 'no_data';
  seasonalIndex: number; // Multiplier based on historical patterns
  confidence: number; // 0-1
  reasoning: string;
  historicalPrices: Array<{ year: number; price: number; date: string }>;
}

interface SeasonalPattern {
  month: number;
  weekOfYear: number;
  dayOfWeek: number;
  averagePrice: number;
  priceRange: { min: number; max: number };
  demandLevel: 'low' | 'medium' | 'high';
}

interface HistoricalTrend {
  direction: 'upward' | 'downward' | 'stable';
  rate: number; // Annual growth rate
  volatility: number; // Standard deviation
  seasonalStrength: number; // How seasonal is the pattern
}

export class YearOverYearService {
  private supabase = createClient();

  /**
   * Compare current date with same date last year(s)
   */
  async compareYearOverYear(
    hotelId: string,
    targetDate: string,
    yearsBack: number = 3
  ): Promise<YoYComparison> {
    try {
      const targetDateObj = new Date(targetDate);
      const historicalPrices: Array<{ year: number; price: number; date: string }> = [];

      // Get prices for same date in previous years
      for (let i = 1; i <= yearsBack; i++) {
        const historicalDate = new Date(targetDateObj);
        historicalDate.setFullYear(historicalDate.getFullYear() - i);
        const dateStr = historicalDate.toISOString().split('T')[0];

        const price = await this.getPriceForDate(hotelId, dateStr);
        if (price) {
          historicalPrices.push({
            year: historicalDate.getFullYear(),
            price,
            date: dateStr,
          });
        }
      }

      if (historicalPrices.length === 0) {
        return this.createNoDataResult();
      }

      // Get last year's price (most recent)
      const lastYearPrice = historicalPrices[0]?.price;
      
      // Get current year price if available
      const currentYearPrice = await this.getPriceForDate(hotelId, targetDate);

      // Calculate changes
      let priceChange = 0;
      let priceChangeAmount = 0;
      let pattern: 'higher' | 'lower' | 'same' | 'no_data' = 'no_data';

      if (currentYearPrice && lastYearPrice) {
        priceChangeAmount = currentYearPrice - lastYearPrice;
        priceChange = (priceChangeAmount / lastYearPrice) * 100;
        
        if (Math.abs(priceChange) < 2) {
          pattern = 'same';
        } else if (priceChange > 0) {
          pattern = 'higher';
        } else {
          pattern = 'lower';
        }
      } else if (historicalPrices.length >= 2) {
        // Compare historical years if current not available
        const year1 = historicalPrices[0].price;
        const year2 = historicalPrices[1].price;
        priceChangeAmount = year1 - year2;
        priceChange = (priceChangeAmount / year2) * 100;
        pattern = priceChange > 2 ? 'higher' : priceChange < -2 ? 'lower' : 'same';
      }

      // Calculate seasonal index
      const seasonalIndex = this.calculateSeasonalIndex(historicalPrices);

      // Calculate confidence
      const confidence = this.calculateConfidence(historicalPrices.length, pattern);

      // Generate reasoning
      const reasoning = this.generateYoYReasoning(
        historicalPrices,
        priceChange,
        pattern,
        seasonalIndex
      );

      return {
        currentYearPrice,
        lastYearPrice,
        priceChange,
        priceChangeAmount,
        pattern,
        seasonalIndex,
        confidence,
        reasoning,
        historicalPrices,
      };
    } catch (error) {
      console.error('Error in YoY comparison:', error);
      return this.createNoDataResult();
    }
  }

  /**
   * Get seasonal pattern for a specific month/week
   */
  async getSeasonalPattern(
    hotelId: string,
    month: number,
    yearsBack: number = 3
  ): Promise<SeasonalPattern> {
    try {
      const prices: number[] = [];
      const currentYear = new Date().getFullYear();

      // Collect prices for this month over multiple years
      for (let year = currentYear - yearsBack; year < currentYear; year++) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const monthPrices = await this.getPricesInRange(
          hotelId,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        prices.push(...monthPrices);
      }

      if (prices.length === 0) {
        return this.createDefaultPattern(month);
      }

      const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // Determine demand level based on price distribution
      const demandLevel = this.determineDemandLevel(averagePrice, minPrice, maxPrice);

      return {
        month,
        weekOfYear: Math.floor((month - 1) * 4.33),
        dayOfWeek: 0, // Not specific to day
        averagePrice,
        priceRange: { min: minPrice, max: maxPrice },
        demandLevel,
      };
    } catch (error) {
      console.error('Error getting seasonal pattern:', error);
      return this.createDefaultPattern(month);
    }
  }

  /**
   * Analyze historical trend (growth rate, seasonality strength)
   */
  async analyzeHistoricalTrend(
    hotelId: string,
    yearsBack: number = 3
  ): Promise<HistoricalTrend> {
    try {
      const currentYear = new Date().getFullYear();
      const yearlyAverages: number[] = [];

      // Get average price for each year
      for (let year = currentYear - yearsBack; year < currentYear; year++) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        
        const prices = await this.getPricesInRange(hotelId, startDate, endDate);
        
        if (prices.length > 0) {
          const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
          yearlyAverages.push(avg);
        }
      }

      if (yearlyAverages.length < 2) {
        return this.createDefaultTrend();
      }

      // Calculate growth rate
      const firstYear = yearlyAverages[0];
      const lastYear = yearlyAverages[yearlyAverages.length - 1];
      const years = yearlyAverages.length - 1;
      const rate = ((Math.pow(lastYear / firstYear, 1 / years) - 1) * 100);

      // Determine direction
      const direction = rate > 2 ? 'upward' : rate < -2 ? 'downward' : 'stable';

      // Calculate volatility
      const mean = yearlyAverages.reduce((a, b) => a + b, 0) / yearlyAverages.length;
      const variance = yearlyAverages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / yearlyAverages.length;
      const volatility = Math.sqrt(variance);

      // Estimate seasonal strength (simplified - based on price variance)
      const seasonalStrength = Math.min(volatility / mean, 1);

      return {
        direction,
        rate,
        volatility,
        seasonalStrength,
      };
    } catch (error) {
      console.error('Error analyzing historical trend:', error);
      return this.createDefaultTrend();
    }
  }

  /**
   * Get optimal pricing based on YoY patterns
   */
  async getYoYPricingRecommendation(
    hotelId: string,
    targetDate: string
  ): Promise<{
    recommendedPrice: number;
    minPrice: number;
    maxPrice: number;
    reasoning: string;
  }> {
    const yoy = await this.compareYearOverYear(hotelId, targetDate, 3);
    const trend = await this.analyzeHistoricalTrend(hotelId, 3);

    if (yoy.historicalPrices.length === 0) {
      return {
        recommendedPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        reasoning: 'Insufficient historical data for recommendation',
      };
    }

    // Base price from historical average
    const avgHistoricalPrice =
      yoy.historicalPrices.reduce((sum, p) => sum + p.price, 0) /
      yoy.historicalPrices.length;

    // Apply seasonal index
    let recommendedPrice = avgHistoricalPrice * yoy.seasonalIndex;

    // Apply growth trend
    if (trend.direction === 'upward') {
      recommendedPrice *= 1 + trend.rate / 100;
    } else if (trend.direction === 'downward') {
      recommendedPrice *= 1 + trend.rate / 100;
    }

    // Calculate range (±15%)
    const minPrice = recommendedPrice * 0.85;
    const maxPrice = recommendedPrice * 1.15;

    const reasoning = `Based on ${yoy.historicalPrices.length} years of data. ` +
      `Average historical price: ₪${avgHistoricalPrice.toFixed(0)}. ` +
      `Seasonal index: ${yoy.seasonalIndex.toFixed(2)}. ` +
      `Long-term trend: ${trend.direction} (${trend.rate.toFixed(1)}% annually).`;

    return {
      recommendedPrice: Math.round(recommendedPrice),
      minPrice: Math.round(minPrice),
      maxPrice: Math.round(maxPrice),
      reasoning,
    };
  }

  // Private helper methods

  private async getPriceForDate(hotelId: string, date: string): Promise<number | null> {
    try {
      // Try daily_prices first
      const { data: dailyPrice } = await this.supabase
        .from('daily_prices')
        .select('price')
        .eq('hotel_id', hotelId)
        .eq('date', date)
        .single();

      if (dailyPrice) return dailyPrice.price;

      // Try competitor_daily_prices as fallback
      const { data: competitorPrice } = await this.supabase
        .from('competitor_daily_prices')
        .select('price')
        .eq('date', date)
        .order('price', { ascending: true })
        .limit(1)
        .single();

      return competitorPrice?.price || null;
    } catch (error) {
      return null;
    }
  }

  private async getPricesInRange(
    hotelId: string,
    startDate: string,
    endDate: string
  ): Promise<number[]> {
    try {
      const { data, error } = await this.supabase
        .from('daily_prices')
        .select('price')
        .eq('hotel_id', hotelId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      return data?.map(d => d.price) || [];
    } catch (error) {
      return [];
    }
  }

  private calculateSeasonalIndex(
    historicalPrices: Array<{ year: number; price: number; date: string }>
  ): number {
    if (historicalPrices.length === 0) return 1.0;

    // Calculate average of historical prices
    const avg = historicalPrices.reduce((sum, p) => sum + p.price, 0) / historicalPrices.length;

    // Get overall average (would need more data in production)
    // For now, use a simplified calculation
    return Math.min(Math.max(avg / 500, 0.7), 1.3); // Cap between 0.7 and 1.3
  }

  private calculateConfidence(dataPoints: number, pattern: string): number {
    let confidence = 0;

    // More data points = higher confidence
    confidence += Math.min(dataPoints * 0.25, 0.6);

    // Clear pattern = higher confidence
    if (pattern !== 'no_data') confidence += 0.3;

    // Volatility check would go here
    confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private generateYoYReasoning(
    historicalPrices: Array<{ year: number; price: number; date: string }>,
    priceChange: number,
    pattern: string,
    seasonalIndex: number
  ): string {
    const parts: string[] = [];

    if (historicalPrices.length > 0) {
      const years = historicalPrices.map(p => p.year).join(', ');
      parts.push(`Historical data from ${years}`);
    }

    if (pattern === 'higher') {
      parts.push(`prices typically ${priceChange.toFixed(0)}% higher this time of year`);
    } else if (pattern === 'lower') {
      parts.push(`prices typically ${Math.abs(priceChange).toFixed(0)}% lower`);
    } else if (pattern === 'same') {
      parts.push('prices relatively stable year-over-year');
    }

    if (seasonalIndex > 1.1) {
      parts.push('high-demand seasonal period');
    } else if (seasonalIndex < 0.9) {
      parts.push('low-demand seasonal period');
    }

    return parts.join(', ');
  }

  private determineDemandLevel(
    avgPrice: number,
    minPrice: number,
    maxPrice: number
  ): 'low' | 'medium' | 'high' {
    const range = maxPrice - minPrice;
    const rangePercent = range / avgPrice;

    if (avgPrice > 600 || rangePercent > 0.5) {
      return 'high';
    } else if (avgPrice > 400) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private createNoDataResult(): YoYComparison {
    return {
      priceChange: 0,
      priceChangeAmount: 0,
      pattern: 'no_data',
      seasonalIndex: 1.0,
      confidence: 0,
      reasoning: 'No historical data available for comparison',
      historicalPrices: [],
    };
  }

  private createDefaultPattern(month: number): SeasonalPattern {
    return {
      month,
      weekOfYear: Math.floor((month - 1) * 4.33),
      dayOfWeek: 0,
      averagePrice: 500,
      priceRange: { min: 400, max: 600 },
      demandLevel: 'medium',
    };
  }

  private createDefaultTrend(): HistoricalTrend {
    return {
      direction: 'stable',
      rate: 0,
      volatility: 0,
      seasonalStrength: 0.5,
    };
  }
}

// Singleton instance
export const yoyService = new YearOverYearService();
