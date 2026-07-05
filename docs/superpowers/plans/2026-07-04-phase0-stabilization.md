# Phase 0: Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** להחזיר את המערכת לאוויר: דיפלוי ירוק, אבטחת צד-שרת בסיסית, DB משוחזר ממיגרציות, CI, וריפו נקי.

**Architecture:** אין שינוי ארכיטקטוני — רק תיקון, הקשחה וניקוי של הקיים. כל משימה עצמאית וניתנת ל-commit נפרד.

**Tech Stack:** Next.js 15 (App Router), Supabase (`@supabase/ssr`), Vercel, pnpm, vitest, GitHub Actions.

## Global Constraints

- pnpm בלבד; אחרי משימה 1 אסור ש-`package-lock.json` יחזור
- אין שינוי התנהגות עסקית (חיזוי/סריקה) בשלב הזה — רק תיקון תשתית
- כל commit עם הודעה באנגלית בפורמט `fix:`/`chore:`/`feat:`
- לפני כל מחיקת קובץ: `grep -rn "<basename>" app lib components --include='*.ts*'` לוודא אפס imports

---

### Task 1: Fix broken deploy (lockfile) + single package manager

**Files:**
- Modify: `pnpm-lock.yaml` (regenerate)
- Delete: `package-lock.json`

**Interfaces:**
- Produces: דיפלוי Vercel ירוק; בסיס לכל המשימות הבאות

- [ ] **Step 1: Regenerate lockfile**

```bash
cd /Users/mymac/coding/v0-hotelpricemonitormain3
pnpm install
```

Expected: מסתיים בהצלחה; `git status` מראה `pnpm-lock.yaml` modified (נוספו vitest + @vitejs/plugin-react).

- [ ] **Step 2: Remove npm lockfile (מקור הבלבול npm/pnpm)**

```bash
git rm package-lock.json
```

- [ ] **Step 3: Verify build passes locally**

```bash
pnpm build
```

Expected: `✓ Compiled successfully`. אם נכשל על טיפוסים — לתעד את השגיאות המדויקות בקובץ `docs/plan/phase0-build-errors.md` ולעצור לדיווח (אל תתקן בעיוורון — ייתכן שזו שגיאת `scrapeViaPlaywright` הידועה, שמטופלת במשימה 7).

- [ ] **Step 4: Commit and push**

```bash
git add pnpm-lock.yaml
git commit -m "fix: regenerate pnpm lockfile to unbreak Vercel deploy (vitest deps were missing)"
git push origin HEAD
```

- [ ] **Step 5: Verify Vercel deploy is green**

```bash
sleep 180 && vercel ls v0-hotelpricemonitormain3-yx | head -5
```

Expected: הדיפלוי העליון `● Ready` (לא `● Error`). אם Error — `vercel inspect --logs <url>` ולדווח.

---

### Task 2: Standardize Supabase env names + fail-fast validation

**Files:**
- Modify: `lib/env.ts`, `lib/supabase/server.ts`, `.env.example`
- Modify: כל קובץ שמכיל `SUPABASE_SERVICE_KEY` (למצוא ב-Step 1)
- Test: `lib/__tests__/env.test.ts`

**Interfaces:**
- Produces: `requireEnv(name: string): string` — זורק Error עם שם המשתנה אם חסר; שם קנוני יחיד `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 1: Map every usage of both names**

```bash
grep -rln "SUPABASE_SERVICE_KEY\b" --include='*.{ts,tsx,mjs}' app lib scripts .env.example
grep -rln "SUPABASE_SERVICE_ROLE_KEY" --include='*.{ts,tsx,mjs}' app lib scripts .env.example
```

- [ ] **Step 2: Write failing test**

```ts
// lib/__tests__/env.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { requireEnv } from '../env'

describe('requireEnv', () => {
  afterEach(() => { delete process.env.TEST_VAR_X })

  it('returns the value when set', () => {
    process.env.TEST_VAR_X = 'abc'
    expect(requireEnv('TEST_VAR_X')).toBe('abc')
  })

  it('throws with the variable name when missing', () => {
    expect(() => requireEnv('TEST_VAR_X')).toThrow(/TEST_VAR_X/)
  })

  it('throws when value is empty string', () => {
    process.env.TEST_VAR_X = ''
    expect(() => requireEnv('TEST_VAR_X')).toThrow(/TEST_VAR_X/)
  })
})
```

- [ ] **Step 3: Run test — verify it fails**

```bash
pnpm vitest run lib/__tests__/env.test.ts
```

Expected: FAIL (`requireEnv` לא קיים או לא זורק). אם `lib/env.ts` כבר מכיל `requireEnv` תקין — לקרוא אותו קודם ולהתאים את הטסט למימוש הקיים.

- [ ] **Step 4: Implement in `lib/env.ts` (להוסיף, לא למחוק קיים)**

```ts
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}
```

- [ ] **Step 5: Replace all `SUPABASE_SERVICE_KEY` with `SUPABASE_SERVICE_ROLE_KEY`** בכל הקבצים מ-Step 1 (כולל `.env.example`), ולעדכן את `lib/supabase/server.ts` להשתמש ב-`requireEnv('SUPABASE_SERVICE_ROLE_KEY')` במקום fallback ל-`""`.

- [ ] **Step 6: Run tests + typecheck, verify green**

```bash
pnpm vitest run lib/__tests__/env.test.ts && npx tsc --noEmit 2>&1 | tail -5
```

Expected: PASS; typecheck בלי שגיאות חדשות.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "fix: standardize SUPABASE_SERVICE_ROLE_KEY name and fail fast on missing env"
```

הערה תפעולית (לצרף לדיווח למשתמש): לוודא ב-Vercel Dashboard שהמשתנה קיים בשם `SUPABASE_SERVICE_ROLE_KEY`.

---

### Task 3: Lock down dangerous endpoints

**Files:**
- Delete: `app/api/debug/hotel-data/route.ts`
- Modify: `app/api/autopilot/execute/route.ts`
- Create: `lib/auth/require-user.ts`
- Test: `lib/__tests__/require-user.test.ts`

**Interfaces:**
- Produces: `requireUser(request?: Request): Promise<{ user: User } | { errorResponse: NextResponse }>` — משמש כל ראוט מוגן מכאן והלאה

- [ ] **Step 1: Delete the data-leak endpoint**

```bash
grep -rn "debug/hotel-data" app lib components --include='*.ts*' | grep -v "app/api/debug/hotel-data"
```

Expected: אפס תוצאות (אין צרכנים). אז:

```bash
git rm -r app/api/debug/hotel-data
```

- [ ] **Step 2: Create the auth helper**

```ts
// lib/auth/require-user.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user, errorResponse: null }
}
```

הערה: לקרוא קודם את `lib/supabase/server.ts` — אם ה-export אינו `createClient` או אינו async, להתאים את הקריאה למימוש הקיים.

- [ ] **Step 3: Guard the autopilot execute route** — בראש ה-handler(ים) ב-`app/api/autopilot/execute/route.ts`:

```ts
import { requireUser } from '@/lib/auth/require-user'

// בתחילת כל exported handler (POST/GET):
const { user, errorResponse } = await requireUser()
if (errorResponse) return errorResponse
```

- [ ] **Step 4: Verify manually against dev server**

```bash
pnpm dev & sleep 8
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/autopilot/execute -H 'Content-Type: application/json' -d '{}'
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/debug/hotel-data
kill %1
```

Expected: `401` לראשון, `404` לשני.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "fix(security): require auth on autopilot execute, remove hotel-data debug leak"
```

---

### Task 4: Mandatory CRON_SECRET on all cron targets

**Files:**
- Create: `lib/auth/cron-auth.ts`
- Test: `lib/__tests__/cron-auth.test.ts`
- Modify: `app/api/cron/auto-scan/route.ts`, `app/api/cron/monitor-scan/route.ts`, `app/api/cron/update-predictions/route.ts`, `app/api/cron/daily-predictions/route.ts`, `app/api/cron/cache-cleanup/route.ts`, `app/api/learning/accuracy/route.ts`, `app/api/learning/refresh-predictions/route.ts`, `app/api/optimize-weights/route.ts`

**Interfaces:**
- Produces: `requireCronAuth(request: Request): NextResponse | null` — מחזיר null אם מאושר, אחרת NextResponse לשגיאה

- [ ] **Step 1: Write failing test**

```ts
// lib/__tests__/cron-auth.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { requireCronAuth } from '../auth/cron-auth'

function req(auth?: string) {
  return new Request('http://x/api/cron/test', { headers: auth ? { authorization: auth } : {} })
}

describe('requireCronAuth', () => {
  beforeEach(() => { process.env.CRON_SECRET = 's3cret' })
  afterEach(() => { delete process.env.CRON_SECRET })

  it('returns null for correct bearer token', () => {
    expect(requireCronAuth(req('Bearer s3cret'))).toBeNull()
  })

  it('returns 401 for wrong token', async () => {
    const res = requireCronAuth(req('Bearer wrong'))
    expect(res?.status).toBe(401)
  })

  it('returns 401 for missing header', () => {
    expect(requireCronAuth(req())?.status).toBe(401)
  })

  it('returns 503 when CRON_SECRET is not configured (never open access)', () => {
    delete process.env.CRON_SECRET
    expect(requireCronAuth(req('Bearer anything'))?.status).toBe(503)
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
pnpm vitest run lib/__tests__/cron-auth.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/auth/cron-auth.ts
import { NextResponse } from 'next/server'

export function requireCronAuth(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
pnpm vitest run lib/__tests__/cron-auth.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Apply to all 8 routes** — בכל אחד מ-8 הקבצים: למחוק את בדיקת ה-secret המותנית הקיימת (`if (cronSecret && ...)` וכד') ולהחליף בשורות בתחילת ה-handler:

```ts
import { requireCronAuth } from '@/lib/auth/cron-auth'

// first lines of each exported handler:
const denied = requireCronAuth(request)
if (denied) return denied
```

לוודא שה-handler מקבל `request: Request` כפרמטר (להוסיף אם חסר).

- [ ] **Step 6: Verify no conditional secret checks remain**

```bash
grep -rn "CRON_SECRET" app/api --include='*.ts' | grep -v "cron-auth"
```

Expected: אפס תוצאות (רק ה-helper מכיר את המשתנה).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "fix(security): mandatory CRON_SECRET via requireCronAuth on all 8 cron targets"
```

---

### Task 5: Real server-side auth middleware

**Files:**
- Modify: `lib/supabase/middleware.ts`, `middleware.ts`

**Interfaces:**
- Consumes: `@supabase/ssr` createServerClient
- Produces: כל `/api/*` שאינו ברשימה הפומבית דורש סשן תקף; דפי אפליקציה מפנים ל-login

- [ ] **Step 1: Read current files** — `middleware.ts` (root) ו-`lib/supabase/middleware.ts`, לזהות את פונקציית ה-entry ואת ה-matcher.

- [ ] **Step 2: Rewrite `lib/supabase/middleware.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that must work without a user session.
// Cron + webhooks authenticate per-route (CRON_SECRET / webhook signature).
const PUBLIC_PREFIXES = [
  '/api/auth',
  '/api/cron',
  '/api/webhooks',
  '/auth',
  '/_next',
  '/favicon.ico',
]
const PUBLIC_EXACT = ['/']

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic =
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))

  if (!user && !isPublic) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return response
}
```

- [ ] **Step 3: Verify behavior on dev server**

```bash
pnpm dev & sleep 8
echo "protected api:"; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/hotels
echo "protected page:"; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dashboard
echo "public page:";  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/auth/login
kill %1
```

Expected: `401`, `307` (redirect), `200`.

- [ ] **Step 4: Smoke-test logged-in flow** — להתחבר דרך הדפדפן ב-`/auth/login` עם משתמש קיים ולוודא שה-dashboard נטען ושקריאות ה-API מהדפים עובדות. אם אין משתמש בדיקה — ליצור דרך `/auth/signup` (דורש `is_approved` — לעדכן ידנית ב-DB אם צריך) ולתעד את הקרדנציאלס ב-`.env.local` בהערה.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "fix(security): enforce server-side Supabase session for all non-public routes"
```

---

### Task 6: Dependency prune + pinning

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Find truly-unused packages** — לכל חשוד, לבדוק אפס imports:

```bash
for p in "@aws-sdk/client-rds-data" "@cloudflare/workers-types" "@electric-sql/pglite" "@libsql/client" "@libsql/client-wasm" "@neondatabase/serverless" "@op-engineering/op-sqlite" "@planetscale/database" "@prisma/client" "@tidbcloud/serverless" "@types/better-sqlite3" "@types/pg" "@types/sql.js" "@upstash/redis" "@vercel/postgres" "@xata.io/client" "better-sqlite3" "bun-types" "drizzle-orm" "expo-sqlite" "gel" "knex" "kysely" "mysql2" "pg" "postgres"; do
  count=$(grep -rl "from ['\"]$p" app lib components scripts --include='*.ts' --include='*.tsx' --include='*.mjs' 2>/dev/null | wc -l | tr -d ' ')
  echo "$count  $p"
done
```

- [ ] **Step 2: Remove every package with count 0**

```bash
pnpm remove <space-separated list of 0-count packages>
```

- [ ] **Step 3: Pin remaining `"latest"` deps** — `grep '"latest"' package.json`; לכל שנותר, להחליף לגרסה המותקנת בפועל: `pnpm list <pkg> --depth=0` ⇒ לקבע `"^<installed>"`.

- [ ] **Step 4: Verify build + tests still green**

```bash
pnpm install && pnpm vitest run && pnpm build
```

Expected: הכל ירוק. אם build נשבר על חבילה שהוסרה — להחזיר רק אותה (`pnpm add <pkg>@<ver>`) ולתעד למה.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml && git commit -m "chore: remove unused DB drivers, pin all 'latest' dependencies"
```

---

### Task 7: Remove dead scraper code paths

**Files:**
- Delete (אחרי אימות אפס-imports): `lib/scraper/booking-scraper.tsx`-של החלקים המתים, קוד מדומה ב-`app/api/scans/execute/route.ts`
- Modify: `lib/scraper/real-scraper.ts` (או מי שמייבא את הנתיב המת)

הקשר: `booking-scraper.tsx` קורא ל-`scrapeViaPlaywright` **שאינו מוגדר באף מקום** ומריץ פייתון בנתיב קשיח של Codespaces. שלב 1 יביא סקרייפר חדש; כאן רק מסירים את מה ששבור כדי שה-typecheck יהיה אמין. **אסור** למחוק את נתיב ה-Apify שעובד.

- [ ] **Step 1: Map the live call chain**

```bash
grep -rn "scrapeCompetitorAllRooms\|scrapeViaApify\|scrapeViaPlaywright\|scraper_v5" app lib --include='*.ts*'
```

לתעד ב-`docs/plan/phase0-scraper-map.md`: מי קורא למה, איזה נתיב חי (מ-`app/api/scans/execute/route.ts`) ואיזה מת.

- [ ] **Step 2: Remove the broken branches** — בתוך `lib/scraper/booking-scraper.tsx`: למחוק את הפונקציות/ענפים שמפעילים `scrapeViaPlaywright` ואת ה-`child_process.exec` של `scraper_v5.py`, ולהשאיר fallback-chain של מה שרץ ב-Vercel בלבד (Apify ⇒ Tavily). אם הקובץ כולו מת — למחוק אותו ואת ה-import.

- [ ] **Step 3: Remove simulated dead code** — ב-`app/api/scans/execute/route.ts`: למחוק את `scrapeCompetitorPrices()`/`fetchMarketData()` המדומות (מחוללי מספרים אקראיים) ואת בלוק ה-"OLD CODE" בהערות — רק אם `grep` מאשר שאין להן קוראים חיים.

- [ ] **Step 4: Typecheck must be clean now**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: אפס שגיאות. זה האימות המרכזי של המשימה — עד עכשיו `scrapeViaPlaywright` הלא-מוגדר היה חייב להכשיל typecheck.

- [ ] **Step 5: Verify a scan still executes (Tavily/Apify path)**

```bash
pnpm dev & sleep 8
curl -s -X POST http://localhost:3000/api/scans/execute -H 'Content-Type: application/json' -H "Cookie: <session cookie from Task 5 test user>" -d '{"configId":"<existing scan_config id>"}' | head -c 500
kill %1
```

Expected: תשובת JSON תקינה (גם אם עם שגיאת credentials של Apify — העיקר שאין קריסה על קוד חסר).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "fix: remove broken playwright/python scraper paths and simulated scan code"
```

---

### Task 8: Baseline DB migration (reproducible schema)

**Files:**
- Create: `supabase/migrations/00000000000001_baseline.sql`
- Create: `docs/plan/phase0-schema-notes.md`

הקשר: ~16 טבלאות חיות נוצרו ידנית ואין להן מיגרציה (`bookings, competitors, hotel_competitors, competitor_daily_prices, daily_prices, autopilot_rules, autopilot_logs, profiles, budget_targets, price_predictions, room_types, rooms, hotel_room_types, competitor_room_types, hotel_user_access, market_trends`).

- [ ] **Step 1: Dump the live schema** (דורש `SUPABASE_DB_URL` — connection string מה-Dashboard; לבקש מהמשתמש אם לא קיים ב-`.env.local`):

```bash
npx supabase db dump --db-url "$SUPABASE_DB_URL" -f supabase/migrations/00000000000001_baseline.sql --schema public
```

- [ ] **Step 2: Verify all 16 orphan tables are in the dump**

```bash
for t in bookings competitors hotel_competitors competitor_daily_prices daily_prices autopilot_rules autopilot_logs profiles budget_targets price_predictions room_types rooms hotel_room_types competitor_room_types hotel_user_access market_trends; do
  grep -q "CREATE TABLE.*\b$t\b" supabase/migrations/00000000000001_baseline.sql && echo "OK $t" || echo "MISSING $t"
done
```

Expected: 16 × OK. כל MISSING = הטבלה לא קיימת בפרודקשן בכלל — לתעד ב-`docs/plan/phase0-schema-notes.md` (חשוב! זה אומר שקוד שכותב אליה שבור בשקט).

- [ ] **Step 3: Prove reproducibility on a scratch DB** — עם Postgres מקומי (docker):

```bash
docker run -d --name rms-schema-test -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:16
sleep 5
psql "postgresql://postgres:test@localhost:55432/postgres" -f supabase/migrations/00000000000001_baseline.sql 2>&1 | grep -c ERROR
docker rm -f rms-schema-test
```

Expected: `0` שגיאות (או רק שגיאות ידועות של extensions של Supabase — לתעד).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations docs/plan/phase0-schema-notes.md
git commit -m "chore(db): baseline migration capturing full live schema"
```

---

### Task 9: CI pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create workflow**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: npx tsc --noEmit
      - run: pnpm vitest run
      - run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder
```

- [ ] **Step 2: Push and verify**

```bash
git add .github && git commit -m "chore(ci): typecheck + tests + build on every push" && git push origin HEAD
sleep 90 && gh run list --limit 1
```

Expected: run עם status `completed success`. אם build נכשל על env חסר — להוסיף placeholders ל-env בלוק ה-build בלבד (לא secrets אמיתיים).

---

### Task 10: Root cleanup + single source of truth

**Files:**
- Create: `STATE.md`, `scripts/archive/` (העברה)
- Delete: קבצי לוג תועים

- [ ] **Step 1: Archive one-off scripts**

```bash
mkdir -p scripts/archive
git mv $(ls *.mjs *.sh 2>/dev/null | grep -v -E '^(next|postcss)' ) scripts/archive/ 2>/dev/null
git rm scan-log-*.txt log-extraction-output.txt missing-dates.txt 2>/dev/null
```

לוודא לפני: אף אחד מהקבצים לא מיובא מקוד חי (`grep -rn "scripts/archive\|\./<name>" package.json vercel.json app lib`) — ובמיוחד ש-`package.json` scripts לא מפנים אליהם.

- [ ] **Step 2: Write STATE.md** — מסמך יחיד (עברית) שמחליף את 68 קבצי ה-MD כמקור אמת: מה המערכת עושה היום, מה הסטטוס האמיתי של כל תת-מערכת (מהטבלה בספק), ולינק לספק ולתוכניות. את קבצי ה-MD הישנים **לא מוחקים** בשלב זה — מעבירים ל-`docs/archive/`:

```bash
mkdir -p docs/archive
git mv $(ls *.md | grep -v -E '^(README|STATE)\.md$') docs/archive/
```

- [ ] **Step 3: Update README** — לעדכן את סעיף הסטטוס ב-README להפנות ל-STATE.md ולתוכניות (להסיר את "17% (Week 2/12)" המת).

- [ ] **Step 4: Final phase verification**

```bash
pnpm vitest run && npx tsc --noEmit && pnpm build && ls *.md *.mjs *.sh 2>/dev/null
```

Expected: הכל ירוק; ברוט נשארו רק README.md, STATE.md וקבצי קונפיג.

- [ ] **Step 5: Commit + request phase review**

```bash
git add -A && git commit -m "chore: archive one-off scripts and stale docs, add STATE.md as single source of truth"
git push origin HEAD
```

ואז: לעצור, להריץ code review (מודל חזק) על `git diff main...HEAD`, ולדווח למשתמש לפני merge.
