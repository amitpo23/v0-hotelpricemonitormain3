import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true })

    // Get first sheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      dateNF: "yyyy-mm-dd",
    }) as any[][]

    if (data.length < 2) {
      return NextResponse.json({ error: "File is empty or has no data rows" }, { status: 400 })
    }

    // First row is headers
    const headers = data[0].map((h: any) => String(h || "").trim())

    // Rest are data rows
    const rows = data
      .slice(1)
      .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ""))
      .map((row) => {
        const rowObj: Record<string, any> = {}
        headers.forEach((header, i) => {
          rowObj[header] = row[i]
        })
        return rowObj
      })

    return NextResponse.json({
      headers,
      rows,
      totalRows: rows.length,
    })
  } catch (error) {
    console.error("Error parsing Excel:", error)
    return NextResponse.json({ error: "Failed to parse Excel file" }, { status: 500 })
  }
}
