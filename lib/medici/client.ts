/**
 * Medici Hotels API Client
 * Handles authentication and all API operations
 */

import {
  MediciConfig,
  MediciAuthResponse,
  MediciApiError,
  InsertOpp,
  ApiInnstantSearchPrice,
  RoomsActiveApiParams,
  DashboardApiParams,
  RoomArchiveFilterDto,
  ApiBooking,
  BookParams,
  ManualBookParams,
  GetOpportiunitiesHotelSearchParams,
  OpportiunitiesByBackOfficeParams,
  RoomActive,
  RoomSale,
  RoomCancel,
  DashboardInfo,
  Opportunity,
  SearchPriceResult,
  PreBookResponse,
  BookResponse,
  ArchiveDataResponse,
  MEDICI_BASE_URL,
} from './types';

export class MediciApiClient {
  private config: MediciConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  constructor(config: Partial<MediciConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || MEDICI_BASE_URL,
      clientSecret: config.clientSecret || process.env.MEDICI_CLIENT_SECRET || '',
      timeout: config.timeout || 30000,
    };

    if (!this.config.clientSecret) {
      console.warn('Medici API: No client_secret provided. Authentication will fail.');
    }
  }

  /**
   * Internal method to make HTTP requests
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requiresAuth: boolean = true
  ): Promise<T> {
    // Ensure we have a valid token if auth is required
    if (requiresAuth && !await this.isAuthenticated()) {
      await this.authenticate();
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    // Add authorization header if we have a token
    if (requiresAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: MediciApiError = {
          error: errorData.error || 'API Error',
          message: errorData.message || response.statusText,
          statusCode: response.status,
          details: errorData,
        };
        throw error;
      }

      // Parse JSON response
      const data = await response.json();
      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error.name === 'AbortError') {
        throw {
          error: 'Timeout',
          message: 'Request timed out',
          statusCode: 408,
        } as MediciApiError;
      }

      // Re-throw MediciApiError
      if (error.error && error.statusCode) {
        throw error;
      }

      // Handle network errors
      throw {
        error: 'Network Error',
        message: error.message || 'Failed to connect to Medici API',
        statusCode: 0,
        details: error,
      } as MediciApiError;
    }
  }

  /**
   * Check if we have a valid authentication token
   */
  private async isAuthenticated(): Promise<boolean> {
    if (!this.accessToken || !this.tokenExpiresAt) {
      return false;
    }

    // Check if token expires in the next 5 minutes
    const now = Date.now();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    return this.tokenExpiresAt > (now + expiryBuffer);
  }

  // ==================== 2. Authentication ====================

  /**
   * POST /api/auth/OnlyNightUsersTokenAPI
   * Get authentication token for API access
   */
  async authenticate(): Promise<MediciAuthResponse> {
    const formData = new FormData();
    formData.append('client_secret', this.config.clientSecret);

    const response = await fetch(`${this.config.baseUrl}/api/auth/OnlyNightUsersTokenAPI`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        error: 'Authentication Failed',
        message: errorData.message || 'Failed to authenticate with Medici API',
        statusCode: response.status,
        details: errorData,
      } as MediciApiError;
    }

    const authResponse = await response.json() as MediciAuthResponse;

    // Store token and expiry time
    this.accessToken = authResponse.access_token;
    this.tokenExpiresAt = Date.now() + (authResponse.expires_in * 1000);

    return authResponse;
  }

  // ==================== 4.1 Room Management ====================

  /**
   * POST /api/hotels/GetRoomsActive
   * Get all active (purchased) rooms
   */
  async getRoomsActive(params?: RoomsActiveApiParams): Promise<RoomActive[]> {
    return this.request<RoomActive[]>('/api/hotels/GetRoomsActive', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  /**
   * POST /api/hotels/GetRoomsSales
   * Get sold rooms
   */
  async getRoomsSales(params?: RoomsActiveApiParams): Promise<RoomSale[]> {
    return this.request<RoomSale[]>('/api/hotels/GetRoomsSales', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  /**
   * POST /api/hotels/GetRoomsCancel
   * Get cancelled rooms
   */
  async getRoomsCancel(params?: RoomsActiveApiParams): Promise<RoomCancel[]> {
    return this.request<RoomCancel[]>('/api/hotels/GetRoomsCancel', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  /**
   * DELETE /api/hotels/CancelRoomActive
   * Cancel a room by prebookId
   */
  async cancelRoomActive(prebookId: number): Promise<any> {
    return this.request(`/api/hotels/CancelRoomActive?prebookId=${prebookId}`, {
      method: 'DELETE',
    });
  }

  /**
   * POST /api/hotels/GetRoomArchiveData
   * Get historical room data
   */
  async getRoomArchiveData(params?: RoomArchiveFilterDto): Promise<ArchiveDataResponse> {
    return this.request<ArchiveDataResponse>('/api/hotels/GetRoomArchiveData', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  // ==================== 4.2 Opportunity Management ====================

  /**
   * POST /api/hotels/GetOpportunities
   * List all opportunities
   */
  async getOpportunities(): Promise<Opportunity[]> {
    return this.request<Opportunity[]>('/api/hotels/GetOpportunities', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  /**
   * POST /api/hotels/InsertOpportunity
   * Create new opportunity
   */
  async insertOpportunity(opportunity: InsertOpp): Promise<Opportunity> {
    return this.request<Opportunity>('/api/hotels/InsertOpportunity', {
      method: 'POST',
      body: JSON.stringify(opportunity),
    });
  }

  /**
   * POST /api/hotels/GetOpportiunitiesByBackOfficeId
   * Get opportunity by BackOffice ID
   */
  async getOpportunitiesByBackOfficeId(params: OpportiunitiesByBackOfficeParams): Promise<Opportunity[]> {
    return this.request<Opportunity[]>('/api/hotels/GetOpportiunitiesByBackOfficeId', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * POST /api/hotels/GetOpportiunitiesHotelSearch
   * Search opportunities by opportunity ID
   */
  async getOpportunitiesHotelSearch(params: GetOpportiunitiesHotelSearchParams): Promise<Opportunity[]> {
    return this.request<Opportunity[]>('/api/hotels/GetOpportiunitiesHotelSearch', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // ==================== 4.3 Booking Operations ====================

  /**
   * POST /api/hotels/PreBook
   * Create pre-booking
   */
  async preBook(params: any): Promise<PreBookResponse> {
    return this.request<PreBookResponse>('/api/hotels/PreBook', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * POST /api/hotels/Book
   * Confirm booking
   */
  async book(params: BookParams): Promise<BookResponse> {
    return this.request<BookResponse>('/api/hotels/Book', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * POST /api/hotels/ManualBook
   * Manual booking by code
   */
  async manualBook(params: ManualBookParams): Promise<BookResponse> {
    return this.request<BookResponse>('/api/hotels/ManualBook', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * DELETE /api/hotels/CancelRoomDirectJson
   * Cancel room with JSON
   */
  async cancelRoomDirectJson(params: any): Promise<any> {
    return this.request('/api/hotels/CancelRoomDirectJson', {
      method: 'DELETE',
      body: JSON.stringify(params),
    });
  }

  // ==================== 4.4 Price & Search ====================

  /**
   * POST /api/hotels/GetInnstantSearchPrice
   * Search Innstant API for hotel prices
   */
  async getInnstantSearchPrice(params: ApiInnstantSearchPrice): Promise<SearchPriceResult[]> {
    return this.request<SearchPriceResult[]>('/api/hotels/GetInnstantSearchPrice', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * POST /api/hotels/UpdateRoomsActivePushPrice
   * Update push price for active room
   */
  async updateRoomsActivePushPrice(params: ApiBooking): Promise<any> {
    return this.request('/api/hotels/UpdateRoomsActivePushPrice', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * POST /api/hotels/GetDashboardInfo
   * Get dashboard statistics
   */
  async getDashboardInfo(params?: DashboardApiParams): Promise<DashboardInfo> {
    return this.request<DashboardInfo>('/api/hotels/GetDashboardInfo', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  // ==================== Helper Methods ====================

  /**
   * Search for hotels by city and dates
   */
  async searchHotels(
    city: string,
    checkIn: string,
    checkOut: string,
    options?: {
      stars?: number;
      adults?: number;
      children?: number[];
      limit?: number;
      showExtendedData?: boolean;
    }
  ): Promise<SearchPriceResult[]> {
    const params: ApiInnstantSearchPrice = {
      dateFrom: checkIn,
      dateTo: checkOut,
      city,
      stars: options?.stars,
      limit: options?.limit,
      showExtendedData: options?.showExtendedData,
      pax: options?.adults || options?.children ? [{
        adults: options?.adults,
        children: options?.children,
      }] : undefined,
    };

    return this.getInnstantSearchPrice(params);
  }

  /**
   * Get active rooms for a specific city
   */
  async getActiveRoomsByCity(city: string): Promise<RoomActive[]> {
    return this.getRoomsActive({ city });
  }

  /**
   * Get active rooms for a specific hotel
   */
  async getActiveRoomsByHotel(hotelName: string): Promise<RoomActive[]> {
    return this.getRoomsActive({ hotelName });
  }

  /**
   * Create a simple opportunity
   */
  async createOpportunity(
    hotelId: number,
    checkIn: string,
    checkOut: string,
    buyPrice: number,
    pushPrice: number,
    maxRooms: number,
    options?: {
      boardId?: number;
      categoryId?: number;
      adults?: number;
      children?: number[];
    }
  ): Promise<Opportunity> {
    const opportunity: InsertOpp = {
      hotelId,
      startDateStr: checkIn,
      endDateStr: checkOut,
      buyPrice,
      pushPrice,
      maxRooms,
      boardId: options?.boardId || 2, // Default: B&B
      categoryId: options?.categoryId || 1, // Default: Standard
      paxAdults: options?.adults,
      paxChildren: options?.children,
    };

    return this.insertOpportunity(opportunity);
  }
}

/**
 * Create a singleton instance
 */
let mediciClient: MediciApiClient | null = null;

export function getMediciClient(config?: Partial<MediciConfig>): MediciApiClient {
  if (!mediciClient || config) {
    mediciClient = new MediciApiClient(config);
  }
  return mediciClient;
}

export default MediciApiClient;
