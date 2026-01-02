"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  SettingsIcon, 
  SaveIcon, 
  Loader2Icon,
  CheckCircleIcon,
  AlertTriangleIcon,
  DollarSignIcon,
  BedIcon
} from "lucide-react"

interface Hotel {
  id: string
  name: string
  total_rooms: number
  base_price: number
  min_price?: number
  max_price?: number
}

interface Props {
  hotels: Hotel[]
}

export function RulesClient({ hotels }: Props) {
  const [selectedHotelId, setSelectedHotelId] = useState(hotels[0]?.id || '')
  const [editedHotels, setEditedHotels] = useState<Record<string, Partial<Hotel>>>({})
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const selectedHotel = hotels.find(h => h.id === selectedHotelId)
  const editedData = editedHotels[selectedHotelId] || {}
  
  const currentData = {
    total_rooms: editedData.total_rooms ?? selectedHotel?.total_rooms ?? 0,
    base_price: editedData.base_price ?? selectedHotel?.base_price ?? 0,
    min_price: editedData.min_price ?? selectedHotel?.min_price ?? 0,
    max_price: editedData.max_price ?? selectedHotel?.max_price ?? 0,
  }

  const hasChanges = Object.keys(editedHotels).length > 0

  const updateField = (field: keyof Hotel, value: number) => {
    setEditedHotels(prev => ({
      ...prev,
      [selectedHotelId]: {
        ...prev[selectedHotelId],
        [field]: value
      }
    }))
    setSaveSuccess(null)
    setSaveError(null)
  }

  const handleSave = async () => {
    if (!hasChanges) return

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)

    try {
      const updates = Object.entries(editedHotels).map(([hotelId, changes]) => ({
        id: hotelId,
        ...changes
      }))

      const response = await fetch('/api/hotels/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })

      if (!response.ok) {
        throw new Error('Failed to save changes')
      }

      setSaveSuccess('כל השינויים נשמרו בהצלחה!')
      setEditedHotels({})
      
      // Refresh page after 2 seconds
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Error saving:', error)
      setSaveError('שגיאה בשמירת השינויים. נסה שוב.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setEditedHotels({})
    setSaveSuccess(null)
    setSaveError(null)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <SettingsIcon className="h-10 w-10 text-blue-400" />
            Rules & Settings
          </h1>
          <p className="text-slate-400 mt-2">הגדרות והכללים למלונות - כמות חדרים ומחירים</p>
        </div>
        {hasChanges && (
          <Badge variant="outline" className="text-orange-400 border-orange-400">
            שינויים לא שמורים
          </Badge>
        )}
      </div>

      {/* Hotel Selector */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-slate-300 mb-2 block">בחר מלון לעריכה</Label>
              <select
                value={selectedHotelId}
                onChange={(e) => setSelectedHotelId(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                {hotels.map((hotel) => (
                  <option key={hotel.id} value={hotel.id}>
                    {hotel.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <span className="text-green-300 font-medium">{saveSuccess}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {saveError && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangleIcon className="h-5 w-5 text-red-400" />
              <span className="text-red-300 font-medium">{saveError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Grid */}
      {selectedHotel && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total Rooms */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BedIcon className="h-5 w-5 text-blue-400" />
                כמות חדרים כוללת
              </CardTitle>
              <CardDescription>
                המספר הכולל של החדרים במלון
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">מספר חדרים</Label>
                <Input
                  type="number"
                  min="1"
                  value={currentData.total_rooms}
                  onChange={(e) => updateField('total_rooms', parseInt(e.target.value) || 0)}
                  className="bg-slate-800 border-slate-700 text-white text-2xl font-bold"
                />
              </div>
              {editedData.total_rooms !== undefined && (
                <div className="text-sm text-slate-400">
                  ערך קודם: <span className="font-bold">{selectedHotel.total_rooms}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Base Price */}
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSignIcon className="h-5 w-5 text-green-400" />
                מחיר בסיס
              </CardTitle>
              <CardDescription>
                המחיר הבסיסי לחדר ללילה
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">מחיר בסיס (₪)</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={currentData.base_price}
                  onChange={(e) => updateField('base_price', parseInt(e.target.value) || 0)}
                  className="bg-slate-800 border-slate-700 text-white text-2xl font-bold"
                />
              </div>
              {editedData.base_price !== undefined && (
                <div className="text-sm text-slate-400">
                  ערך קודם: <span className="font-bold">₪{selectedHotel.base_price}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Min Price */}
          <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSignIcon className="h-5 w-5 text-orange-400" />
                מחיר מינימום
              </CardTitle>
              <CardDescription>
                המחיר המינימלי המותר (Floor Price)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">מחיר מינימום (₪)</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={currentData.min_price}
                  onChange={(e) => updateField('min_price', parseInt(e.target.value) || 0)}
                  className="bg-slate-800 border-slate-700 text-white text-2xl font-bold"
                />
              </div>
              {editedData.min_price !== undefined && (
                <div className="text-sm text-slate-400">
                  ערך קודם: <span className="font-bold">₪{selectedHotel.min_price || 0}</span>
                </div>
              )}
              <div className="text-xs text-slate-500 bg-slate-800/50 p-2 rounded">
                💡 המחיר לא ירד מתחת לסכום זה בשום מצב
              </div>
            </CardContent>
          </Card>

          {/* Max Price */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSignIcon className="h-5 w-5 text-purple-400" />
                מחיר מקסימום
              </CardTitle>
              <CardDescription>
                המחיר המקסימלי המותר (Ceiling Price)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">מחיר מקסימום (₪)</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={currentData.max_price}
                  onChange={(e) => updateField('max_price', parseInt(e.target.value) || 0)}
                  className="bg-slate-800 border-slate-700 text-white text-2xl font-bold"
                />
              </div>
              {editedData.max_price !== undefined && (
                <div className="text-sm text-slate-400">
                  ערך קודם: <span className="font-bold">₪{selectedHotel.max_price || 0}</span>
                </div>
              )}
              <div className="text-xs text-slate-500 bg-slate-800/50 p-2 rounded">
                💡 המחיר לא יעלה מעל סכום זה בשום מצב
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {hasChanges ? (
                <span className="text-orange-400 font-medium">
                  יש שינויים שלא נשמרו ב-{Object.keys(editedHotels).length} מלונות
                </span>
              ) : (
                <span>אין שינויים</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleReset}
                disabled={!hasChanges || saving}
                variant="outline"
                className="border-slate-700"
              >
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {saving ? (
                  <>
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <SaveIcon className="h-4 w-4 mr-2" />
                    שמור שינויים
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300 space-y-1">
              <p className="font-medium">💡 שים לב:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-200">
                <li>השינויים ייכנסו לתוקף מיידית לאחר השמירה</li>
                <li>כל החישובים והתחזיות יעודכנו אוטומטית</li>
                <li>מחיר המינימום ישמש כ-Floor Price בכל המערכת</li>
                <li>כמות החדרים משפיעה על חישוב תפוסה והכנסות</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
