import { NextResponse } from "next/server"

/**
 * DEBUG ENDPOINT - Remove in production!
 * Checks which environment variables are available
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  const envVars = {
    hasApifyKey: !!process.env.APIFY_API_KEY,
    apifyKeyLength: process.env.APIFY_API_KEY?.length || 0,
    apifyKeyPreview: process.env.APIFY_API_KEY?.substring(0, 10) + "...",
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
    hasPerplexityKey: !!process.env.PERPLEXITY_API_KEY,
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
    railway: process.env.RAILWAY_ENVIRONMENT,
  }

  return NextResponse.json(envVars)
}
