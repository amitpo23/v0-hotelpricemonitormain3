"use client"

import { useState } from "react"
import { HelpCircle, BookOpen, TrendingUp, DollarSign, Users, Calendar, Target, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface MetricDefinition {
  term: string
  category: string
  icon: any
  definition: string
  formula?: string
  example?: string
  tips?: string[]
}

const metricsGlossary: MetricDefinition[] = [
  // Predictions & Confidence
  {
    term: "Confidence Score",
    category: "חיזויים",
    icon: Target,
    definition: "רמת הביטחון בחיזוי המחיר - מבוססת על איכות ועדכניות הנתונים",
    formula: "איכות נתונים (25) + עדכניות (20) + היסטוריה (20) + מתחרים (15) + הזמנות (10) + שוק (10) = 100",
    example: "84% = רמת ביטחון גבוהה מאוד. החיזוי מבוסס על נתונים איכותיים ועדכניים",
    tips: [
      "80-100: ביטחון גבוה מאוד - המלצה חזקה",
      "65-79: ביטחון גבוה - המלצה סבירה",
      "45-64: ביטחון בינוני - שקול בזהירות",
      "0-44: ביטחון נמוך - דרוש מידע נוסף"
    ]
  },
  {
    term: "Predicted Price",
    category: "חיזויים",
    icon: DollarSign,
    definition: "המחיר המומלץ ללילה על בסיס 8 אג'נטים: עונתיות, ביקוש, מתחרים, אירועים, מזג אוויר, תקציב, סטטיסטיקה, טרנדים",
    formula: "מחיר בסיס × עונתיות × ביקוש × אירועים + התאמה מתחרים + לחץ תקציבי",
    example: "₪850 = ₪550 (בסיס) × 1.2 (עונה גבוהה) × 1.15 (ביקוש) + ₪50 (מתחרים)",
    tips: [
      "מעוגל ל-5 ש\"ח הקרובים",
      "מתחשב במחירי מתחרים בזמן אמת",
      "מגיב לאירועים מקומיים (פריידים, חגים)"
    ]
  },
  {
    term: "Predicted Demand",
    category: "חיזויים",
    icon: TrendingUp,
    definition: "רמת הביקוש הצפויה - high/medium/low",
    formula: "מבוסס על: תפוסה היסטורית + מגמות Google + אירועים + יום בשבוע + עונה",
    example: "High = סוף שבוע + פסטיבל פרייד + עונת קיץ",
    tips: [
      "High: הזדמנות להעלות מחירים",
      "Medium: שמור על מחיר שוק",
      "Low: שקול הנחות למילוי תפוסה"
    ]
  },
  
  // Revenue Metrics
  {
    term: "Revenue (הכנסות)",
    category: "הכנסות",
    icon: DollarSign,
    definition: "סך ההכנסות הצפויות מחדרים",
    formula: "מחיר לילה × מספר חדרים × אחוז תפוסה × מספר ימים",
    example: "₪348,985 = ₪850 × 35 חדרים × 75% תפוסה × 30 ימים",
    tips: [
      "משתמש באותה נוסחה בכל המערכת",
      "תפוסה מבוססת על נתונים היסטוריים",
      "לא כולל הכנסות נוספות (ספא, מסעדה)"
    ]
  },
  {
    term: "Current Revenue",
    category: "הכנסות",
    icon: DollarSign,
    definition: "הכנסות צפויות לפי מחירים נוכחיים",
    formula: "מחיר חיזוי נוכחי × חדרים × תפוסה היסטורית",
    example: "₪348,985 לחודש בתעריף נוכחי",
    tips: [
      "מבוסס על חיזויים קיימים במערכת",
      "משתמש בתפוסה היסטורית מאותו תאריך אשתקד"
    ]
  },
  {
    term: "Forecasted Revenue",
    category: "הכנסות",
    icon: TrendingUp,
    definition: "הכנסות צפויות עם המלצות Autopilot",
    formula: "מחיר מומלץ × חדרים × תפוסה צפויה משופרת",
    example: "₪374,134 לחודש עם אופטימיזציה",
    tips: [
      "כולל התאמות מחיר דינמיות",
      "לוקח בחשבון ביקוש צפוי",
      "מבוסס על Multi-Agent Analysis"
    ]
  },
  {
    term: "Revenue Increase",
    category: "הכנסות",
    icon: TrendingUp,
    definition: "הפרש בין הכנסות נוכחיות לצפויות",
    formula: "Forecasted Revenue - Current Revenue",
    example: "+₪25,149 (7.2% עלייה)",
    tips: [
      "חיובי = פוטנציאל לשיפור",
      "מעל 10% = בדוק זהירות לפני יישום",
      "שקלל מול סיכונים"
    ]
  },
  
  // Occupancy
  {
    term: "Occupancy Rate (תפוסה)",
    category: "תפוסה",
    icon: Users,
    definition: "אחוז החדרים התפוסים",
    formula: "(חדרים מלאים / סה\"כ חדרים) × 100",
    example: "75% = 26 מתוך 35 חדרים מלאים",
    tips: [
      "65% = תפוסה ממוצעת בישראל",
      "85%+ = תפוסה גבוהה - הזדמנות להעלות מחיר",
      "מתחת ל-50% = שקול הנחות"
    ]
  },
  {
    term: "Expected Occupancy",
    category: "תפוסה",
    icon: Calendar,
    definition: "תפוסה צפויה לתאריך מסוים",
    formula: "תפוסה היסטורית × מכפיל ביקוש × בונוס (סופ\"ש/חגים)",
    example: "85% = 65% (היסטורי) × 1.15 (ביקוש) × 1.12 (סופ\"ש)",
    tips: [
      "מבוסס על אותו תאריך אשתקד",
      "מותאם לאירועים ומגמות נוכחיות",
      "מקסימום 95% (להשאיר מרווח למצבי חירום)"
    ]
  },
  
  // Budget & Performance
  {
    term: "Budget Gap",
    category: "תקציב",
    icon: Target,
    definition: "הפרש בין יעד ההכנסות להכנסות בפועל",
    formula: "יעד חודשי - (הכנסות בפועל + הזמנות עתידיות)",
    example: "-₪50,000 = חסר 50 אלף להשלמת יעד החודש",
    tips: [
      "שלילי = חסר - צריך להגביר פעילות",
      "חיובי = עודף - מצוין!",
      "מחושב מדי יום"
    ]
  },
  {
    term: "Daily Revenue Needed",
    category: "תקציב",
    icon: Calendar,
    definition: "הכנסה יומית נדרשת להשלמת יעד החודש",
    formula: "Budget Gap / ימים שנותרו בחודש",
    example: "₪5,000 ליום = 50,000 / 10 ימים נותרים",
    tips: [
      "מתעדכן כל יום",
      "משפיע על המלצות מחיר",
      "בימים אחרונים - לחץ גבוה יותר"
    ]
  },
  
  // Risk Assessment
  {
    term: "Risk Level",
    category: "סיכון",
    icon: AlertCircle,
    definition: "רמת הסיכון ביישום ההמלצות",
    formula: "מבוסס על: גודל שינוי מחיר + תקופת ביקוש + נתונים היסטוריים",
    example: "Medium = שינוי של 15% במחיר בתקופת ביקוש רגילה",
    tips: [
      "Low: בטוח ליישום מלא",
      "Medium: יישום זהיר + מעקב",
      "High: יישום הדרגתי בלבד"
    ]
  },
  
  // Data Sources
  {
    term: "Scan Results",
    category: "מקורות נתונים",
    icon: BookOpen,
    definition: "מחירים של מתחרים מ-Apify/Bright Data",
    example: "500 תוצאות סריקה מ-50 מלונות בשבוע האחרון",
    tips: [
      "מתעדכן אוטומטית כל יומיים",
      "כולל מגוון סוגי חדרים",
      "נחוץ לדיוק גבוה"
    ]
  },
  {
    term: "CBS Tourism Data",
    category: "מקורות נתונים",
    icon: Users,
    definition: "נתוני תיירות רשמיים מהלמ\"ס",
    example: "תפוסה לאומית 68%, ממוצע מחיר ₪580",
    tips: [
      "נתונים רשמיים מהימנים",
      "מתעדכנים חודשית",
      "משמשים ל-benchmark"
    ]
  }
]

export function MetricsGlossary() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  const categories = Array.from(new Set(metricsGlossary.map(m => m.category)))
  
  const filteredMetrics = metricsGlossary.filter(metric => {
    const matchesSearch = metric.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         metric.definition.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || metric.category === selectedCategory
    return matchesSearch && matchesCategory
  })
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          <HelpCircle className="w-4 h-4" />
          <span>מילון מונחים</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-700" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-400" />
            מילון מונחים - הסבר מושגים
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            הסבר מפורט על כל המדדים והחישובים במערכת
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div>
            <Input
              type="text"
              placeholder="חפש מונח..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          
          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                !selectedCategory 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              הכל ({metricsGlossary.length})
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {category} ({metricsGlossary.filter(m => m.category === category).length})
              </button>
            ))}
          </div>
          
          {/* Metrics list */}
          <div className="space-y-3">
            {filteredMetrics.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                לא נמצאו תוצאות לחיפוש "{searchTerm}"
              </div>
            ) : (
              filteredMetrics.map((metric, index) => {
                const Icon = metric.icon
                return (
                  <div key={index} className="bg-gray-800 rounded-lg p-4 space-y-2">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <Icon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{metric.term}</h3>
                          <span className="text-xs text-gray-500">{metric.category}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Definition */}
                    <p className="text-gray-300 text-sm">{metric.definition}</p>
                    
                    {/* Formula */}
                    {metric.formula && (
                      <div className="bg-gray-900/50 rounded p-2">
                        <div className="text-xs text-gray-500 mb-1">נוסחה:</div>
                        <div className="text-sm text-blue-300 font-mono">{metric.formula}</div>
                      </div>
                    )}
                    
                    {/* Example */}
                    {metric.example && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
                        <div className="text-xs text-gray-500 mb-1">דוגמה:</div>
                        <div className="text-sm text-green-300">{metric.example}</div>
                      </div>
                    )}
                    
                    {/* Tips */}
                    {metric.tips && metric.tips.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">💡 טיפים:</div>
                        <ul className="text-sm text-gray-400 space-y-0.5">
                          {metric.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-blue-400">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Quick help button for specific metric
 */
export function QuickHelp({ term }: { term: string }) {
  const metric = metricsGlossary.find(m => 
    m.term.toLowerCase() === term.toLowerCase()
  )
  
  if (!metric) return null
  
  const Icon = metric.icon
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center text-gray-400 hover:text-blue-400 transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-gray-900 border-gray-700" dir="rtl">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-lg">{metric.term}</h3>
          </div>
          <p className="text-gray-300">{metric.definition}</p>
          {metric.formula && (
            <div className="bg-gray-800 rounded p-2">
              <div className="text-xs text-gray-500 mb-1">נוסחה:</div>
              <div className="text-sm text-blue-300 font-mono">{metric.formula}</div>
            </div>
          )}
          {metric.example && (
            <div className="bg-green-500/10 rounded p-2">
              <div className="text-xs text-gray-500 mb-1">דוגמה:</div>
              <div className="text-sm text-green-300">{metric.example}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
