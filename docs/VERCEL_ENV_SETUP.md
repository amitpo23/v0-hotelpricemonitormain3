# Vercel Environment Variables Setup Guide

## Setting up APIFY_API_KEY in Vercel

### Step 1: Go to Vercel Dashboard

1. Navigate to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `v0-hotelpricemonitormain3`
3. Go to **Settings** → **Environment Variables**

### Step 2: Add APIFY_API_KEY

Click **Add New** and enter:

- **Key**: `APIFY_API_KEY`
- **Value**: Your Apify API token (from [Apify Console](https://console.apify.com/account/integrations))
- **Environment**: Select **Production**, **Preview**, and **Development**

### Step 3: Add Other Required Variables

Make sure these are also set:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### Step 4: Redeploy

After adding environment variables:
1. Go to **Deployments** tab
2. Click the three dots (...) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic redeployment

## Verifying Environment Variables

### Method 1: Check in Vercel Dashboard

1. Go to Settings → Environment Variables
2. You should see `APIFY_API_KEY` listed
3. Click the eye icon to verify the value (first few characters)

### Method 2: Check Deployment Logs

1. Go to Deployments
2. Click on the latest deployment
3. Click on **Runtime Logs** or **Build Logs**
4. Look for error messages about missing APIFY_API_KEY

### Method 3: Use Debug Endpoint (Development Only)

If you deployed with `NODE_ENV=development`:

```bash
curl https://your-app.vercel.app/api/debug/env
```

This will show which environment variables are available (without exposing the actual values).

## Common Issues

### Issue 1: Variable Not Available After Adding

**Solution**: 
- Redeploy the application (environment variables are only loaded during build/deployment)
- In Vercel Dashboard: Deployments → Redeploy

### Issue 2: Variable Works in Production but Not Preview

**Solution**:
- Make sure you selected **all environments** (Production, Preview, Development) when adding the variable
- Go back to Settings → Environment Variables → Edit the variable → Select all environments

### Issue 3: Variable Name Typo

**Solution**:
- Verify the exact spelling: `APIFY_API_KEY` (all caps, underscores)
- Check for extra spaces or hidden characters
- Re-create the variable if needed

### Issue 4: Invalid API Key

**Solution**:
1. Go to [Apify Console](https://console.apify.com/account/integrations)
2. Verify your API token is correct
3. Try generating a new token
4. Update in Vercel and redeploy

## Testing After Setup

### 1. Check Logs

After redeployment, check the runtime logs:

```
[ApifyIntegration] Initializing Apify client with key: apify_api_...
```

If you see:
```
[ApifyIntegration] Missing APIFY_API_KEY environment variable
```

The variable is not loaded correctly.

### 2. Run a Test Scan

1. Go to your app: `/scans`
2. Click "Run Scan" on any configuration
3. Monitor the logs in Vercel Dashboard → Functions
4. Check for Apify actor run in [Apify Console](https://console.apify.com/actors/runs)

### 3. Check Database

After a successful scan:

```sql
SELECT * FROM scans 
WHERE status = 'completed' 
ORDER BY completed_at DESC 
LIMIT 5;
```

## Environment Variables Checklist

Use this checklist to verify all required variables are set:

- [ ] `APIFY_API_KEY` - Set in all environments
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Set in all environments
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Set in all environments
- [ ] `SUPABASE_SERVICE_KEY` - Set in all environments
- [ ] Variables are not encrypted/hidden (should be visible in dashboard)
- [ ] Redeployed after adding variables
- [ ] Test scan completed successfully

## Alternative: Using Railway

If deploying to Railway instead of Vercel:

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project
3. Click on **Variables** tab
4. Add `APIFY_API_KEY` and other variables
5. Railway will automatically redeploy

## Security Notes

⚠️ **Important**:
- Never commit `.env.local` or `.env` files to Git
- Keep API keys secret
- Rotate keys regularly
- Use different keys for development and production if possible
- Remove the debug endpoint (`/api/debug/env`) in production

## Support

If issues persist:
1. Check [Vercel Status](https://www.vercel-status.com/)
2. Review [Vercel Environment Variables Docs](https://vercel.com/docs/environment-variables)
3. Contact Vercel support or open a GitHub issue
