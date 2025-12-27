-- Add currency column to competitor_daily_prices table
ALTER TABLE competitor_daily_prices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS';

-- Update existing records to have ILS as default
UPDATE competitor_daily_prices SET currency = 'ILS' WHERE currency IS NULL;
