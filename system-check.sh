#!/bin/bash

echo "==================================="
echo "🔍 RMS System Health Check"
echo "==================================="
echo ""

# 1. Server Status
echo "1️⃣ Server Status:"
pm2 list | grep rms-server
echo ""

# 2. Port Check
echo "2️⃣ Port 3000 Status:"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Port 3000 is responding"
else
    echo "❌ Port 3000 is NOT responding"
fi
echo ""

# 3. Environment Variables
echo "3️⃣ Environment Variables:"
if [ -f .env ]; then
    echo "✅ .env file exists"
    if grep -q "OPENAI_API_KEY=" .env && [ -n "$(grep OPENAI_API_KEY= .env | cut -d= -f2)" ]; then
        echo "✅ OPENAI_API_KEY is set"
    else
        echo "❌ OPENAI_API_KEY is missing or empty"
    fi
    
    if grep -q "ONLYNIGHT_API_URL=" .env && [ -n "$(grep ONLYNIGHT_API_URL= .env | cut -d= -f2)" ]; then
        echo "✅ ONLYNIGHT_API_URL is set"
    else
        echo "❌ ONLYNIGHT_API_URL is missing or empty"
    fi
    
    if grep -q "ONLYNIGHT_CLIENT_SECRET=" .env && [ -n "$(grep ONLYNIGHT_CLIENT_SECRET= .env | cut -d= -f2)" ]; then
        echo "✅ ONLYNIGHT_CLIENT_SECRET is set"
    else
        echo "❌ ONLYNIGHT_CLIENT_SECRET is missing or empty"
    fi
else
    echo "❌ .env file does NOT exist"
fi
echo ""

# 4. Git Status
echo "4️⃣ Git Status:"
git_status=$(git status --short | wc -l)
if [ "$git_status" -gt 0 ]; then
    echo "⚠️  $git_status uncommitted changes"
else
    echo "✅ Working directory clean"
fi
echo ""

# 5. Dependencies
echo "5️⃣ Dependencies:"
if [ -d node_modules ]; then
    echo "✅ node_modules exists"
else
    echo "❌ node_modules missing"
fi
echo ""

# 6. Key Files
echo "6️⃣ Key Files Check:"
files=("server/services/onlyNightApi.ts" "server/routers/ai.ts" "ecosystem.config.cjs" ".env" "package.json")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file missing"
    fi
done
echo ""

echo "==================================="
echo "✅ System Check Complete"
echo "==================================="
