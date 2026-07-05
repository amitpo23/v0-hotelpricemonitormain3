# 🔑 How to Get Your Apify API Key

## Step 1: Go to Apify Console
Visit: https://console.apify.com/account/integrations

## Step 2: Sign In/Sign Up
- If you don't have an account, create one (it's free)
- They offer a free tier with enough credits for testing

## Step 3: Copy Your API Token
- In the "Integrations" tab, you'll see your API token
- It looks something like: `apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 4: Add it to .env.local
```bash
# Edit this file:
nano .env.local

# Replace this line:
APIFY_API_KEY=your_actual_apify_key_here

# With your real key:
APIFY_API_KEY=apify_api_xxxxxxxxxxxxxxxxxxxxxxx
```

## Step 5: Restart the Server
```bash
pkill -f "next dev"
pnpm dev
```

## Step 6: Test
```bash
curl -X POST http://localhost:3000/api/test/scraper-direct \
  -H "Content-Type: application/json" \
  -d '{}'
```

You should see:
```
[v0] [Apify] Using API key: apif...xxxx (length: 46)
[v0] [Apify] Calling actor oeiQgfg5fsmIJB7Cn...
[v0] [Apify] ✅ Actor call succeeded, run ID: ...
```

---

**Note:** Without a valid API key, the scraper will skip Apify and fail!
