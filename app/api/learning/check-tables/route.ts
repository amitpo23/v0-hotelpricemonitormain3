import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const tables = ['prediction_accuracy', 'model_performance_summary', 'prediction_generation_logs']
    const results: any = {}
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      
      results[table] = {
        exists: !error,
        error: error?.message || null,
        sampleCount: data?.length || 0
      }
    }
    
    return NextResponse.json({
      success: true,
      tables: results,
      recommendation: Object.values(results).some((r: any) => !r.exists)
        ? 'Some tables are missing. Run SQL files in Supabase SQL Editor.'
        : 'All learning tables exist!'
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
