import { NextResponse } from "next/server"
import { getPredictionLogs, getLatestPredictionLog } from "@/lib/logging/prediction-logger-db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    const hotelId = searchParams.get('hotelId')
    const predictionDate = searchParams.get('predictionDate')
    const latest = searchParams.get('latest') === 'true'
    const limit = parseInt(searchParams.get('limit') || '10')
    
    if (!hotelId || !predictionDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: hotelId and predictionDate' },
        { status: 400 }
      )
    }
    
    let logs
    
    if (latest) {
      const log = await getLatestPredictionLog(hotelId, predictionDate)
      logs = log ? [log] : []
    } else {
      logs = await getPredictionLogs(hotelId, predictionDate, limit)
    }
    
    return NextResponse.json({
      success: true,
      count: logs.length,
      logs
    })
  } catch (error) {
    console.error('[API] Error fetching prediction logs:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
