/**
 * Booking Velocity Tracker
 * Analyzes booking patterns and velocity as a demand indicator
 */

import { createClient } from '@/lib/supabase/client';

interface BookingVelocityData {
  velocity7d: number; // Bookings per day in last 7 days
  velocity30d: number; // Bookings per day in last 30 days
  velocity90d: number; // Bookings per day in last 90 days
  trend: 'accelerating' | 'stable' | 'slowing' | 'insufficient_data';
  acceleration: number; // Rate of change
  demandScore: number; // 0-1 score
  reasoning: string;
  totalBookings: number;
  recentBookings: number;
}

interface BookingPattern {
  dayOfWeek: number;
  averageLeadTime: number; // Days between booking and check-in
  peakBookingHours: number[];
  lastMinuteRatio: number; // % of bookings within 7 days of check-in
}

export class BookingVelocityTracker {
  private supabase = createClient();

  /**
   * Get booking velocity for a specific check-in date
   */
  async getVelocityForDate(
    hotelId: string,
    checkInDate: string
  ): Promise<BookingVelocityData> {
    try {
      const checkIn = new Date(checkInDate);
      const now = new Date();

      // Get bookings for this check-in date
      const { data: bookings, error } = await this.supabase
        .from('bookings')
        .select('booking_date, check_in_date, check_out_date, total_price')
        .eq('hotel_id', hotelId)
        .eq('check_in_date', checkInDate)
        .order('booking_date', { ascending: true });

      if (error) throw error;

      if (!bookings || bookings.length === 0) {
        return this.createInsufficientDataResult();
      }

      // Calculate velocities
      const bookingDates = bookings.map(b => new Date(b.booking_date));
      const velocity7d = this.calculateVelocity(bookingDates, 7);
      const velocity30d = this.calculateVelocity(bookingDates, 30);
      const velocity90d = this.calculateVelocity(bookingDates, 90);

      // Determine trend
      const trend = this.determineTrend(velocity7d, velocity30d, velocity90d);
      
      // Calculate acceleration
      const acceleration = velocity7d > 0 && velocity30d > 0
        ? ((velocity7d - velocity30d) / velocity30d) * 100
        : 0;

      // Calculate demand score (0-1)
      const demandScore = this.calculateDemandScore(
        velocity7d,
        velocity30d,
        trend,
        bookings.length
      );

      // Generate reasoning
      const reasoning = this.generateReasoning(
        velocity7d,
        velocity30d,
        trend,
        acceleration,
        bookings.length
      );

      return {
        velocity7d,
        velocity30d,
        velocity90d,
        trend,
        acceleration,
        demandScore,
        reasoning,
        totalBookings: bookings.length,
        recentBookings: bookingDates.filter(d => 
          (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= 7
        ).length,
      };
    } catch (error) {
      console.error('Error calculating booking velocity:', error);
      return this.createInsufficientDataResult();
    }
  }

  /**
   * Get booking velocity across multiple dates
   */
  async getVelocityBatch(
    hotelId: string,
    dates: string[]
  ): Promise<Map<string, BookingVelocityData>> {
    const results = new Map<string, BookingVelocityData>();

    await Promise.all(
      dates.map(async (date) => {
        const velocity = await this.getVelocityForDate(hotelId, date);
        results.set(date, velocity);
      })
    );

    return results;
  }

  /**
   * Analyze booking patterns for the hotel
   */
  async analyzeBookingPatterns(hotelId: string): Promise<BookingPattern> {
    try {
      const { data: bookings, error } = await this.supabase
        .from('bookings')
        .select('booking_date, check_in, check_out')
        .eq('hotel_id', hotelId)
        .gte('booking_date', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
        .order('booking_date', { ascending: false });

      if (error) throw error;
      if (!bookings || bookings.length === 0) {
        return this.createDefaultPattern();
      }

      // Calculate average lead time
      const leadTimes = bookings.map(b => {
        const bookingDate = new Date(b.booking_date);
        const checkInDate = new Date(b.check_in);
        return Math.floor((checkInDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
      });
      const averageLeadTime = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;

      // Most common booking day of week
      const dayOfWeekCounts = new Array(7).fill(0);
      bookings.forEach(b => {
        const day = new Date(b.booking_date).getDay();
        dayOfWeekCounts[day]++;
      });
      const dayOfWeek = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));

      // Peak booking hours (simplified - assuming uniform distribution)
      const peakBookingHours = [10, 14, 19, 21];

      // Last minute booking ratio
      const lastMinuteBookings = leadTimes.filter(lt => lt <= 7).length;
      const lastMinuteRatio = lastMinuteBookings / leadTimes.length;

      return {
        dayOfWeek,
        averageLeadTime: Math.round(averageLeadTime),
        peakBookingHours,
        lastMinuteRatio,
      };
    } catch (error) {
      console.error('Error analyzing booking patterns:', error);
      return this.createDefaultPattern();
    }
  }

  /**
   * Get current booking momentum (are bookings accelerating?)
   */
  async getBookingMomentum(hotelId: string): Promise<{
    momentum: 'high' | 'moderate' | 'low';
    score: number;
    reasoning: string;
  }> {
    try {
      // Get bookings from last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { data: recentBookings, error } = await this.supabase
        .from('bookings')
        .select('booking_date, check_in')
        .eq('hotel_id', hotelId)
        .gte('booking_date', thirtyDaysAgo.toISOString())
        .order('booking_date', { ascending: true });

      if (error) throw error;
      if (!recentBookings || recentBookings.length < 10) {
        return {
          momentum: 'low',
          score: 0.3,
          reasoning: 'Insufficient recent booking data',
        };
      }

      // Split into two halves and compare
      const midpoint = Math.floor(recentBookings.length / 2);
      const firstHalf = recentBookings.slice(0, midpoint);
      const secondHalf = recentBookings.slice(midpoint);

      const firstHalfRate = firstHalf.length / 15; // per day
      const secondHalfRate = secondHalf.length / 15;

      const change = ((secondHalfRate - firstHalfRate) / firstHalfRate) * 100;

      let momentum: 'high' | 'moderate' | 'low';
      let score: number;
      let reasoning: string;

      if (change > 20) {
        momentum = 'high';
        score = 0.85;
        reasoning = `Bookings accelerating rapidly (${change.toFixed(0)}% increase in last 2 weeks)`;
      } else if (change > 0) {
        momentum = 'moderate';
        score = 0.65;
        reasoning = `Bookings increasing moderately (${change.toFixed(0)}% increase)`;
      } else if (change > -20) {
        momentum = 'moderate';
        score = 0.5;
        reasoning = `Bookings relatively stable (${Math.abs(change).toFixed(0)}% change)`;
      } else {
        momentum = 'low';
        score = 0.3;
        reasoning = `Bookings slowing down (${Math.abs(change).toFixed(0)}% decrease)`;
      }

      return { momentum, score, reasoning };
    } catch (error) {
      console.error('Error calculating booking momentum:', error);
      return {
        momentum: 'low',
        score: 0.4,
        reasoning: 'Unable to calculate momentum',
      };
    }
  }

  // Private helper methods

  private calculateVelocity(bookingDates: Date[], days: number): number {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recentBookings = bookingDates.filter(d => d.getTime() >= cutoff);
    return recentBookings.length / days;
  }

  private determineTrend(
    velocity7d: number,
    velocity30d: number,
    velocity90d: number
  ): 'accelerating' | 'stable' | 'slowing' | 'insufficient_data' {
    if (velocity7d === 0 && velocity30d === 0) {
      return 'insufficient_data';
    }

    const shortTermChange = velocity7d - velocity30d;
    const longTermChange = velocity30d - velocity90d;

    if (shortTermChange > 0.2 && longTermChange > 0.1) {
      return 'accelerating';
    } else if (shortTermChange < -0.2 || longTermChange < -0.2) {
      return 'slowing';
    } else {
      return 'stable';
    }
  }

  private calculateDemandScore(
    velocity7d: number,
    velocity30d: number,
    trend: string,
    totalBookings: number
  ): number {
    let score = 0;

    // Base score from velocity
    score += Math.min(velocity7d * 10, 40); // Max 40 points
    score += Math.min(velocity30d * 5, 30); // Max 30 points

    // Trend bonus
    if (trend === 'accelerating') score += 20;
    else if (trend === 'stable') score += 10;

    // Total bookings bonus
    if (totalBookings > 20) score += 10;
    else if (totalBookings > 10) score += 5;

    // Normalize to 0-1
    return Math.min(score / 100, 1);
  }

  private generateReasoning(
    velocity7d: number,
    velocity30d: number,
    trend: string,
    acceleration: number,
    totalBookings: number
  ): string {
    const parts: string[] = [];

    if (velocity7d > 1) {
      parts.push(`High recent activity (${velocity7d.toFixed(1)} bookings/day)`);
    } else if (velocity7d > 0.3) {
      parts.push(`Moderate booking activity (${velocity7d.toFixed(1)} bookings/day)`);
    } else {
      parts.push(`Low booking activity (${velocity7d.toFixed(1)} bookings/day)`);
    }

    if (trend === 'accelerating') {
      parts.push(`demand is accelerating (+${acceleration.toFixed(0)}%)`);
    } else if (trend === 'slowing') {
      parts.push(`demand is slowing (${acceleration.toFixed(0)}%)`);
    }

    parts.push(`${totalBookings} total bookings for this date`);

    return parts.join(', ');
  }

  private createInsufficientDataResult(): BookingVelocityData {
    return {
      velocity7d: 0,
      velocity30d: 0,
      velocity90d: 0,
      trend: 'insufficient_data',
      acceleration: 0,
      demandScore: 0.5, // Neutral
      reasoning: 'No booking data available for this date',
      totalBookings: 0,
      recentBookings: 0,
    };
  }

  private createDefaultPattern(): BookingPattern {
    return {
      dayOfWeek: 0, // Sunday
      averageLeadTime: 30,
      peakBookingHours: [10, 14, 19, 21],
      lastMinuteRatio: 0.2,
    };
  }
}

// Singleton instance
export const bookingVelocityTracker = new BookingVelocityTracker();
