/**
 * Medici Hotels - Utility Functions
 * Helper functions for common Medici API operations
 */

import { getMediciClient } from './client';
import { BoardType, CategoryType } from './types';

/**
 * Format date to Medici API format (YYYY-MM-DD)
 */
export function formatDateForMedici(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toISOString().split('T')[0];
}

/**
 * Parse Medici date string to Date object
 */
export function parseMediciDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Calculate number of nights between check-in and check-out
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Calculate total price based on nightly rate
 */
export function calculateTotalPrice(nightlyRate: number, checkIn: string, checkOut: string): number {
  const nights = calculateNights(checkIn, checkOut);
  return nightlyRate * nights;
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(buyPrice: number, sellPrice: number): number {
  if (sellPrice === 0) return 0;
  return ((sellPrice - buyPrice) / sellPrice) * 100;
}

/**
 * Calculate markup percentage
 */
export function calculateMarkup(buyPrice: number, sellPrice: number): number {
  if (buyPrice === 0) return 0;
  return ((sellPrice - buyPrice) / buyPrice) * 100;
}

/**
 * Get board type name
 */
export function getBoardTypeName(boardId: number): string {
  const boardNames: Record<number, string> = {
    [BoardType.ROOM_ONLY]: 'Room Only',
    [BoardType.BED_AND_BREAKFAST]: 'Bed & Breakfast',
    [BoardType.HALF_BOARD]: 'Half Board',
    [BoardType.FULL_BOARD]: 'Full Board',
    [BoardType.ALL_INCLUSIVE]: 'All Inclusive',
  };
  return boardNames[boardId] || 'Unknown';
}

/**
 * Get category type name
 */
export function getCategoryTypeName(categoryId: number): string {
  const categoryNames: Record<number, string> = {
    [CategoryType.STANDARD]: 'Standard',
    [CategoryType.SUPERIOR]: 'Superior',
    [CategoryType.DELUXE]: 'Deluxe',
    [CategoryType.SUITE]: 'Suite',
    [CategoryType.EXECUTIVE]: 'Executive',
  };
  return categoryNames[categoryId] || 'Unknown';
}

/**
 * Validate opportunity parameters
 */
export function validateOpportunity(params: {
  buyPrice: number;
  pushPrice: number;
  maxRooms: number;
  startDateStr: string;
  endDateStr: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate prices
  if (params.buyPrice < 1 || params.buyPrice > 10000) {
    errors.push('buyPrice must be between 1 and 10000');
  }
  if (params.pushPrice < 1 || params.pushPrice > 10000) {
    errors.push('pushPrice must be between 1 and 10000');
  }
  if (params.pushPrice <= params.buyPrice) {
    errors.push('pushPrice must be greater than buyPrice');
  }

  // Validate rooms
  if (params.maxRooms < 1 || params.maxRooms > 30) {
    errors.push('maxRooms must be between 1 and 30');
  }

  // Validate dates
  const startDate = new Date(params.startDateStr);
  const endDate = new Date(params.endDateStr);
  const now = new Date();

  if (isNaN(startDate.getTime())) {
    errors.push('Invalid startDateStr format');
  }
  if (isNaN(endDate.getTime())) {
    errors.push('Invalid endDateStr format');
  }
  if (startDate >= endDate) {
    errors.push('endDateStr must be after startDateStr');
  }
  if (startDate < now) {
    errors.push('startDateStr cannot be in the past');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format price with currency
 */
export function formatPrice(price: number, currency: string = 'ILS'): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

/**
 * Check if a room is profitable
 */
export function isProfitable(buyPrice: number, sellPrice: number, minMargin: number = 10): boolean {
  const margin = calculateProfitMargin(buyPrice, sellPrice);
  return margin >= minMargin;
}

/**
 * Calculate recommended sell price based on desired margin
 */
export function calculateRecommendedSellPrice(buyPrice: number, desiredMargin: number = 20): number {
  // Formula: sellPrice = buyPrice / (1 - margin/100)
  return buyPrice / (1 - desiredMargin / 100);
}

/**
 * Get date range array between two dates
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current < end) {
    dates.push(formatDateForMedici(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Check if date is within range
 */
export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  const checkDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);

  return checkDate >= start && checkDate <= end;
}

/**
 * Format room description
 */
export function formatRoomDescription(
  categoryId: number,
  boardId: number,
  adults?: number,
  children?: number[]
): string {
  const category = getCategoryTypeName(categoryId);
  const board = getBoardTypeName(boardId);

  let paxInfo = '';
  if (adults || (children && children.length > 0)) {
    const adultStr = adults ? `${adults} Adult${adults > 1 ? 's' : ''}` : '';
    const childStr = children && children.length > 0 ? `${children.length} Child${children.length > 1 ? 'ren' : ''}` : '';
    paxInfo = [adultStr, childStr].filter(Boolean).join(' + ');
  }

  return [category, board, paxInfo].filter(Boolean).join(' - ');
}

/**
 * Batch process Medici opportunities
 */
export async function batchProcessOpportunities(
  opportunities: Array<{
    hotelId: number;
    startDateStr: string;
    endDateStr: string;
    buyPrice: number;
    pushPrice: number;
    maxRooms: number;
    boardId: number;
    categoryId: number;
  }>,
  onProgress?: (processed: number, total: number) => void
): Promise<{
  success: number;
  failed: number;
  results: Array<{ success: boolean; data?: any; error?: any }>;
}> {
  const medici = getMediciClient();
  const results = [];
  let success = 0;
  let failed = 0;

  for (let i = 0; i < opportunities.length; i++) {
    try {
      const result = await medici.insertOpportunity(opportunities[i]);
      results.push({ success: true, data: result });
      success++;
    } catch (error) {
      results.push({ success: false, error });
      failed++;
    }

    if (onProgress) {
      onProgress(i + 1, opportunities.length);
    }

    // Rate limiting: wait 100ms between requests
    if (i < opportunities.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { success, failed, results };
}

/**
 * Validate Medici configuration
 */
export function validateMediciConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for client secret
  if (!process.env.MEDICI_CLIENT_SECRET) {
    errors.push('MEDICI_CLIENT_SECRET environment variable is not set');
  }

  // Check base URL
  const baseUrl = process.env.MEDICI_BASE_URL || 'https://medici-backend.azurewebsites.net';
  if (!baseUrl.startsWith('https://')) {
    warnings.push('MEDICI_BASE_URL should use HTTPS for security');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Test Medici API connection
 */
export async function testMediciConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const medici = getMediciClient();

    // Try to authenticate
    const authResult = await medici.authenticate();

    return {
      success: true,
      message: 'Successfully connected to Medici API',
      details: {
        tokenType: authResult.token_type,
        expiresIn: authResult.expires_in,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to connect to Medici API',
      details: {
        error: error.error || 'Unknown error',
        message: error.message || 'Connection failed',
        statusCode: error.statusCode || 0,
      },
    };
  }
}

/**
 * Convert search results to CSV format
 */
export function convertSearchResultsToCSV(results: any[]): string {
  if (results.length === 0) {
    return 'No data';
  }

  const headers = ['Hotel Name', 'City', 'Stars', 'Check In', 'Check Out', 'Price', 'Currency', 'Room Type', 'Board Type', 'Available'];
  const rows = results.map(r => [
    r.hotelName || r.hotel_name,
    r.city || '',
    r.stars || '',
    r.checkIn || r.check_in,
    r.checkOut || r.check_out,
    r.price,
    r.currency || 'ILS',
    r.roomType || r.room_type || '',
    r.boardType || r.board_type || '',
    r.availability ? 'Yes' : 'No',
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csv;
}

export default {
  formatDateForMedici,
  parseMediciDate,
  calculateNights,
  calculateTotalPrice,
  calculateProfitMargin,
  calculateMarkup,
  getBoardTypeName,
  getCategoryTypeName,
  validateOpportunity,
  formatPrice,
  isProfitable,
  calculateRecommendedSellPrice,
  getDateRange,
  isDateInRange,
  formatRoomDescription,
  batchProcessOpportunities,
  validateMediciConfig,
  testMediciConnection,
  convertSearchResultsToCSV,
};
