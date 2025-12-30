/**
 * External Data Cache Layer
 * Prevents redundant API calls to Tavily and improves performance
 * Stores in Supabase with TTL (Time To Live)
 */

import { createClient } from '@/lib/supabase/server'

interface CacheEntry {
  id: string
  source: string
  query_key: string
  data: any
  fetched_at: string
  expires_at: string
}

interface CacheOptions {
  ttl?: number // Time to live in seconds (default: 1 hour)
  force?: boolean // Force refresh even if cached
}

/**
 * Get cached data or fetch new if expired/missing
 */
export async function getCachedData<T>(
  source: string,
  queryKey: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 3600, force = false } = options // Default: 1 hour

  try {
    const supabase = await createClient()
    const now = new Date()

    // Check cache first (unless force refresh)
    if (!force) {
      const { data: cached, error } = await supabase
        .from('external_data_cache')
        .select('*')
        .eq('source', source)
        .eq('query_key', queryKey)
        .gte('expires_at', now.toISOString())
        .single()

      // If table doesn't exist, skip cache and fetch directly
      if (error && error.code === '42P01') {
        console.warn('[Cache] Table does not exist - fetching without cache')
        return await fetchFn()
      }

      if (cached && !error) {
        console.log(`[Cache] HIT: ${source}/${queryKey}`)
        return cached.data as T
      }
    }

    console.log(`[Cache] MISS: ${source}/${queryKey} - fetching...`)

    // Fetch fresh data
    const data = await fetchFn()

    // Try to store in cache (but don't fail if table doesn't exist)
    try {
      const expiresAt = new Date(now.getTime() + ttl * 1000)
      
      await supabase
        .from('external_data_cache')
        .upsert({
          source,
          query_key: queryKey,
          data,
          fetched_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
    } catch (cacheError) {
      console.warn('[Cache] Failed to store - continuing without cache:', cacheError)
    }

    return data
  } catch (error) {
    // If cache completely fails, just fetch the data
    console.warn('[Cache] Cache system failed - fetching directly:', error)
    return await fetchFn()
  }
}

/**
 * Clear cache for specific source/key or all
 */
export async function clearCache(source?: string, queryKey?: string): Promise<void> {
  const supabase = await createClient()

  // Build query step by step
  if (source && queryKey) {
    await supabase
      .from('external_data_cache')
      .delete()
      .eq('source', source)
      .eq('query_key', queryKey)
  } else if (source) {
    await supabase
      .from('external_data_cache')
      .delete()
      .eq('source', source)
  } else {
    // Clear all - get all IDs first then delete
    const { data: allEntries } = await supabase
      .from('external_data_cache')
      .select('id')
    
    if (allEntries && allEntries.length > 0) {
      const ids = allEntries.map((e: any) => e.id)
      await supabase
        .from('external_data_cache')
        .delete()
        .in('id', ids)
    }
  }

  console.log(`[Cache] Cleared: ${source || 'all'}/${queryKey || 'all'}`)
}

/**
 * Clean expired cache entries (run as cron job)
 */
export async function cleanExpiredCache(): Promise<number> {
  const supabase = await createClient()
  const now = new Date()

  const { data: expired } = await supabase
    .from('external_data_cache')
    .select('id')
    .lt('expires_at', now.toISOString())

  if (!expired || expired.length === 0) {
    console.log('[Cache] No expired entries to clean')
    return 0
  }

  // Delete expired entries
  const ids = expired.map((e: any) => e.id)
  await supabase
    .from('external_data_cache')
    .delete()
    .in('id', ids)

  const count = expired.length
  console.log(`[Cache] Cleaned ${count} expired entries`)
  
  return count
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  total: number
  bySource: Record<string, number>
  oldestEntry: string | null
  newestEntry: string | null
}> {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from('external_data_cache')
    .select('source, fetched_at')
    .order('fetched_at', { ascending: true })

  if (!entries || entries.length === 0) {
    return { total: 0, bySource: {}, oldestEntry: null, newestEntry: null }
  }

  const bySource: Record<string, number> = {}
  entries.forEach((entry: any) => {
    bySource[entry.source] = (bySource[entry.source] || 0) + 1
  })

  return {
    total: entries.length,
    bySource,
    oldestEntry: entries[0].fetched_at,
    newestEntry: entries[entries.length - 1].fetched_at,
  }
}
