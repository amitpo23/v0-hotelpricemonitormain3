/**
 * Environment Variable Validation
 *
 * Validates all required environment variables on startup.
 * Uses Zod for type-safe validation.
 */

import { z } from 'zod'

const envSchema = z.object({
  // Supabase (required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),

  // Optional Supabase aliases
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),

  // Apify (optional but recommended)
  APIFY_API_TOKEN: z.string().optional(),
  APIFY_API_KEY: z.string().optional(),

  // External APIs (optional)
  PERPLEXITY_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  RAPIDAPI_KEY: z.string().optional(),

  // Slack notifications (optional)
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  SLACK_ALERTS_CHANNEL: z.string().optional(),

  // Cron secret for secure cron jobs
  CRON_SECRET: z.string().optional(),

  // App URL
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  VERCEL_URL: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | null = null

/**
 * Validate and return environment variables
 * Caches the result for subsequent calls
 */
export function getEnv(): Env {
  if (_env) return _env

  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const errors = parsed.error.issues.map((e: any) => `  - ${e.path.join('.')}: ${e.message}`).join('\n')
    console.error('Environment validation failed:\n' + errors)

    // In production, throw error. In development, continue with warnings
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration')
    }
  }

  _env = parsed.data as Env
  return _env
}

/**
 * Check if a specific env var is configured
 */
export function hasEnvVar(key: keyof Env): boolean {
  const env = getEnv()
  return !!env[key]
}

/**
 * Get Supabase URL (with fallback)
 */
export function getSupabaseUrl(): string {
  const env = getEnv()
  return env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
}

/**
 * Get Supabase anon key (with fallback)
 */
export function getSupabaseAnonKey(): string {
  const env = getEnv()
  return env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

/**
 * Get app URL for internal API calls
 */
export function getAppUrl(): string {
  const env = getEnv()
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`
  return 'http://localhost:3000'
}

/**
 * Check if Slack notifications are configured
 */
export function isSlackConfigured(): boolean {
  return hasEnvVar('SLACK_WEBHOOK_URL')
}

/**
 * Check if Apify is configured
 */
export function isApifyConfigured(): boolean {
  return hasEnvVar('APIFY_API_TOKEN') || hasEnvVar('APIFY_API_KEY')
}

/**
 * Require a specific environment variable to be set and non-empty.
 * Throws an error if the variable is not set or is an empty string.
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}
