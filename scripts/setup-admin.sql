-- Set your admin email here
-- Replace 'your-email@example.com' with your actual email

UPDATE profiles 
SET is_admin = true, is_approved = true 
WHERE email = 'your-email@example.com';

-- Alternatively, set the first user as admin:
-- UPDATE profiles 
-- SET is_admin = true, is_approved = true 
-- WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);
