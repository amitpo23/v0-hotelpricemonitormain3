import { NextResponse } from "next/server"

// Hebcal API for accurate Jewish holiday dates
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get("year") || new Date().getFullYear().toString()

  try {
    // Fetch from Hebcal API - free and reliable
    const response = await fetch(
      `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&mod=on&nx=on&year=${year}&month=x&ss=on&mf=on&c=on&geo=geoname&geonameid=293397&M=on&s=on`,
      { next: { revalidate: 86400 } }, // Cache for 24 hours
    )

    if (!response.ok) {
      throw new Error("Failed to fetch holidays")
    }

    const data = await response.json()

    // Process holidays with tourism impact scores
    const holidays =
      data.items?.map((item: any) => ({
        title: item.title,
        titleHebrew: item.hebrew,
        date: item.date,
        category: item.category,
        subcat: item.subcat,
        // Calculate tourism impact
        tourismImpact: calculateTourismImpact(item),
      })) || []

    return NextResponse.json({
      success: true,
      year,
      holidays,
      count: holidays.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching holidays:", error)

    // Return fallback holidays
    return NextResponse.json({
      success: true,
      year,
      holidays: getFallbackHolidays(Number.parseInt(year)),
      cached: true,
      timestamp: new Date().toISOString(),
    })
  }
}

function calculateTourismImpact(holiday: any): { score: number; type: string } {
  const title = holiday.title?.toLowerCase() || ""
  const category = holiday.category?.toLowerCase() || ""

  // High impact holidays - major tourism events
  if (title.includes("passover") || title.includes("pesach")) {
    return { score: 1.35, type: "major_high" }
  }
  if (title.includes("sukkot")) {
    return { score: 1.25, type: "major_high" }
  }
  if (title.includes("rosh hashanah")) {
    return { score: 1.2, type: "major_medium" }
  }
  if (title.includes("purim")) {
    return { score: 1.2, type: "celebration" }
  }
  if (title.includes("independence day") || title.includes("yom haatzmaut")) {
    return { score: 1.3, type: "national" }
  }
  if (title.includes("shavuot")) {
    return { score: 1.15, type: "major_medium" }
  }
  if (title.includes("hanukkah") || title.includes("chanukah")) {
    return { score: 1.2, type: "winter_festival" }
  }

  // Low impact - people stay home
  if (title.includes("yom kippur")) {
    return { score: 0.7, type: "fasting" }
  }
  if (title.includes("tisha b'av")) {
    return { score: 0.75, type: "mourning" }
  }

  // Shabbat and regular holidays
  if (category === "holiday" || title.includes("erev")) {
    return { score: 1.1, type: "holiday" }
  }

  return { score: 1.0, type: "regular" }
}

function getFallbackHolidays(year: number) {
  // Approximate dates for major holidays
  return [
    { title: "Purim", date: `${year}-03-14`, tourismImpact: { score: 1.2, type: "celebration" } },
    { title: "Passover", date: `${year}-04-13`, tourismImpact: { score: 1.35, type: "major_high" } },
    { title: "Independence Day", date: `${year}-05-14`, tourismImpact: { score: 1.3, type: "national" } },
    { title: "Shavuot", date: `${year}-06-02`, tourismImpact: { score: 1.15, type: "major_medium" } },
    { title: "Rosh Hashanah", date: `${year}-09-23`, tourismImpact: { score: 1.2, type: "major_medium" } },
    { title: "Yom Kippur", date: `${year}-10-02`, tourismImpact: { score: 0.7, type: "fasting" } },
    { title: "Sukkot", date: `${year}-10-07`, tourismImpact: { score: 1.25, type: "major_high" } },
    { title: "Hanukkah", date: `${year}-12-15`, tourismImpact: { score: 1.2, type: "winter_festival" } },
  ]
}
