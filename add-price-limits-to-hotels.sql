-- Add min_price and max_price columns to hotels table if they don't exist

-- Add min_price column (floor price)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hotels' AND column_name = 'min_price'
    ) THEN
        ALTER TABLE hotels ADD COLUMN min_price NUMERIC(10,2) DEFAULT 300;
        COMMENT ON COLUMN hotels.min_price IS 'Minimum allowed price (floor price) - price will never go below this';
    END IF;
END $$;

-- Add max_price column (ceiling price)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hotels' AND column_name = 'max_price'
    ) THEN
        ALTER TABLE hotels ADD COLUMN max_price NUMERIC(10,2) DEFAULT 2000;
        COMMENT ON COLUMN hotels.max_price IS 'Maximum allowed price (ceiling price) - price will never go above this';
    END IF;
END $$;

-- Update existing hotels to have default values if NULL
UPDATE hotels 
SET 
    min_price = COALESCE(min_price, 300),
    max_price = COALESCE(max_price, 2000)
WHERE min_price IS NULL OR max_price IS NULL;

-- Add check constraint to ensure logical pricing
ALTER TABLE hotels DROP CONSTRAINT IF EXISTS hotels_price_logic_check;
ALTER TABLE hotels ADD CONSTRAINT hotels_price_logic_check 
    CHECK (min_price >= 0 AND max_price >= min_price AND base_price >= min_price AND (max_price = 0 OR base_price <= max_price));

COMMENT ON CONSTRAINT hotels_price_logic_check ON hotels IS 'Ensures min_price <= base_price <= max_price';

-- Show current hotels configuration
SELECT 
    id,
    name,
    total_rooms,
    base_price,
    min_price,
    max_price
FROM hotels
ORDER BY name;
