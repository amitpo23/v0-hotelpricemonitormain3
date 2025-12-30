-- External Data Cache Table
-- Stores cached results from external APIs (Tavily, etc.)

CREATE TABLE IF NOT EXISTS external_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'tavily_events', 'tavily_statistics', 'tavily_historical', etc.
  query_key TEXT NOT NULL, -- Unique identifier for the query (hashed or stringified params)
  data JSONB NOT NULL, -- The cached response data
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique cache entries per source+query
  UNIQUE(source, query_key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cache_lookup 
  ON external_data_cache(source, query_key, expires_at);

-- Index for cleanup jobs
CREATE INDEX IF NOT EXISTS idx_cache_expiry 
  ON external_data_cache(expires_at);

-- Index for statistics
CREATE INDEX IF NOT EXISTS idx_cache_source 
  ON external_data_cache(source);

-- Comments
COMMENT ON TABLE external_data_cache IS 'Caches external API responses to reduce costs and improve performance';
COMMENT ON COLUMN external_data_cache.source IS 'API source identifier (e.g., tavily_events, tavily_statistics)';
COMMENT ON COLUMN external_data_cache.query_key IS 'Unique query identifier (location+date or similar)';
COMMENT ON COLUMN external_data_cache.expires_at IS 'When this cache entry expires and should be refreshed';
