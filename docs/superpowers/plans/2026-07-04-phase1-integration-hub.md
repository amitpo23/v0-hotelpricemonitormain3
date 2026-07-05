# Phase 1: Integration Hub + Multi-Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Prerequisite: Phase 0 complete and merged.**

**Goal:** תשתית רב-מלונאית עם שכבת מתאמים אחידה: כל מלון מגדיר מקורות תפוסה/מתחרים/דחיפה, הדאטה זורם יומית בצינור משורשר, ושינויי שוק מזוהים ברציפות.

**Architecture:** ארבעה חוזי TypeScript (`OccupancySource`, `RateShopSource`, `PricePusher`, `DemandSignal`) + registry שממפה רשומות `hotel_integrations` למתאמים. מתאמים אוניברסליים (Excel, Advisory) מבטיחים שכל מלון עובד גם בלי API. צינור יומי אחד לכל מלון + לולאת Diff.

**Tech Stack:** Next.js 15, Supabase (Postgres + RLS), apify-client, vitest, `xlsx` (קיים דרך parse-excel), Node crypto (AES-256-GCM).

## Global Constraints

- כל טבלה חדשה נוצרת עם `ENABLE ROW LEVEL SECURITY` + policies באותה מיגרציה
- credentials של אינטגרציות נשמרים מוצפנים בלבד (AES-256-GCM, מפתח ב-`INTEGRATIONS_SECRET`) — לעולם לא בטקסט גלוי
- כל מתאם חדש = קובץ אחד ב-`lib/integrations/adapters/` + טסט יחידה עם fixtures — בלי קריאות רשת בטסטים
- אין שבירת ה-API הקיים של ה-UI; ראוטים ישנים ממשיכים לעבוד עד שה-UI החדש מחליף אותם

---

### Task 1: Tenancy + Integration Hub schema migration

**Files:**
- Create: `supabase/migrations/00000000000002_tenancy_integration_hub.sql`

**Interfaces:**
- Produces: טבלאות `organizations`, `hotel_integrations`, `hotel_occupancy_daily`, `pickup_snapshots`, `market_changes`; עמודת `org_id` על `hotels`; view `v_user_hotels`

- [ ] **Step 1: Write the migration**

```sql
-- 00000000000002_tenancy_integration_hub.sql
create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table hotels add column if not exists org_id uuid references organizations(id);

-- one default org for existing data
insert into organizations (name) select 'Default Org'
  where not exists (select 1 from organizations);
update hotels set org_id = (select id from organizations limit 1) where org_id is null;

-- membership: reuse existing profiles + hotel_user_access; add org link
alter table profiles add column if not exists org_id uuid references organizations(id);
update profiles set org_id = (select id from organizations limit 1) where org_id is null;

create table if not exists hotel_integrations (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  category text not null check (category in ('occupancy','rate_shop','price_push','demand_signal')),
  provider text not null,             -- e.g. 'excel', 'apify_booking', 'advisory', 'medici_monitor'
  config jsonb not null default '{}', -- non-secret config (urls, hotel external ids)
  credentials_enc text,               -- AES-256-GCM, base64(iv||tag||ciphertext)
  enabled boolean not null default true,
  last_ok_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (hotel_id, category, provider)
);

create table if not exists hotel_occupancy_daily (
  hotel_id uuid not null references hotels(id) on delete cascade,
  date date not null,
  rooms_total int,
  rooms_sold int,
  rooms_available int,
  occupancy_rate numeric(5,2),
  source text not null,
  captured_at timestamptz not null default now(),
  primary key (hotel_id, date, source)
);

create table if not exists pickup_snapshots (
  hotel_id uuid not null references hotels(id) on delete cascade,
  stay_date date not null,
  snapshot_date date not null,
  rooms_sold int not null,
  source text not null,
  primary key (hotel_id, stay_date, snapshot_date, source)
);

create table if not exists market_changes (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  change_type text not null check (change_type in ('competitor_price','competitor_soldout','new_event')),
  stay_date date not null,
  competitor_id uuid,
  old_value numeric,
  new_value numeric,
  pct_change numeric,
  details jsonb not null default '{}',
  detected_at timestamptz not null default now(),
  reprediction_triggered boolean not null default false
);

-- RLS
alter table organizations enable row level security;
alter table hotel_integrations enable row level security;
alter table hotel_occupancy_daily enable row level security;
alter table pickup_snapshots enable row level security;
alter table market_changes enable row level security;

create or replace view v_user_hotels as
  select h.id as hotel_id from hotels h
  join profiles p on p.org_id = h.org_id
  where p.id = auth.uid();

create policy org_read on organizations for select
  using (id in (select org_id from profiles where profiles.id = auth.uid()));

create policy hi_all on hotel_integrations for all
  using (hotel_id in (select hotel_id from v_user_hotels))
  with check (hotel_id in (select hotel_id from v_user_hotels));

create policy hod_all on hotel_occupancy_daily for all
  using (hotel_id in (select hotel_id from v_user_hotels))
  with check (hotel_id in (select hotel_id from v_user_hotels));

create policy ps_all on pickup_snapshots for all
  using (hotel_id in (select hotel_id from v_user_hotels))
  with check (hotel_id in (select hotel_id from v_user_hotels));

create policy mc_all on market_changes for all
  using (hotel_id in (select hotel_id from v_user_hotels))
  with check (hotel_id in (select hotel_id from v_user_hotels));
```

- [ ] **Step 2: Apply to scratch DB first (docker, כמו Phase0 Task 8 Step 3)** — baseline ואז המיגרציה הזו; Expected: 0 ERROR.

- [ ] **Step 3: Apply to live Supabase**

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/00000000000002_tenancy_integration_hub.sql
psql "$SUPABASE_DB_URL" -c "\d hotel_integrations" | head -20
```

Expected: הטבלה קיימת עם כל העמודות.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations && git commit -m "feat(db): tenancy + integration hub schema with RLS"
```

---

### Task 2: Credentials encryption helper

**Files:**
- Create: `lib/integrations/crypto.ts`
- Test: `lib/integrations/__tests__/crypto.test.ts`

**Interfaces:**
- Produces: `encryptCredentials(obj: Record<string, string>): string`, `decryptCredentials(enc: string): Record<string, string>` — round-trip; זורק אם `INTEGRATIONS_SECRET` חסר

- [ ] **Step 1: Failing test**

```ts
// lib/integrations/__tests__/crypto.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { encryptCredentials, decryptCredentials } from '../crypto'

describe('integration credentials crypto', () => {
  beforeEach(() => { process.env.INTEGRATIONS_SECRET = 'test-secret-at-least-32-chars-long!!' })

  it('round-trips an object', () => {
    const enc = encryptCredentials({ apiKey: 'k1', baseUrl: 'https://x' })
    expect(enc).not.toContain('k1')
    expect(decryptCredentials(enc)).toEqual({ apiKey: 'k1', baseUrl: 'https://x' })
  })

  it('produces different ciphertext each time (random IV)', () => {
    expect(encryptCredentials({ a: '1' })).not.toBe(encryptCredentials({ a: '1' }))
  })

  it('throws when secret missing', () => {
    delete process.env.INTEGRATIONS_SECRET
    expect(() => encryptCredentials({ a: '1' })).toThrow(/INTEGRATIONS_SECRET/)
  })
})
```

- [ ] **Step 2: Run — verify FAIL** (`pnpm vitest run lib/integrations/__tests__/crypto.test.ts`)

- [ ] **Step 3: Implement**

```ts
// lib/integrations/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'
import { requireEnv } from '@/lib/env'

function key(): Buffer {
  return createHash('sha256').update(requireEnv('INTEGRATIONS_SECRET')).digest()
}

export function encryptCredentials(obj: Record<string, string>): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ct = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64')
}

export function decryptCredentials(enc: string): Record<string, string> {
  const buf = Buffer.from(enc, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ct = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return JSON.parse(Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8'))
}
```

- [ ] **Step 4: Run — verify PASS; Step 5: Commit** `feat(integrations): AES-256-GCM credentials encryption`

---

### Task 3: Integration contracts + registry

**Files:**
- Create: `lib/integrations/contracts.ts`, `lib/integrations/registry.ts`
- Test: `lib/integrations/__tests__/registry.test.ts`

**Interfaces (המשימות הבאות תלויות בחתימות האלה בדיוק):**

- [ ] **Step 1: Write contracts**

```ts
// lib/integrations/contracts.ts
export interface OccupancySnapshot {
  hotelId: string; date: string /* YYYY-MM-DD */
  roomsTotal: number | null; roomsSold: number | null
  roomsAvailable: number | null; occupancyRate: number | null
  source: string
}

export interface CompetitorRate {
  hotelId: string; competitorId: string | null; competitorName: string
  stayDate: string; roomType: string | null
  price: number; currency: string
  availability: 'available' | 'soldout' | 'unknown'
}

export interface PriceUpdate { stayDate: string; roomTypeId: string | null; price: number; currency: string }
export interface PricePushResult { stayDate: string; status: 'pushed' | 'pending_approval' | 'failed'; error?: string }

export interface IntegrationContext {
  hotelId: string
  config: Record<string, unknown>
  credentials: Record<string, string>
}

export interface OccupancySource {
  readonly category: 'occupancy'; readonly provider: string
  fetchOccupancy(ctx: IntegrationContext, from: string, to: string): Promise<OccupancySnapshot[]>
}

export interface RateShopSource {
  readonly category: 'rate_shop'; readonly provider: string
  fetchRates(ctx: IntegrationContext, input: { competitorUrls: string[]; checkIn: string; checkOut: string }): Promise<CompetitorRate[]>
}

export interface PricePusher {
  readonly category: 'price_push'; readonly provider: string; readonly mode: 'advisory' | 'live'
  pushPrices(ctx: IntegrationContext, updates: PriceUpdate[]): Promise<PricePushResult[]>
}

export type Adapter = OccupancySource | RateShopSource | PricePusher
```

- [ ] **Step 2: Write registry (failing test first)**

```ts
// lib/integrations/__tests__/registry.test.ts
import { describe, it, expect } from 'vitest'
import { getAdapter, listProviders } from '../registry'

describe('integration registry', () => {
  it('resolves a registered provider', () => {
    const a = getAdapter('occupancy', 'excel')
    expect(a?.provider).toBe('excel')
  })
  it('returns null for unknown provider', () => {
    expect(getAdapter('occupancy', 'nope')).toBeNull()
  })
  it('lists providers per category', () => {
    expect(listProviders('price_push')).toContain('advisory')
  })
})
```

```ts
// lib/integrations/registry.ts
import type { Adapter } from './contracts'
import { excelOccupancyAdapter } from './adapters/excel-occupancy'
import { apifyRateShopAdapter } from './adapters/apify-rate-shop'
import { advisoryPricePusher } from './adapters/advisory-price-push'
// medici adapters imported here as they land (Tasks 6-7)

const adapters: Adapter[] = [excelOccupancyAdapter, apifyRateShopAdapter, advisoryPricePusher]

export function getAdapter(category: Adapter['category'], provider: string): Adapter | null {
  return adapters.find(a => a.category === category && a.provider === provider) ?? null
}

export function listProviders(category: Adapter['category']): string[] {
  return adapters.filter(a => a.category === category).map(a => a.provider)
}
```

הערה: הטסט ייכשל עד שמשימות 4–5 יספקו את שלושת המתאמים — לכן משימה זו מסתיימת ב-commit של contracts בלבד, וה-registry+טסט נכנסים ב-commit של משימה 5. (אם מעדיפים ירוק רציף: לרשום זמנית מתאמי stub ולהחליפם.)

- [ ] **Step 3: Commit** `feat(integrations): contracts for occupancy/rate-shop/price-push adapters`

---

### Task 4: Universal adapters — Excel occupancy + Advisory pusher

**Files:**
- Create: `lib/integrations/adapters/excel-occupancy.ts`, `lib/integrations/adapters/advisory-price-push.ts`
- Create: `app/api/integrations/occupancy/upload/route.ts`
- Test: `lib/integrations/__tests__/excel-occupancy.test.ts`, fixture `lib/integrations/__tests__/fixtures/occupancy-sample.csv`

- [ ] **Step 1: Fixture** — CSV בפורמט המוסכם (זה הפורמט שמלונות "ידניים" יתבקשו לייצא מה-PMS):

```csv
date,rooms_total,rooms_sold
2026-07-10,60,42
2026-07-11,60,55
2026-07-12,60,31
```

- [ ] **Step 2: Failing test**

```ts
// lib/integrations/__tests__/excel-occupancy.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseOccupancyCsv } from '../adapters/excel-occupancy'

describe('excel/csv occupancy parsing', () => {
  const csv = readFileSync(join(__dirname, 'fixtures/occupancy-sample.csv'), 'utf8')

  it('parses rows into snapshots', () => {
    const rows = parseOccupancyCsv(csv, 'hotel-1')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({
      hotelId: 'hotel-1', date: '2026-07-10', roomsTotal: 60, roomsSold: 42,
      roomsAvailable: 18, occupancyRate: 70, source: 'excel',
    })
  })

  it('rejects malformed dates', () => {
    expect(() => parseOccupancyCsv('date,rooms_total,rooms_sold\n10/07/2026,60,42', 'h')).toThrow(/date/i)
  })
})
```

- [ ] **Step 3: Implement adapter**

```ts
// lib/integrations/adapters/excel-occupancy.ts
import type { IntegrationContext, OccupancySnapshot, OccupancySource } from '../contracts'

export function parseOccupancyCsv(csv: string, hotelId: string): OccupancySnapshot[] {
  const lines = csv.trim().split(/\r?\n/)
  const header = lines[0].split(',').map(s => s.trim())
  const di = header.indexOf('date'), ti = header.indexOf('rooms_total'), si = header.indexOf('rooms_sold')
  if (di < 0 || ti < 0 || si < 0) throw new Error('CSV must have columns: date, rooms_total, rooms_sold')
  return lines.slice(1).filter(Boolean).map((line, n) => {
    const cols = line.split(',')
    const date = cols[di]?.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Row ${n + 2}: invalid date "${date}" (expected YYYY-MM-DD)`)
    const roomsTotal = Number(cols[ti]), roomsSold = Number(cols[si])
    if (!Number.isFinite(roomsTotal) || !Number.isFinite(roomsSold)) throw new Error(`Row ${n + 2}: non-numeric rooms`)
    return {
      hotelId, date, roomsTotal, roomsSold,
      roomsAvailable: roomsTotal - roomsSold,
      occupancyRate: roomsTotal > 0 ? Math.round((roomsSold / roomsTotal) * 10000) / 100 : null,
      source: 'excel',
    }
  })
}

export const excelOccupancyAdapter: OccupancySource = {
  category: 'occupancy', provider: 'excel',
  // Excel is push-based (upload route writes to DB); fetch reads what was uploaded.
  async fetchOccupancy(_ctx: IntegrationContext, _from, _to) { return [] },
}
```

- [ ] **Step 4: Upload route** — `app/api/integrations/occupancy/upload/route.ts`: `requireUser` ⇒ מקבל `hotelId` + קובץ CSV (או xlsx דרך המנגנון הקיים של `parse-excel` אם הוא כבר ממיר ל-CSV — לקרוא אותו קודם) ⇒ `parseOccupancyCsv` ⇒ upsert ל-`hotel_occupancy_daily`. להחזיר `{ inserted: n, dates: [first, last] }`.

- [ ] **Step 5: Advisory pusher**

```ts
// lib/integrations/adapters/advisory-price-push.ts
import type { IntegrationContext, PricePusher, PriceUpdate, PricePushResult } from '../contracts'
import { createServiceClient } from '@/lib/supabase/server' // adjust to actual export name

export const advisoryPricePusher: PricePusher = {
  category: 'price_push', provider: 'advisory', mode: 'advisory',
  async pushPrices(ctx: IntegrationContext, updates: PriceUpdate[]): Promise<PricePushResult[]> {
    const supabase = createServiceClient()
    const rows = updates.map(u => ({
      hotel_id: ctx.hotelId, stay_date: u.stayDate, room_type_id: u.roomTypeId,
      recommended_price: u.price, currency: u.currency, status: 'pending_approval', source: 'advisory',
    }))
    const { error } = await supabase.from('price_recommendations').insert(rows)
    if (error) return updates.map(u => ({ stayDate: u.stayDate, status: 'failed' as const, error: error.message }))
    return updates.map(u => ({ stayDate: u.stayDate, status: 'pending_approval' as const }))
  },
}
```

לפני המימוש: לקרוא את הסכמה בפועל של `price_recommendations` (מה-baseline migration) ולהתאים שמות עמודות; אם חסרות עמודות (`status`, `room_type_id`) — מיגרציה קטנה `00000000000003_price_recommendations_status.sql`.

- [ ] **Step 6: Run all new tests + registry test (now green)** ⇒ **Step 7: Commit** `feat(integrations): universal excel occupancy + advisory price pusher + registry`

---

### Task 5: Consolidated Apify rate-shop adapter (one actor, one path)

**Files:**
- Create: `lib/integrations/adapters/apify-rate-shop.ts`
- Test: `lib/integrations/__tests__/apify-rate-shop.test.ts` + fixture `fixtures/apify-run-result.json`
- Modify: `app/api/scans/execute/route.ts` (לקרוא דרך המתאם)
- Delete אחרי אפס-imports: `lib/scraper/apify-scraper-integration.ts`, שאריות actor IDs אחרים

- [ ] **Step 1: Fixture** — פלט אמיתי-מבנה של `voyager/booking-scraper` (לקחת דוגמה מ-run קיים ב-Apify console או מ-`docs/archive/` — יש דוגמאות ב-`APIFY_SETUP.md`). מינימום שדות: name, url, rooms[{roomType, price, currency, available}], checkIn/checkOut.

- [ ] **Step 2: Failing test** — `mapApifyItems(items, hotelId, competitorByUrl)` ממפה ל-`CompetitorRate[]`: מחיר מספרי, מטבע, soldout כשאין rooms, שיוך competitorId לפי URL.

```ts
import { describe, it, expect } from 'vitest'
import { mapApifyItems } from '../adapters/apify-rate-shop'
import fixture from './fixtures/apify-run-result.json'

describe('apify rate-shop mapping', () => {
  it('maps items to CompetitorRate rows', () => {
    const rates = mapApifyItems(fixture as any[], 'hotel-1', { 'https://www.booking.com/hotel/il/comp-a.html': 'comp-a-id' })
    expect(rates.length).toBeGreaterThan(0)
    expect(rates[0]).toMatchObject({ hotelId: 'hotel-1', currency: expect.any(String), price: expect.any(Number) })
  })
  it('marks zero-room items as soldout', () => {
    const rates = mapApifyItems([{ url: 'https://www.booking.com/hotel/il/comp-a.html', name: 'A', rooms: [] }] as any[], 'h', {})
    expect(rates[0].availability).toBe('soldout')
  })
})
```

- [ ] **Step 3: Implement** — `apifyRateShopAdapter: RateShopSource` עם `provider: 'apify_booking'`: קורא ל-actor **יחיד** `voyager/booking-scraper` דרך `apify-client` (הקיים ב-deps), input עם `checkIn/checkOut` (חובה!), ממפה עם `mapApifyItems`. `ACTOR_ID` מ-config של האינטגרציה עם ברירת מחדל, API token מ-credentials המוצפנים (fallback ל-`process.env.APIFY_API_KEY`).

- [ ] **Step 4: Rewire `app/api/scans/execute/route.ts`** — הנתיב החי קורא ל-`getAdapter('rate_shop', ...)` לפי `hotel_integrations` של המלון (ברירת מחדל apify_booking), שומר תוצאות גם ל-`scan_results` (תאימות UI קיים) **וגם** ל-`competitor_daily_prices` + `daily_prices` (זה ה-fix לצינור שלא זרם!).

- [ ] **Step 5: Live smoke test (פעם אחת, בפיקוח)** — סריקה אמיתית של מלון קיים ב-DB דרך ה-API עם משתמש מחובר; לוודא שורות חדשות:

```bash
psql "$SUPABASE_DB_URL" -c "select count(*) from competitor_daily_prices where created_at > now() - interval '10 minutes'"
```

Expected: > 0.

- [ ] **Step 6: Delete dead scraper files** (אחרי `grep` אפס-imports): `lib/scraper/apify-scraper-integration.ts` ואחרים שנשארו. **Step 7: Commit** `feat(scan): single apify rate-shop adapter feeding daily price history`

---

### Task 6: Medici Monitor occupancy adapter (first real PMS-like source)

**Files:**
- Create: `lib/integrations/adapters/medici-monitor-occupancy.ts`
- Test: `lib/integrations/__tests__/medici-monitor.test.ts` + fixture `fixtures/medici-heatmap.json`

- [ ] **Step 1: Capture the real response shape** — קריאה חיה אחת (עם ה-credentials מהמשתמש):

```bash
curl -s "$MEDICI_MONITOR_BASE_URL/api/occupancy/heatmap?days=14" -H "Authorization: Bearer $MEDICI_MONITOR_KEY" | head -c 2000
```

לשמור את הפלט (מוסתר-סודות) כ-fixture. **אם אין credentials — לעצור ולבקש מהמשתמש; לא להמציא סכמה.**

- [ ] **Step 2: Failing test** — `mapHeatmapToSnapshots(json, hotelId, externalHotelId)` ⇒ `OccupancySnapshot[]` עם `source: 'medici_monitor'`.

- [ ] **Step 3: Implement adapter** — `fetchOccupancy` קורא ל-endpoint עם baseUrl+key מ-config/credentials, מסנן לפי `externalHotelId` שבקונפיג (מיפוי מלון-פנימי ⇒ מלון-Medici), ממפה, ומחזיר. רישום ל-registry.

- [ ] **Step 4: Wire into pipeline write** — פונקציה משותפת `syncOccupancy(hotelId)` ב-`lib/integrations/sync.ts`: מאתרת את מתאם ה-occupancy הפעיל של המלון, קוראת, ו-upsert ל-`hotel_occupancy_daily`; מעדכנת `last_ok_at`/`last_error` ב-`hotel_integrations`.

- [ ] **Step 5: Tests green + live smoke ⇒ Commit** `feat(integrations): medici-monitor occupancy adapter`

---

### Task 7: Pickup/Pace from bookings (Medici bookings adapter + universal fallback)

**Files:**
- Create: `lib/integrations/adapters/medici-bookings.ts` (בסיס: `mediciApi.ts` מ-`ai-travel-agent-platform` — להעתיק את הטיפוסים והחתימות המאומתות)
- Create: `lib/analytics/pickup.ts`
- Test: `lib/analytics/__tests__/pickup.test.ts`

**Interfaces:**
- Produces: `computePickup(snapshots: {stayDate: string; snapshotDate: string; roomsSold: number}[]): PickupMetrics[]` כאשר `PickupMetrics = { stayDate: string; pickup7: number | null; pickup30: number | null; paceVsLastWeek: number | null }`

- [ ] **Step 1: Failing test** — עם דאטה סינתטי: תאריך שהיה 20 חדרים לפני 7 ימים ו-32 היום ⇒ `pickup7 = 12`; תאריך בלי snapshot ישן ⇒ `pickup7 = null`.

```ts
import { describe, it, expect } from 'vitest'
import { computePickup } from '../pickup'

describe('pickup computation', () => {
  it('computes 7-day pickup per stay date', () => {
    const rows = [
      { stayDate: '2026-08-14', snapshotDate: '2026-06-28', roomsSold: 20 },
      { stayDate: '2026-08-14', snapshotDate: '2026-07-05', roomsSold: 32 },
    ]
    const m = computePickup(rows)
    expect(m[0]).toMatchObject({ stayDate: '2026-08-14', pickup7: 12 })
  })
  it('returns null when no prior snapshot exists', () => {
    const m = computePickup([{ stayDate: '2026-08-14', snapshotDate: '2026-07-05', roomsSold: 5 }])
    expect(m[0].pickup7).toBeNull()
  })
})
```

- [ ] **Step 2: Implement `computePickup`** — pure function; לכל stayDate: snapshot אחרון, snapshot בן ≥7 ימים, ≥30 ימים; pace = pickup7 הנוכחי מול pickup7 של אותו stayDate לפני שבוע (אם קיים).

- [ ] **Step 3: Bookings source** — `medici-bookings.ts`: `fetchBookings(ctx, from, to)` מול medici-backend (טיפוסים מ-`mediciApi.ts`); כותב `pickup_snapshots` יומי (rooms_sold מצטבר לכל stay_date). Fallback אוניברסלי: טבלת `bookings` הקיימת (מהייבוא הידני) מזינה את אותם snapshots — פונקציה `snapshotFromLocalBookings(hotelId)`.

- [ ] **Step 4: Cron hook** — בתוך הצינור היומי (Task 9) נקרא `snapshotPickup(hotelId)` שרץ על המקור הפעיל.

- [ ] **Step 5: Tests green ⇒ Commit** `feat(analytics): pickup/pace computation from booking snapshots`

---

### Task 8: Replace the two mock agents with real data

**Files:**
- Modify: `lib/agents/cbs-tourism-agent.ts` (או השם בפועל — `grep -rn "simulated" lib/agents`), `lib/agents/news-sentiment-agent.ts`
- Test: `lib/agents/__tests__/cbs-tourism.test.ts`

- [ ] **Step 1: CBS real data** — data.gov.il CKAN API (`https://data.gov.il/api/3/action/datastore_search`) על משאב תיירות/לינות רלוונטי. צעד ראשון: לזהות resource_id מתאים (חיפוש ב-portal: "לינות בבתי מלון" / "תיירות"), לתעד אותו בקובץ. אם אין משאב עדכני שמיש — **להוריד את משקל הסוכן ל-0 ב-orchestrator ולסמן `dataSource: 'disabled'`** (עדיף כנות מפברוק). המימוש: fetch + cache ל-`external_data_cache` הקיימת (TTL 24h) + מיפוי לפורמט שהסוכן כבר מחזיר.

- [ ] **Step 2: News real data** — אם קיים `TAVILY_API_KEY` (כבר load-bearing בריפו): חיפוש Tavily על שם העיר/אזור המלון בעברית ואנגלית (`tourism {city}`, `hotels {city} news`), ניקוד סנטימנט פשוט מבוסס מילון (קיים code דומה ב-agent — לחבר אותו לתוצאות אמיתיות במקום ל-mock scenarios). אם אין key — משקל 0 + `disabled`.

- [ ] **Step 3: Contract test** — הטסט מוודא: (א) כשה-API מחזיר תקין ⇒ output בפורמט של הסוכן; (ב) כשה-API נופל ⇒ הסוכן מחזיר `confidence: 0` ולא דאטה מומצא. Mock ל-fetch עם `vi.stubGlobal`.

- [ ] **Step 4: Verify no fabricated fallbacks remain**

```bash
grep -rn "simulated\|realistic mock\|Math.random" lib/agents --include='*.ts' | grep -v __tests__
```

Expected: אפס תוצאות בסוכני דאטה (Trends agent random-fallback מטופל כאן גם: fallback ⇒ confidence 0).

- [ ] **Step 5: Commit** `fix(agents): real CBS + news data or honest disable; no fabricated inputs to pricing`

---

### Task 9: The daily pipeline — one chained cron per hotel

**Files:**
- Create: `app/api/cron/daily-pipeline/route.ts`, `lib/pipeline/daily.ts`
- Modify: `vercel.json` (החלפת auto-scan/update-predictions cron ביעד אחד; monitor-scan נשאר)
- Test: `lib/pipeline/__tests__/daily.test.ts`

**Interfaces:**
- Produces: `runDailyPipeline(hotelId: string, opts?: { horizonDays?: number }): Promise<PipelineReport>` כאשר `PipelineReport = { hotelId: string; steps: Array<{ name: string; ok: boolean; count?: number; error?: string }> }`

- [ ] **Step 1: Failing test** — עם מתאמים מדומים (in-memory): הצינור מריץ את הצעדים בסדר `rate_shop ⇒ occupancy ⇒ pickup ⇒ predict ⇒ log`, ממשיך גם כשצעד נכשל (מדווח `ok: false`), ומחזיר report מלא.

- [ ] **Step 2: Implement `lib/pipeline/daily.ts`** — לכל מלון פעיל: 
  1. `rateShop` — סריקת comp-set ל-N תאריכים קדימה (ברירת מחדל 90, config פר-מלון) ⇒ `competitor_daily_prices` + `daily_prices`
  2. `occupancy` — `syncOccupancy(hotelId)` (Task 6)
  3. `pickup` — `snapshotPickup(hotelId)` (Task 7)
  4. `predict` — קריאה לפונקציית החיזוי הקיימת (`predictPrice` / orchestrator) לכל תאריך ⇒ `price_predictions` + `prediction_logs`
  5. `diff` — `detectMarketChanges(hotelId)` (Task 10)
  
  כל צעד ב-try/catch עצמאי; כתיבת report ל-`scan_logs`.

- [ ] **Step 3: Route + cron** — `daily-pipeline/route.ts` עם `requireCronAuth`, לולאה על מלונות פעילים (סדרתי, עם timeout פר-מלון). עדכון `vercel.json`: cron יומי `0 3 * * *` ליעד החדש; הסרת היעדים שהוא מחליף.

- [ ] **Step 4: Live run once**

```bash
curl -s -X POST https://<prod-url>/api/cron/daily-pipeline -H "Authorization: Bearer $CRON_SECRET" | jq .
```

Expected: report עם `ok: true` לצעדים שיש להם אינטגרציה פעילה.

- [ ] **Step 5: Commit** `feat(pipeline): chained daily pipeline per hotel (scan->occupancy->pickup->predict->diff)`

---

### Task 10: Diff loop — continuous market-change detection

**Files:**
- Create: `lib/pipeline/market-diff.ts`
- Test: `lib/pipeline/__tests__/market-diff.test.ts`

**Interfaces:**
- Produces: `detectMarketChanges(hotelId: string, thresholdPct?: number): Promise<MarketChange[]>` — משווה את הסריקה האחרונה לקודמתה פר מתחרה+תאריך

- [ ] **Step 1: Failing test** — pure core: `diffRates(prev: CompetitorRate[], curr: CompetitorRate[], thresholdPct)`:
  - מתחרה שעלה מ-500 ל-560 עם סף 10% ⇒ change אחד (`pct_change: 12`)
  - שינוי של 3% מתחת לסף ⇒ אין change
  - available ⇒ soldout ⇒ `competitor_soldout` change

- [ ] **Step 2: Implement** — `diffRates` pure + `detectMarketChanges` שקורא שתי סריקות אחרונות מ-`competitor_daily_prices`, כותב `market_changes`, ולכל change: מדליק חישוב חיזוי מחדש לתאריך המושפע (קריאה ישירה לפונקציית predict של תאריך בודד) ומסמן `reprediction_triggered: true`. התראה: insert ל-`pricing_alerts` הקיימת.

- [ ] **Step 3: Wire** — נקרא מסוף ה-pipeline (Task 9) וגם מ-webhook ה-Apify הקיים (`app/api/webhooks/apify/route.ts`) כך שסריקה אמצע-יום מפעילה diff מיידי.

- [ ] **Step 4: Tests green ⇒ Commit** `feat(pipeline): market diff loop with immediate reprediction on significant changes`

---

### Task 11: Integrations API + minimal UI

**Files:**
- Create: `app/api/integrations/route.ts` (GET list per hotel, POST create), `app/api/integrations/[id]/route.ts` (PATCH enable/disable + config, DELETE), `app/api/integrations/[id]/test/route.ts` (בדיקת חיבור)
- Create: `app/integrations/page.tsx` (פירוט ב-ui-upgrade plan, Task U3)

- [ ] **Step 1: API routes** — כולם עם `requireUser`; credentials נכנסים דרך `encryptCredentials` ולעולם לא חוזרים ב-GET (רק `hasCredentials: true`). `test` route מריץ קריאת sanity של המתאם (fetch קטן) ומעדכן `last_ok_at`/`last_error`.

- [ ] **Step 2: Contract verification with curl** — יצירה, רשימה (בלי secrets), test, disable — כולם עובדים עם סשן; 401 בלי.

- [ ] **Step 3: Commit** `feat(integrations): CRUD + connection-test API`

---

### Task 12: Phase acceptance — two hotels in parallel

**קריטריון הקבלה של כל השלב (מהספק):** שני מלונות — אחד עם מתאמי Medici, אחד "ידני" (Excel + Advisory) — רצים 7 ימים רצופים, מבודדים ב-RLS, עם דאטה יומי מלא.

- [ ] **Step 1: Seed hotel B** — מלון שני ב-DB עם org נפרד + משתמש נפרד; העלאת occupancy CSV; comp-set משלו.
- [ ] **Step 2: RLS isolation test** — משתמש של org A מבקש דאטה של מלון B דרך ה-API ⇒ ריק/403. לתעד את הבדיקה כ-script ב-`scripts/verify-rls.mjs`.
- [ ] **Step 3: 7-day soak** — לתזמן בדיקה יומית (`scan_logs` + `daily_prices` + `price_predictions` גדלים יום-יום לשני המלונות). דוח מסכם ב-`docs/plan/phase1-soak-report.md`.
- [ ] **Step 4: Phase review** — code review מודל חזק על ה-diff; merge; עדכון STATE.md; כתיבת תוכנית שלב 2.
