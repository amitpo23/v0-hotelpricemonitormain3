"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AgentDecisionViewer } from "@/components/agent-decision-viewer"
import { Calendar } from "lucide-react"

export default function AgentDecisionsDemo() {
  const [showDemo, setShowDemo] = useState(false)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">מערכת קבלת החלטות AI Multi-Agent</h1>
          <p className="text-muted-foreground mt-2">
            צפה בתהליך המלא של קבלת החלטת תמחור על ידי 8+ סוכני AI עצמאיים
          </p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle>איך זה עובד?</CardTitle>
          <CardDescription>
            המערכת שלנו משתמשת במודל Multi-Agent AI, כאשר כל סוכן מתמחה בתחום אחר
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl mb-2">💰</div>
              <div className="font-semibold">Budget Agent</div>
              <div className="text-sm text-muted-foreground">ניתוח תקציב ויעדים</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-semibold">Velocity Agent</div>
              <div className="text-sm text-muted-foreground">מהירות הזמנות</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl mb-2">📅</div>
              <div className="font-semibold">Events Agent</div>
              <div className="text-sm text-muted-foreground">אירועים ופסטיבלים</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-semibold">Historical Agent</div>
              <div className="text-sm text-muted-foreground">ניתוח היסטורי</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl mb-2">📈</div>
              <div className="font-semibold">Statistics Agent</div>
              <div className="text-sm text-muted-foreground">נתונים סטטיסטיים</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl mb-2">👥</div>
              <div className="font-semibold">Competitor Agent</div>
              <div className="text-sm text-muted-foreground">מחירי מתחרים</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl mb-2">🌊</div>
              <div className="font-semibold">Seasonality Agent</div>
              <div className="text-sm text-muted-foreground">עונתיות</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl mb-2">🎯</div>
              <div className="font-semibold">Occupancy Agent</div>
              <div className="text-sm text-muted-foreground">תפוסה נוכחית</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
            <p className="text-sm">
              <strong>תהליך קבלת ההחלטה:</strong> כל סוכן מנתח את הנתונים בתחום שלו ומציע המלצה.
              המערכת משקללת את כל ההמלצות לפי רמת הביטחון והרלוונטיות, ומייצרת החלטת מחיר מושכלת ומבוססת נתונים.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            בחר תאריך לצפייה בתהליך קבלת ההחלטה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">תאריך חיזוי</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <Button 
              onClick={() => setShowDemo(true)}
              className="px-6"
            >
              הצג תהליך קבלת החלטה
            </Button>
          </div>

          {showDemo && (
            <div className="mt-6">
              <AgentDecisionViewer
                hotelId="716e1e8f-3537-4f67-875d-de3a89642175"
                predictionDate={selectedDate}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-900">💡 טיפ מקצועי</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-yellow-900">
            <li>• לחץ על כל סוכן כדי לראות את הנימוקים המפורטים שלו</li>
            <li>• שים לב לרמת הביטחון של כל סוכן - ככל שהיא גבוהה יותר, כך ההשפעה שלו על המחיר גדולה יותר</li>
            <li>• סוכן Events יכול להשפיע משמעותית במקרים של כנסים, פסטיבלים או אירועים מיוחדים</li>
            <li>• המערכת מיועדת לספק שקיפות מלאה - כל החלטת מחיר מתועדת וניתנת להסבר</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
