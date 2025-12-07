/**
 * Medici Hotels API Type Definitions
 * Based on Swagger API Documentation v1
 * Base URL: https://medici-backend.azurewebsites.net
 */

// ==================== Authentication ====================

export interface MediciAuthRequest {
  client_secret: string;
}

export interface MediciAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ==================== Data Schemas ====================

/**
 * 3.1 InsertOpp (Create Opportunity)
 */
export interface InsertOpp {
  hotelId?: number;
  startDateStr: string; // Min: 1, Max: 50 chars
  endDateStr: string; // Min: 1, Max: 50 chars
  boardId: number; // Min: 1
  categoryId: number; // Min: 1
  buyPrice: number; // Min: 1, Max: 10000
  pushPrice: number; // Min: 1, Max: 10000
  maxRooms: number; // Min: 1, Max: 30
  ratePlanCode?: string;
  invTypeCode?: string;
  reservationFullName?: string; // Max: 500 chars
  stars?: number;
  destinationId?: number;
  locationRange?: number;
  providerId?: number;
  userId?: number;
  paxAdults?: number;
  paxChildren?: number[];
}

/**
 * 3.2 ApiInnstantSearchPrice (Search Request)
 */
export interface ApiInnstantSearchPrice {
  dateFrom: string; // Check-in date
  dateTo: string; // Check-out date
  hotelName?: string;
  city?: string;
  pax?: Pax[];
  stars?: number;
  limit?: number;
  showExtendedData?: boolean;
}

/**
 * 3.3 Pax (Passenger Info)
 */
export interface Pax {
  adults?: number;
  children?: number[]; // Array of children ages
}

/**
 * 3.4 RoomsActiveApiParams (Room Filters)
 */
export interface RoomsActiveApiParams {
  startDate?: string; // datetime
  endDate?: string; // datetime
  hotelName?: string;
  hotelStars?: number;
  city?: string;
  roomBoard?: string;
  roomCategory?: string;
  provider?: string;
}

/**
 * 3.5 DashboardApiParams
 */
export interface DashboardApiParams {
  hotelStars?: number;
  city?: string;
  hotelName?: string;
  reservationMonthDate?: string; // datetime
  checkInMonthDate?: string; // datetime
  provider?: string;
}

/**
 * 3.6 RoomArchiveFilterDto (Archive Filters)
 */
export interface RoomArchiveFilterDto {
  stayFrom?: string; // datetime
  stayTo?: string; // datetime
  hotelName?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  roomBoard?: string;
  roomCategory?: string;
  minUpdatedAt?: string; // datetime
  maxUpdatedAt?: string; // datetime
  pageNumber?: number;
  pageSize?: number;
}

/**
 * 3.7 ApiBooking (Price Update)
 */
export interface ApiBooking {
  preBookId?: number;
  pushPrice?: number;
}

/**
 * 3.8 BookParams (Booking Request)
 */
export interface BookParams {
  jsonRequest?: string;
}

/**
 * 3.9 ManualBookParams
 */
export interface ManualBookParams {
  opportiunityId?: number;
  code?: string;
}

/**
 * 3.10 Other Schemas
 */
export interface GetOpportiunitiesHotelSearchParams {
  opportiunityId?: number;
}

export interface OpportiunitiesByBackOfficeParams {
  id?: number;
}

// ==================== Response Types ====================

/**
 * Room Active Response
 */
export interface RoomActive {
  id: number;
  hotelId: number;
  hotelName: string;
  hotelStars?: number;
  city?: string;
  startDate: string;
  endDate: string;
  roomBoard?: string;
  roomCategory?: string;
  buyPrice: number;
  pushPrice: number;
  provider?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Room Sale Response
 */
export interface RoomSale {
  id: number;
  roomActiveId: number;
  hotelName: string;
  city?: string;
  checkIn: string;
  checkOut: string;
  salePrice: number;
  profit: number;
  soldAt: string;
  customerName?: string;
}

/**
 * Room Cancel Response
 */
export interface RoomCancel {
  id: number;
  roomActiveId: number;
  hotelName: string;
  cancelledAt: string;
  refundAmount?: number;
  reason?: string;
}

/**
 * Dashboard Info Response
 */
export interface DashboardInfo {
  totalActiveRooms: number;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averagePrice: number;
  topCities?: Array<{
    city: string;
    count: number;
    revenue: number;
  }>;
  topHotels?: Array<{
    hotelName: string;
    count: number;
    revenue: number;
  }>;
  recentActivity?: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

/**
 * Opportunity Response
 */
export interface Opportunity {
  id: number;
  hotelId?: number;
  hotelName?: string;
  city?: string;
  stars?: number;
  startDate: string;
  endDate: string;
  boardId: number;
  categoryId: number;
  buyPrice: number;
  pushPrice: number;
  maxRooms: number;
  availableRooms?: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  providerId?: number;
  paxAdults?: number;
  paxChildren?: number[];
}

/**
 * Search Price Result
 */
export interface SearchPriceResult {
  hotelId?: number;
  hotelName: string;
  city?: string;
  stars?: number;
  checkIn: string;
  checkOut: string;
  price: number;
  currency?: string;
  roomType?: string;
  boardType?: string;
  availability: boolean;
  provider?: string;
  extendedData?: {
    amenities?: string[];
    images?: string[];
    rating?: number;
    reviews?: number;
    location?: {
      latitude?: number;
      longitude?: number;
      address?: string;
    };
  };
}

/**
 * PreBook Response
 */
export interface PreBookResponse {
  preBookId: number;
  status: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  expiresAt?: string;
  bookingDetails?: any;
}

/**
 * Book Response
 */
export interface BookResponse {
  bookingId: number;
  confirmationCode: string;
  status: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  guestDetails?: any;
}

/**
 * Archive Data Response
 */
export interface ArchiveDataResponse {
  data: RoomArchive[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface RoomArchive {
  id: number;
  hotelName: string;
  city?: string;
  stayFrom: string;
  stayTo: string;
  price: number;
  roomBoard?: string;
  roomCategory?: string;
  status: string;
  updatedAt: string;
}

// ==================== API Error Response ====================

export interface MediciApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}

// ==================== API Configuration ====================

export interface MediciConfig {
  baseUrl: string;
  clientSecret: string;
  timeout?: number;
}

export const MEDICI_BASE_URL = 'https://medici-backend.azurewebsites.net';
export const MEDICI_SWAGGER_URL = `${MEDICI_BASE_URL}/swagger/index.html`;

// ==================== Board and Category IDs ====================

/**
 * Board Types (Meal Plans)
 */
export enum BoardType {
  ROOM_ONLY = 1,
  BED_AND_BREAKFAST = 2,
  HALF_BOARD = 3,
  FULL_BOARD = 4,
  ALL_INCLUSIVE = 5,
}

/**
 * Category Types (Room Categories)
 */
export enum CategoryType {
  STANDARD = 1,
  SUPERIOR = 2,
  DELUXE = 3,
  SUITE = 4,
  EXECUTIVE = 5,
}
