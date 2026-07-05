/**
 * Input Validation Schemas
 *
 * Zod schemas for validating API request bodies.
 * Ensures type safety and input sanitization.
 */

import { z } from 'zod'

// ============================================
// Common Schemas
// ============================================

export const uuidSchema = z.string().uuid('Invalid UUID format')

export const dateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Date must be in YYYY-MM-DD format'
)

export const emailSchema = z.string().email('Invalid email format').toLowerCase().trim()

export const priceSchema = z.number()
  .min(0, 'Price must be non-negative')
  .max(100000, 'Price exceeds maximum allowed')

export const occupancySchema = z.number()
  .min(1, 'Occupancy must be at least 1')
  .max(10, 'Occupancy exceeds maximum')

// ============================================
// Auth Schemas
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
})

// ============================================
// Hotel Schemas
// ============================================

export const createHotelSchema = z.object({
  name: z.string().min(2, 'Hotel name is required').max(200),
  location: z.string().min(2, 'Location is required').max(200),
  base_price: priceSchema.optional(),
  star_rating: z.number().min(1).max(5).optional(),
  room_count: z.number().min(1).max(10000).optional(),
})

export const updateHotelSchema = createHotelSchema.partial()

// ============================================
// Prediction Schemas
// ============================================

export const predictionRequestSchema = z.object({
  hotel_id: uuidSchema,
  start_date: dateSchema,
  end_date: dateSchema.optional(),
  days: z.number().min(1).max(365).optional(),
  occupancy: occupancySchema.optional(),
  room_type: z.string().max(100).optional(),
})

export const predictionGenerateSchema = z.object({
  hotel_id: uuidSchema,
  dates: z.array(dateSchema).min(1).max(90),
  options: z.object({
    use_ensemble: z.boolean().optional(),
    include_competitors: z.boolean().optional(),
    confidence_threshold: z.number().min(0).max(1).optional(),
  }).optional(),
})

// ============================================
// Scan Schemas
// ============================================

export const scanExecuteSchema = z.object({
  hotel_id: uuidSchema,
  start_date: dateSchema,
  days_to_scan: z.number().min(1).max(90).default(30),
  competitors: z.array(uuidSchema).optional(),
})

export const scanConfigSchema = z.object({
  hotel_id: uuidSchema,
  enabled: z.boolean().default(true),
  frequency: z.enum(['daily', 'weekly', 'manual']).default('daily'),
  days_ahead: z.number().min(1).max(365).default(90),
  include_competitors: z.boolean().default(true),
})

// ============================================
// Booking Schemas
// ============================================

export const bookingImportSchema = z.object({
  hotel_id: uuidSchema,
  bookings: z.array(z.object({
    check_in: dateSchema,
    check_out: dateSchema,
    room_type: z.string().max(100).optional(),
    price: priceSchema,
    source: z.string().max(100).optional(),
    guest_count: z.number().min(1).max(20).optional(),
  })).min(1).max(1000),
})

// ============================================
// Competitor Schemas
// ============================================

export const competitorSchema = z.object({
  name: z.string().min(2).max(200),
  hotel_id: uuidSchema,
  booking_url: z.string().url().optional(),
  star_rating: z.number().min(1).max(5).optional(),
  enabled: z.boolean().default(true),
})

// ============================================
// Feedback Schemas
// ============================================

export const feedbackSchema = z.object({
  prediction_id: uuidSchema,
  actual_price: priceSchema,
  actual_occupancy: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000).optional(),
})

// ============================================
// Budget Schemas
// ============================================

export const budgetSchema = z.object({
  hotel_id: uuidSchema,
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2030),
  revenue_target: z.number().min(0),
  occupancy_target: z.number().min(0).max(100),
  adr_target: priceSchema.optional(),
})

// ============================================
// Validation Helper
// ============================================

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true
  data: T
} | {
  success: false
  errors: Array<{ path: string; message: string }>
} {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    errors: result.error.issues.map((e: any) => ({
      path: e.path.join('.'),
      message: e.message,
    })),
  }
}

/**
 * Create validation error response
 */
export function validationErrorResponse(errors: Array<{ path: string; message: string }>) {
  return {
    error: 'Validation failed',
    details: errors,
  }
}
