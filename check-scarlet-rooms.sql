-- Check what's actually defined in the database for Scarlet hotel

SELECT 
  id,
  name,
  total_rooms,
  base_price,
  created_at
FROM hotels 
WHERE name ILIKE '%scarlet%' 
ORDER BY name;

-- If total_rooms is NULL or wrong, update it:
-- UPDATE hotels SET total_rooms = 35 WHERE name ILIKE '%scarlet%';
