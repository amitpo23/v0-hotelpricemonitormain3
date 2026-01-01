/**
 * Israeli Holidays & Events Agent
 * Fetches Jewish holidays and Israeli national holidays with tourism impact
 */

interface IsraeliHoliday {
  date: string
  name: string
  nameHebrew: string
  type: 'jewish' | 'national' | 'memorial' | 'other'
  impact: 'very_high' | 'high' | 'medium' | 'low'
  tourismImpact: number // 1.0 - 1.4 multiplier
  description: string
  daysObserved: number
}

/**
 * Core Israeli holidays with fixed rules
 * Note: Jewish holidays change dates each year (lunar calendar)
 */
const FIXED_ISRAELI_HOLIDAYS = [
  // National Holidays
  {
    name: 'Independence Day',
    nameHebrew: 'יום העצמאות',
    type: 'national' as const,
    impact: 'very_high' as const,
    tourismImpact: 1.35,
    description: 'Israeli Independence Day - major celebrations, barbecues, fireworks',
    daysObserved: 1,
    month: null, // Varies by Hebrew calendar
  },
  {
    name: 'Memorial Day',
    nameHebrew: 'יום הזיכרון',
    type: 'memorial' as const,
    impact: 'high' as const,
    tourismImpact: 1.1,
    description: 'Remembrance Day for fallen soldiers - solemn observance',
    daysObserved: 1,
    month: null, // Day before Independence Day
  },
  {
    name: 'Holocaust Remembrance Day',
    nameHebrew: 'יום השואה',
    type: 'memorial' as const,
    impact: 'medium' as const,
    tourismImpact: 1.05,
    description: 'Holocaust Memorial Day - memorial ceremonies',
    daysObserved: 1,
    month: null, // Varies
  },
  
  // Jewish Holidays
  {
    name: 'Rosh Hashanah',
    nameHebrew: 'ראש השנה',
    type: 'jewish' as const,
    impact: 'very_high' as const,
    tourismImpact: 1.4,
    description: 'Jewish New Year - most businesses closed, major holiday',
    daysObserved: 2,
    month: null, // September/October (Tishrei 1-2)
  },
  {
    name: 'Yom Kippur',
    nameHebrew: 'יום כיפור',
    type: 'jewish' as const,
    impact: 'very_high' as const,
    tourismImpact: 1.2,
    description: 'Day of Atonement - everything closes, no traffic',
    daysObserved: 1,
    month: null, // 10 days after Rosh Hashanah
  },
  {
    name: 'Sukkot',
    nameHebrew: 'סוכות',
    type: 'jewish' as const,
    impact: 'high' as const,
    tourismImpact: 1.25,
    description: 'Feast of Tabernacles - 7-day holiday, many travel domestically',
    daysObserved: 7,
    month: null, // Tishrei 15-21
  },
  {
    name: 'Passover',
    nameHebrew: 'פסח',
    type: 'jewish' as const,
    impact: 'very_high' as const,
    tourismImpact: 1.4,
    description: 'Peak holiday season - week-long, major domestic travel',
    daysObserved: 7,
    month: null, // Nissan 15-21 (March/April)
  },
  {
    name: 'Shavuot',
    nameHebrew: 'שבועות',
    type: 'jewish' as const,
    impact: 'medium' as const,
    tourismImpact: 1.15,
    description: 'Pentecost - 1-2 day holiday',
    daysObserved: 1,
    month: null, // 50 days after Passover
  },
  {
    name: 'Hanukkah',
    nameHebrew: 'חנוכה',
    type: 'jewish' as const,
    impact: 'medium' as const,
    tourismImpact: 1.15,
    description: 'Festival of Lights - 8 days, businesses mostly open',
    daysObserved: 8,
    month: null, // Kislev 25 - Tevet 2 (December)
  },
  {
    name: 'Purim',
    nameHebrew: 'פורים',
    type: 'jewish' as const,
    impact: 'medium' as const,
    tourismImpact: 1.2,
    description: 'Costume holiday - festive celebrations, especially in Tel Aviv',
    daysObserved: 1,
    month: null, // Adar 14 (February/March)
  },
]

/**
 * Fetch Jewish holidays from Hebcal API
 */
async function fetchHebcalHolidays(year: number): Promise<IsraeliHoliday[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(
        `https://www.hebcal.com/hebcal?v=1&cfg=json&year=${year}&maj=on&min=on&mod=on&nx=on&i=on&o=on&lg=h&s=on`,
        { signal: controller.signal }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn('[HolidaysAgent] Hebcal API error:', response.status)
        return []
      }

      const data = await response.json()
      
      const holidays: IsraeliHoliday[] = []

      data.items?.forEach((item: any) => {
        if (!item.date) return

        const holidayInfo = FIXED_ISRAELI_HOLIDAYS.find(
          h => h.nameHebrew === item.hebrew || h.name.includes(item.title)
        )

        if (holidayInfo) {
          holidays.push({
            date: item.date,
            name: item.title,
            nameHebrew: item.hebrew || holidayInfo.nameHebrew,
            type: holidayInfo.type,
            impact: holidayInfo.impact,
            tourismImpact: holidayInfo.tourismImpact,
            description: holidayInfo.description,
            daysObserved: holidayInfo.daysObserved,
          })
        } else if (item.category === 'holiday') {
          // Fallback for holidays not in our list
          holidays.push({
            date: item.date,
            name: item.title,
            nameHebrew: item.hebrew || item.title,
            type: 'jewish',
            impact: 'low',
            tourismImpact: 1.05,
            description: item.title,
            daysObserved: 1,
          })
        }
      })

      return holidays
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.warn('[HolidaysAgent] Hebcal API timeout')
      }
      throw fetchError
    }
  } catch (error) {
    console.error('[HolidaysAgent] Error fetching from Hebcal:', error)
    return []
  }
}

/**
 * Get estimated holiday dates (fallback when API fails)
 */
function getEstimatedHolidays(year: number): IsraeliHoliday[] {
  // Approximate dates for major holidays (these change yearly - just for fallback)
  const approximations: Record<string, { month: number; day: number }> = {
    'Passover': { month: 4, day: 15 }, // April 15 (approximate)
    'Independence Day': { month: 5, day: 14 }, // May 14 (varies)
    'Shavuot': { month: 6, day: 4 }, // June 4 (varies)
    'Rosh Hashanah': { month: 9, day: 25 }, // September 25 (varies)
    'Yom Kippur': { month: 10, day: 4 }, // October 4 (varies)
    'Sukkot': { month: 10, day: 9 }, // October 9 (varies)
    'Hanukkah': { month: 12, day: 10 }, // December 10 (varies)
    'Purim': { month: 3, day: 14 }, // March 14 (varies)
  }

  const holidays: IsraeliHoliday[] = []

  FIXED_ISRAELI_HOLIDAYS.forEach(holiday => {
    const approx = approximations[holiday.name]
    if (approx) {
      const date = new Date(year, approx.month - 1, approx.day)
      holidays.push({
        date: date.toISOString().split('T')[0],
        name: holiday.name,
        nameHebrew: holiday.nameHebrew,
        type: holiday.type,
        impact: holiday.impact,
        tourismImpact: holiday.tourismImpact,
        description: `${holiday.description} (Estimated date)`,
        daysObserved: holiday.daysObserved,
      })
    }
  })

  return holidays
}

/**
 * Major Tel Aviv events (fixed dates)
 */
function getTelAvivFixedEvents(year: number): IsraeliHoliday[] {
  return [
    {
      date: `${year}-06-01`,
      name: 'Tel Aviv Pride Parade',
      nameHebrew: 'מצעד הגאווה תל אביב',
      type: 'other',
      impact: 'very_high',
      tourismImpact: 1.4,
      description: 'Largest Pride parade in Middle East - 250,000+ attendees',
      daysObserved: 3, // Pride week
    },
    {
      date: `${year}-02-21`,
      name: 'Tel Aviv Marathon',
      nameHebrew: 'מרתון תל אביב',
      type: 'other',
      impact: 'high',
      tourismImpact: 1.25,
      description: 'Major international marathon - 40,000+ runners',
      daysObserved: 1,
    },
    {
      date: `${year}-05-09`,
      name: 'Eurovision Week',
      nameHebrew: 'שבוע האירוויזיון',
      type: 'other',
      impact: 'very_high',
      tourismImpact: 1.45,
      description: 'Eurovision Song Contest (when Israel hosts)',
      daysObserved: 7,
    },
    {
      date: `${year}-08-15`,
      name: 'White Night Tel Aviv',
      nameHebrew: 'לילה לבן תל אביב',
      type: 'other',
      impact: 'high',
      tourismImpact: 1.3,
      description: 'All-night cultural festival - 300,000+ attendees',
      daysObserved: 1,
    },
  ]
}

/**
 * Main function: Get all holidays and events for a date range
 */
export async function getIsraeliHolidays(
  startDate: string,
  endDate: string
): Promise<Map<string, IsraeliHoliday[]>> {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const years = new Set<number>()

  // Collect all years in range
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    years.add(d.getFullYear())
  }

  console.log(`[HolidaysAgent] Fetching holidays for years: ${Array.from(years).join(', ')}`)

  const holidayMap = new Map<string, IsraeliHoliday[]>()

  try {
    // Fetch holidays for each year
    const promises = Array.from(years).map(async (year) => {
      const hebcalHolidays = await fetchHebcalHolidays(year)
      const telAvivEvents = getTelAvivFixedEvents(year)
      
      return [...hebcalHolidays, ...telAvivEvents]
    })

    const allHolidays = (await Promise.all(promises)).flat()

    // Filter to date range and organize by date
    allHolidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date)
      
      // Add holiday for each day it's observed
      for (let i = 0; i < holiday.daysObserved; i++) {
        const observanceDate = new Date(holidayDate)
        observanceDate.setDate(observanceDate.getDate() + i)
        
        if (observanceDate >= start && observanceDate <= end) {
          const dateStr = observanceDate.toISOString().split('T')[0]
          
          if (!holidayMap.has(dateStr)) {
            holidayMap.set(dateStr, [])
          }
          
          // Add day indicator for multi-day holidays
          const dayIndicator = holiday.daysObserved > 1 ? ` (Day ${i + 1}/${holiday.daysObserved})` : ''
          
          holidayMap.get(dateStr)!.push({
            ...holiday,
            name: holiday.name + dayIndicator,
            date: dateStr,
          })
        }
      }
    })

    console.log(`[HolidaysAgent] Found ${holidayMap.size} days with holidays/events`)

    return holidayMap

  } catch (error) {
    console.error('[HolidaysAgent] Error:', error)
    
    // Fallback to estimated dates
    const fallbackHolidays = Array.from(years).flatMap(year => [
      ...getEstimatedHolidays(year),
      ...getTelAvivFixedEvents(year)
    ])

    fallbackHolidays.forEach(holiday => {
      const dateStr = holiday.date
      if (!holidayMap.has(dateStr)) {
        holidayMap.set(dateStr, [])
      }
      holidayMap.get(dateStr)!.push(holiday)
    })

    return holidayMap
  }
}

/**
 * Get holiday info for a specific date
 */
export async function getHolidayForDate(date: string): Promise<IsraeliHoliday[]> {
  const holidayMap = await getIsraeliHolidays(date, date)
  return holidayMap.get(date) || []
}
