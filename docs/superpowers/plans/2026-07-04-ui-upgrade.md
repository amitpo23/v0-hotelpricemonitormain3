# UI Upgrade Implementation Plan — "הקוקפיט"

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **תזמון: Task U1–U3 יחד עם Phase 1; U4–U5 אחרי ש-daily-pipeline מזרים דאטה; U6 עם מצב Advisory; U7–U8 בשלב 6.**

**Goal:** לצמצם ~33 דפים (חלקם מציגים דאטה ריק/מומצא) ל-7 מסכים חיים סביב לולאת ההחלטה: קוקפיט ⇒ תאריך ⇒ החלטה ⇒ אישור, ברב-מלונאות מלאה.

**Architecture:** נשארים על ה-stack הקיים — Next.js App Router + Radix/shadcn + Tailwind, דו-לשוני EN/HE (RTL). בורר מלון גלובלי בכל מסך. Server Components לדאטה, Client Components לאינטראקציה. בלי ספריות UI חדשות; heatmap ב-CSS grid.

**Tech Stack:** קיים בלבד: Radix primitives, Tailwind, lucide-react, next-themes.

## Global Constraints

- אף מסך חדש לא מציג דאטה מדומה: אם אין דאטה — Empty State עם הסבר מה לחבר (לינק ל-`/integrations`)
- כל מסך scoped למלון הנבחר; החלפת מלון = URL param `?hotel=<id>` נשמר בניווט
- RTL תקין בעברית: להשתמש ב-logical properties (`ms-`, `me-`, `start`, `end`) בכל קוד חדש
- נגישות: כל אינטראקציה נגישה במקלדת; ניגודיות AA

## מפת המסכים הסופית

| מסך | נתיב | מחליף את | תוכן |
|---|---|---|---|
| קוקפיט | `/dashboard` | dashboard, analytics, trends, market-intel | KPI, לוח-שנה heatmap 90 ימים, פיד התראות/שינויי שוק |
| תאריך (drilldown) | `/dashboard/date/[date]` | חדש | מתחרים, pickup, תחזית, המלצה + הסבר, פעולה |
| החלטות ואישורים | `/decisions` | predictions, agent-decisions, pricing, rules | תור המלצות ממתינות, אישור/דחייה, היסטוריה + הסברי סוכנים |
| Autopilot | `/autopilot` | autopilot, autopilot/new, autopilot/tools | מצב (Shadow/Approval/Auto), מעקות, audit, ROI |
| אינטגרציות | `/integrations` | חדש | חיבורים פר-מלון, בריאות, העלאת Excel |
| מלון והגדרות | `/hotels`, `/hotels/[id]` | hotels, competitors, budget, rules | פרטים, חדרים, comp-set, מעקות מחיר, יעדים |
| למידה | `/insights` | learning, predictions/revenue-impact | דיוק לאורך זמן, משקולות, דוחות שבועיים |
| אדמין | `/admin` | קיים | משתמשים, ארגונים, אישורים |

נמחקים/מנותבים: `alerts` (נבלע בקוקפיט), `bookings` (נבלע במלון/אינטגרציות), `calendar` (הקוקפיט הוא הלוח), `scans` (נבלע באינטגרציות כ"היסטוריית סנכרון"), `competitors/*` (נבלע בהגדרות מלון).

---

### Task U1: Audit + hotel context + navigation shell

**Files:**
- Create: `lib/ui/hotel-context.tsx`, `components/layout/app-shell.tsx`, `docs/plan/ui-audit.md`
- Modify: `app/layout.tsx` (או ה-layout הפנימי הקיים — לקרוא קודם)

- [ ] **Step 1: Audit** — לכל אחד מ-33 הדפים: אילו API endpoints הוא קורא, האם הדאטה חי אחרי Phase 1, החלטה (keep/merge/kill) לפי הטבלה למעלה. לתעד ב-`docs/plan/ui-audit.md`. אם נמצא מסך עם פונקציונליות שאין לה בית בטבלה — לעצור ולשאול.

- [ ] **Step 2: Hotel selector context**

```tsx
// lib/ui/hotel-context.tsx
'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type Hotel = { id: string; name: string }
const HotelCtx = createContext<{ hotels: Hotel[]; current: Hotel | null; setCurrent: (id: string) => void } | null>(null)

export function HotelProvider({ hotels, children }: { hotels: Hotel[]; children: ReactNode }) {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams()
  const fromUrl = params.get('hotel')
  const [current, set] = useState<Hotel | null>(hotels.find(h => h.id === fromUrl) ?? hotels[0] ?? null)
  useEffect(() => {
    const found = hotels.find(h => h.id === fromUrl)
    if (found && found.id !== current?.id) set(found)
  }, [fromUrl, hotels])
  const setCurrent = (id: string) => {
    const sp = new URLSearchParams(params); sp.set('hotel', id)
    router.push(`${pathname}?${sp.toString()}`)
  }
  return <HotelCtx.Provider value={{ hotels, current, setCurrent }}>{children}</HotelCtx.Provider>
}

export function useHotel() {
  const ctx = useContext(HotelCtx)
  if (!ctx) throw new Error('useHotel must be used inside HotelProvider')
  return ctx
}
```

- [ ] **Step 3: App shell** — sidebar עם 8 המסכים (אייקונים מ-lucide), בורר מלון (Radix Select) בראש, בורר שפה קיים. לקרוא קודם את ה-layout/סרגל הקיים — אם יש sidebar, לעדכן אותו במקום לבנות חדש.

- [ ] **Step 4: Verify** — `pnpm dev`; ניווט בין מסכים שומר `?hotel=`; החלפת מלון מרעננת דאטה. **Step 5: Commit** `feat(ui): hotel-scoped app shell and navigation`

---

### Task U2: Shared data components (KPI, EmptyState, Heatmap)

**Files:**
- Create: `components/rms/kpi-card.tsx`, `components/rms/empty-state.tsx`, `components/rms/calendar-heatmap.tsx`
- Test: `components/rms/__tests__/calendar-heatmap.test.tsx` (render logic בלבד, vitest + @testing-library אם קיים; אם לא — לבדוק את פונקציית ה-bucketing כ-pure function)

- [ ] **Step 1: KPI card**

```tsx
// components/rms/kpi-card.tsx
import { type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

export function KpiCard({ label, value, delta, hint, icon }: {
  label: string; value: string; delta?: number | null; hint?: string; icon?: ReactNode
}) {
  const Trend = delta == null ? Minus : delta >= 0 ? ArrowUpRight : ArrowDownRight
  const trendColor = delta == null ? 'text-muted-foreground' : delta >= 0 ? 'text-emerald-600' : 'text-red-600'
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>{icon}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
        <Trend className="h-3 w-3" />
        {delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%` : '—'}
        {hint ? <span className="text-muted-foreground ms-1">{hint}</span> : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Calendar heatmap** — pure bucketing + CSS grid, בלי ספריות:

```tsx
// components/rms/calendar-heatmap.tsx
'use client'
import Link from 'next/link'

export type DayCell = {
  date: string            // YYYY-MM-DD
  demandScore: number | null   // 0..100
  price: number | null
  hasAlert: boolean
}

export function demandBucket(score: number | null): string {
  if (score == null) return 'bg-muted'
  if (score >= 80) return 'bg-red-500/80'
  if (score >= 60) return 'bg-orange-400/80'
  if (score >= 40) return 'bg-yellow-300/80'
  if (score >= 20) return 'bg-emerald-300/70'
  return 'bg-emerald-200/50'
}

export function CalendarHeatmap({ days, hotelId }: { days: DayCell[]; hotelId: string }) {
  return (
    <div className="grid grid-cols-7 gap-1" dir="ltr">
      {days.map(d => (
        <Link key={d.date} href={`/dashboard/date/${d.date}?hotel=${hotelId}`}
          className={`relative rounded-md p-2 min-h-16 border hover:ring-2 ring-primary transition ${demandBucket(d.demandScore)}`}>
          <span className="text-[10px] text-foreground/70">{d.date.slice(8)}/{d.date.slice(5, 7)}</span>
          <div className="text-xs font-semibold tabular-nums">{d.price != null ? `₪${d.price}` : '—'}</div>
          {d.hasAlert && <span className="absolute top-1 end-1 h-2 w-2 rounded-full bg-red-600" />}
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Test bucketing** — `demandBucket(85) === 'bg-red-500/80'`, `demandBucket(null) === 'bg-muted'` וכו'. **Step 4: EmptyState** — קומפוננטה עם אייקון, טקסט דו-לשוני ו-CTA (למשל "חבר מקור תפוסה" ⇒ `/integrations`). **Step 5: Commit** `feat(ui): shared RMS components (KPI, heatmap, empty-state)`

---

### Task U3: Integrations screen (עם Phase 1 Task 11)

**Files:**
- Create: `app/integrations/page.tsx`, `components/integrations/integration-card.tsx`, `components/integrations/occupancy-upload.tsx`

- [ ] **Step 1: Page** — ארבע קטגוריות (תפוסה / מתחרים / דחיפת מחירים / אותות ביקוש); לכל אחת: המתאם הפעיל, סטטוס בריאות (`last_ok_at`/`last_error` — ירוק/אדום + זמן), כפתור "בדוק חיבור" (קורא ל-`/api/integrations/[id]/test`), וכפתור הוספה שמציג את המתאמים הזמינים מ-`listProviders`.
- [ ] **Step 2: Occupancy upload** — קומפוננטת drag&drop ל-CSV/Excel ⇒ `/api/integrations/occupancy/upload` ⇒ מציגה `inserted` + טווח תאריכים + שגיאות פרסינג שורה-שורה.
- [ ] **Step 3: Verify manually** — העלאת ה-fixture CSV מציגה הצלחה ושורות נכנסות ל-DB; חיבור עם credentials שגויים מציג שגיאה אדומה עם `last_error`.
- [ ] **Step 4: Commit** `feat(ui): integrations management screen with health + excel upload`

---

### Task U4: Cockpit dashboard v1

**Files:**
- Create: `app/dashboard/cockpit-data.ts` (server-side aggregation), rewrite `app/dashboard/page.tsx`
- Create: `app/api/dashboard/summary/route.ts`

- [ ] **Step 1: Summary API** — `GET /api/dashboard/summary?hotel=<id>&days=90` (requireUser + scope): מחזיר `{ kpis: { adr, revpar, occupancyRate, forecastAccuracy }, days: DayCell[], alerts: MarketChange[] }`. ADR/RevPAR מ-`hotel_occupancy_daily` + `daily_prices`; demandScore לכל יום מ-`price_predictions` (confidence×demand) ; alerts מ-`market_changes` אחרונים. כל ערך שאין לו דאטה ⇒ `null` (לא 0!).
- [ ] **Step 2: Page** — שורת 4 KPI (KpiCard), heatmap 90 ימים (CalendarHeatmap), פיד שינויי שוק אחרונים (רשימה עם לינק לתאריך). Empty states לכל אזור בנפרד.
- [ ] **Step 3: Verify** — עם מלון שיש לו דאטה מה-pipeline: הכל מוצג; עם מלון טרי: שלושה Empty states עם CTA-ים נכונים. Lighthouse a11y ≥ 90.
- [ ] **Step 4: Commit** `feat(ui): cockpit dashboard v1 (KPIs, demand heatmap, market feed)`

---

### Task U5: Date drilldown — מסך ההחלטה

**Files:**
- Create: `app/dashboard/date/[date]/page.tsx`, `app/api/dashboard/date/[date]/route.ts`, `components/rms/pickup-chart.tsx`

- [ ] **Step 1: Date API** — לכל תאריך: מחירי כל המתחרים (היום + 4 סריקות אחרונות ⇒ מגמה), pickup curve (מ-`pickup_snapshots`), תחזית + פירוק פקטורים (מ-`prediction_logs` — ההסבר של Decision Agent כבר נשמר שם), ההמלצה הפעילה + היסטוריית מחיר.
- [ ] **Step 2: Pickup chart** — SVG פשוט (polyline) ללא ספרייה: ציר X ימים-עד-האירוח, Y חדרים שנמכרו; קו נוסף מקווקו של אותו תאריך שנה שעברה אם קיים.
- [ ] **Step 3: Page layout** — שלושה טורים (בדסקטופ): שוק (טבלת מתחרים + מגמה), המלון (pickup, occupancy, מחיר נוכחי), החלטה (המלצה, הסבר בשפה טבעית מ-decision_logs, כפתורי אישור/עריכה — פעילים רק כשיש המלצה pending).
- [ ] **Step 4: Verify + Commit** `feat(ui): per-date decision drilldown`

---

### Task U6: Decisions queue (Advisory mode עובד כבר עכשיו)

**Files:**
- Create: `app/decisions/page.tsx`, `app/api/decisions/route.ts`, `app/api/decisions/[id]/route.ts`

- [ ] **Step 1: API** — GET רשימת `price_recommendations` במצב `pending_approval` פר-מלון; PATCH `{action: 'approve' | 'reject', overridePrice?}` ⇒ סטטוס `approved`/`rejected` + audit (מי, מתי, מה). ב-Advisory מצב approved = מסומן "ליישום ידני" (המפעיל מעדכן באקסטרנט); כשה-PricePusher החי יגיע (שלב 4) אותו API בדיוק ידחוף באמת.
- [ ] **Step 2: Page** — טבלה ממוינת לפי תאריך: תאריך, מחיר נוכחי, מומלץ, Δ%, ביטחון, הסבר-בקצרה, פעולות. Bulk approve לטווח תאריכים עם אישור כפול.
- [ ] **Step 3: Verify + Commit** `feat(ui): decisions approval queue (advisory mode)`

---

### Task U7: Insights (למידה) + Task U8: מחיקת מסכים ישנים

- [ ] **U7:** `app/insights/page.tsx` — גרף דיוק (MAPE שבועי מ-`prediction_accuracy`), טבלת משקולות פקטורים נוכחיות מול לפני חודש (`factor_weights_history`), ארכיון דוחות שבועיים. Empty state עד שיש 14 ימי דאטה.
- [ ] **U8:** אחרי ש-U1–U7 חיים ואומתו: מחיקת הדפים מהטבלה ("נמחקים/מנותבים") + `next.config.mjs` redirects מהנתיבים הישנים לחדשים; `grep` שאין imports שבורים; `pnpm build` ירוק. Commit: `chore(ui): remove superseded pages, add redirects`

**קריטריון סיום המסלול:** משתמש חדש שנכנס למערכת עם מלון מחובר מגיע מהקוקפיט להחלטת מחיר מאושרת ב-≤3 קליקים; משתמש עם מלון לא-מחובר מגיע ב-≤2 קליקים למסך שמסביר לו בדיוק מה לחבר.
