# Deployment Guide - Hotel Price Monitor

## 🔐 Security Checklist (CRITICAL - Must Complete Before Deployment)

### 1. Environment Variables Setup

Configure these environment variables in Vercel:

```bash
# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_ANON_KEY=your-anon-key

# Application
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production

# Optional: Bright Data for Scraping
BRIGHT_DATA_USERNAME=your-username
BRIGHT_DATA_PASSWORD=your-password
```

**⚠️ IMPORTANT:**
- Never commit `.env` files to git
- Use `.env.example` as a template
- All SUPABASE keys must be set in Vercel environment variables
- `SUPABASE_SERVICE_ROLE_KEY` should NEVER be exposed to the client

### 2. Database Migrations

Run this SQL in your Supabase SQL Editor:

```bash
# Navigate to Supabase Dashboard > SQL Editor
# Run the migration file:
supabase/migrations/001_create_audit_logs.sql
```

This creates the `audit_logs` table for tracking admin actions.

### 3. Security Verification

After deployment, verify these security measures:

#### ✅ Middleware Protection
Test that `/api/admin/*` endpoints are protected:
```bash
# Should return 401 Unauthorized
curl https://your-app.vercel.app/api/admin/users

# Should return 403 Forbidden (if logged in as non-admin)
curl https://your-app.vercel.app/api/admin/users \
  -H "Cookie: sb-auth-token=YOUR_NON_ADMIN_TOKEN"
```

#### ✅ Admin Endpoint Authentication
- `/api/admin/users` - Requires admin authentication ✓
- `/api/admin/hotels` - Requires admin authentication ✓
- `/api/admin/hotel-access` - Requires admin authentication ✓
- `/api/admin/users/approve` - Requires admin authentication ✓
- `/api/admin/users/delete` - Requires admin authentication ✓

#### ✅ Input Validation
- User IDs are validated as UUIDs ✓
- Type checking on all inputs ✓
- SQL injection protection ✓

#### ✅ Audit Logging
- All approve/delete actions are logged ✓
- IP address and user agent tracking ✓
- Admin user tracking ✓

---

## 🚀 Deployment Steps

### Step 1: Push to GitHub
```bash
git add .
git commit -m "feat: production-ready with full security"
git push origin main
```

### Step 2: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository
3. Configure environment variables (see section 1 above)
4. Deploy!

### Step 3: Run Database Migrations

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_create_audit_logs.sql`
4. Click "Run"

### Step 4: Create First Admin User

Run this SQL in Supabase to make your user an admin:

```sql
UPDATE profiles
SET is_admin = true, role = 'admin'
WHERE email = 'your-email@example.com';
```

### Step 5: Test Security

Follow the verification steps in section 3 above.

---

## 📋 Post-Deployment Checklist

- [ ] All environment variables are set in Vercel
- [ ] Audit logs table created successfully
- [ ] First admin user created
- [ ] Middleware is protecting `/api/admin/*` routes
- [ ] Admin endpoints return 401 for unauthorized users
- [ ] Admin endpoints return 403 for non-admin users
- [ ] User approval works correctly
- [ ] User deletion works correctly
- [ ] Audit logs are being created

---

## 🔍 Monitoring & Maintenance

### View Audit Logs

```sql
-- View recent admin actions
SELECT
  al.*,
  admin.email as admin_email,
  target.email as target_email
FROM audit_logs al
LEFT JOIN profiles admin ON al.admin_user_id = admin.id
LEFT JOIN profiles target ON al.target_user_id = target.id
ORDER BY al.created_at DESC
LIMIT 50;
```

### View Pending Users

```sql
SELECT email, created_at
FROM profiles
WHERE is_approved = false
ORDER BY created_at DESC;
```

---

## 🆘 Troubleshooting

### Issue: "Server configuration error"
**Solution:** Check that all environment variables are set in Vercel

### Issue: "Unauthorized" error when approving users
**Solution:**
1. Verify you're logged in as an admin user
2. Check that your profile has `is_admin = true` or `role = 'admin'`

### Issue: Audit logs not being created
**Solution:**
1. Verify the `audit_logs` table exists in Supabase
2. Check Vercel logs for any database errors
3. Ensure the migration was run successfully

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

---

## 🔒 Security Notes

1. **API Keys:** Never commit API keys to git. Always use environment variables.
2. **Service Role Key:** The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Keep it secure!
3. **Admin Access:** Regularly review who has admin access.
4. **Audit Logs:** Review audit logs regularly for suspicious activity.
5. **Rate Limiting:** Consider adding rate limiting for production (see below).

### Recommended: Add Rate Limiting

For production, consider adding rate limiting using:
- Vercel Edge Config + Middleware
- Upstash Redis
- Third-party service (e.g., Arcjet, Unkey)

---

Last Updated: December 7, 2025
