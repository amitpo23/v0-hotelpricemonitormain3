# מצב המערכת — מקור אמת יחיד

עודכן: 2026-07-05 | ענף עבודה: rms-phase0

## מה זה
פלטפורמת ניטור מחירים וניהול תשואה למלונות (Next.js 15 + Supabase + Apify).
המפרט המלא: `docs/superpowers/specs/2026-07-04-rms-master-plan.md`
תוכניות הביצוע: `docs/superpowers/plans/`

## סטטוס תת-מערכות (נכון לסוף שלב 0)
| תת-מערכת | מצב | הערות |
|---|---|---|
| דיפלוי (Vercel) | ✅ ירוק | תוקן lockfile; force-dynamic |
| אבטחת API | ✅ בסיסית | middleware מאמת JWT מול Supabase; CRON_SECRET מחייב |
| מנוע חיזוי פקטוריאלי | ✅ עובד | lib/prediction-algorithms.ts + Decision Agent |
| סריקת מתחרים | ⚠️ חלקית | DirectURL→Tavily בלבד; מתאם Apify מלא בשלב 1 |
| סוכני דאטה | ⚠️ 8/10 אמיתיים | CBS + News עדיין mock — מוחלפים בשלב 1 |
| צינור דאטה יומי | ❌ טרם | נבנה בשלב 1 (daily-pipeline) |
| תפוסה/Pickup | ❌ אין מקור | Integration Hub בשלב 1 |
| Autopilot | ⚠️ נעול | דורש auth; דחיפה אמיתית לערוצים בשלב 4 |
| למידה (feedback) | ⚠️ קוד קיים | מורעב מדאטה עד שהצינור ירוץ |
| טסטים/CI | ✅ | 47 טסטים + GitHub Actions |

## מסד נתונים
- Supabase: פרויקט `supabase-yellow-candle` (חינמי, us-east-1), הוקם 2026-07-05 אחרי שהפרויקטים המקוריים נמחקו. סכמה מלאה במיגרציות; RLS פעיל.

## איפה מה
- ארכיון סקריפטים חד-פעמיים: `scripts/archive/`
- ארכיון מסמכים היסטוריים: `docs/archive/`
- מיגרציות DB: `supabase/migrations/`
