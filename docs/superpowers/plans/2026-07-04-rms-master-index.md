# RMS Implementation — Master Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement plan-by-plan, task-by-task. Do NOT skip ahead: each plan assumes the previous one is complete and verified.

**Goal:** להפוך את v0-hotelpricemonitormain3 לפלטפורמת RMS רב-מלונאית מלאה לפי `docs/superpowers/specs/2026-07-04-rms-master-plan.md`.

**Spec:** `docs/superpowers/specs/2026-07-04-rms-master-plan.md` (v2, מאושר 2026-07-04)

## סדר הביצוע

| # | תוכנית | קובץ | סטטוס | תלוי ב- |
|---|--------|------|-------|---------|
| 1 | שלב 0: ייצוב וחזרה לאוויר | `2026-07-04-phase0-stabilization.md` | מוכן לביצוע | — |
| 2 | שלב 1: Integration Hub + רב-מלונאות | `2026-07-04-phase1-integration-hub.md` | מוכן לביצוע | שלב 0 |
| 3 | מסלול UI (רץ במקביל, משויך לשלבים) | `2026-07-04-ui-upgrade.md` | מוכן לביצוע | שלב 0; חלקים לפי שלבים |
| 4 | שלב 2: חיזוי — עונתיות/YoY + איחוד מוחות | ייכתב בתום שלב 1 | ממתין | שלב 1 |
| 5 | שלב 3: אופטימיזציה — elasticity + revenue max | ייכתב בתום שלב 2 | ממתין | שלב 2 |
| 6 | שלב 4: פעולה — PricePusher + Autopilot מדורג | ייכתב בתום שלב 3 | ממתין | שלב 3 |
| 7 | שלב 5: למידה — feedback על דאטה אמיתי | ייכתב בתום שלב 4 | ממתין | שלב 4 |
| 8 | שלב 6: קוקפיט סופי + onboarding | חלק מ-ui-upgrade + תוכנית סגירה | ממתין | שלב 5 |

**למה שלבים 2–6 עוד לא מפורטים:** הם תלויים בעובדות שיתגלו רק אחרי ששלבים 0–1 רצים (איכות דאטה אמיתית, סכמות ה-APIs של Medici בפועל, ביצועי ה-Apify actor). תכנון מפורט עכשיו = תכנון על הנחות. בתום כל שלב — כותבים את התוכנית המפורטת של הבא בתור, באותו פורמט.

## מודל הביצוע לסוכן

1. עבודה על branch: `git checkout -b rms-phase0` (וכן הלאה `rms-phase1`...)
2. משימה אחת בכל פעם, לפי הסדר. כל משימה מסתיימת ב: אימות ירוק (פקודה + פלט צפוי) ⇒ commit
3. **אסור** לסמן משימה כהושלמה אם האימות נכשל — עוצרים ומדווחים
4. בסוף כל תוכנית: `pnpm test && pnpm build` ירוקים + code review (מודל חזק) על ה-diff המצטבר לפני merge
5. **חוקי ברזל:** אין נגיעה ב-production secrets; אין שינוי מחירים אמיתי (Autopilot נשאר Shadow עד שלב 4); כל שינוי DB דרך קובץ מיגרציה ב-`supabase/migrations/`; אין הוספת תלות חדשה בלי הצדקה במשימה

## עקרונות רוחביים (Global Constraints)

- Node >= 20, pnpm בלבד (package-lock.json נמחק בשלב 0)
- TypeScript strict; `ignoreBuildErrors: false` נשאר כפי שהוא
- כל טבלה חדשה: RLS מופעל + policy לפי `hotel_id`/`org_id` מהמשימה הראשונה
- כל endpoint חדש: אימות סשן או `requireCronAuth` — אין ראוטים אנונימיים חדשים
- דו-לשוניות: כל טקסט UI חדש נכנס דרך מנגנון ה-i18n הקיים (EN/HE), לא מחרוזות קשיחות
- מטבע: ILS כברירת מחדל, שדה `currency` בכל טבלת מחירים
