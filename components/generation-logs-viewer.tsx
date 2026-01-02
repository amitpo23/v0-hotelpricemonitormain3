"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2Icon, CheckCircleIcon, XCircleIcon, ClockIcon, FileTextIcon, AlertCircleIcon } from "lucide-react"

interface GenerationLog {
  id: string
  session_id: string
  started_at: string
  completed_at: string | null
  status: 'running' | 'completed' | 'failed'
  selected_year: number
  selected_months: number[]
  predictions_created: number
  predictions_updated: number
  errors_count: number
  logs: Array<{
    timestamp: string
    level: 'info' | 'success' | 'warning' | 'error'
    message: string
    data?: any
  }>
  error_message: string | null
}

interface Props {
  sessionId?: string
  autoRefresh?: boolean
}

export function GenerationLogsViewer({ sessionId, autoRefresh = false }: Props) {
  const [logs, setLogs] = useState<GenerationLog[]>([])
  const [selectedLog, setSelectedLog] = useState<GenerationLog | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const fetchLogs = async () => {
    try {
      const url = sessionId 
        ? `/api/predictions/generation-logs?sessionId=${sessionId}`
        : `/api/predictions/generation-logs?limit=10`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        
        if (sessionId && data.logs.length > 0) {
          setSelectedLog(data.logs[0])
          setExpandedLogId(data.logs[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 2000) // Refresh every 2 seconds
      return () => clearInterval(interval)
    }
  }, [sessionId, autoRefresh])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2Icon className="w-5 h-5 text-blue-400 animate-spin" />
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-400" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      running: 'bg-blue-500/20 text-blue-300',
      completed: 'bg-green-500/20 text-green-300',
      failed: 'bg-red-500/20 text-red-300'
    }
    return <Badge className={variants[status] || 'bg-gray-500/20 text-gray-300'}>{status}</Badge>
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />
      case 'error':
        return <XCircleIcon className="w-4 h-4 text-red-400" />
      case 'warning':
        return <AlertCircleIcon className="w-4 h-4 text-yellow-400" />
      default:
        return <FileTextIcon className="w-4 h-4 text-blue-400" />
    }
  }

  const formatDuration = (start: string, end: string | null) => {
    const startTime = new Date(start).getTime()
    const endTime = end ? new Date(end).getTime() : Date.now()
    const duration = Math.floor((endTime - startTime) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2Icon className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8 text-center">
        <FileTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">אין לוגים זמינים</h3>
        <p className="text-gray-300">יצירת חיזויים חדשים תיצור לוגים כאן</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sessions List */}
      <div className="grid gap-4">
        {logs.map((log) => (
          <Card 
            key={log.id}
            className={`backdrop-blur-lg border-white/20 p-6 cursor-pointer transition-all ${
              expandedLogId === log.id 
                ? 'bg-purple-900/40 border-purple-400' 
                : 'bg-white/10 hover:bg-white/15'
            }`}
            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(log.status)}
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    Session {log.session_id.slice(0, 8)}
                    {getStatusBadge(log.status)}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {new Date(log.started_at).toLocaleString('he-IL')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-300">
                  {formatDuration(log.started_at, log.completed_at)}
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-400">שנה</p>
                <p className="text-white font-semibold">{log.selected_year}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">חודשים</p>
                <p className="text-white font-semibold">{log.selected_months?.join(', ') || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">נוצרו</p>
                <p className="text-green-400 font-semibold">{log.predictions_created}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">שגיאות</p>
                <p className={`font-semibold ${log.errors_count > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {log.errors_count}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {log.error_message && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-300 text-sm">{log.error_message}</p>
              </div>
            )}

            {/* Expanded Logs */}
            {expandedLogId === log.id && log.logs && log.logs.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-semibold text-white mb-2">📝 לוג מפורט ({log.logs.length} entries)</h4>
                <div className="max-h-96 overflow-y-auto space-y-2 bg-slate-900/50 rounded-lg p-4">
                  {log.logs.map((entry, index) => (
                    <div 
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded ${
                        entry.level === 'error' ? 'bg-red-500/10 border-r-2 border-red-500' :
                        entry.level === 'success' ? 'bg-green-500/10 border-r-2 border-green-500' :
                        entry.level === 'warning' ? 'bg-yellow-500/10 border-r-2 border-yellow-500' :
                        'bg-slate-800/50'
                      }`}
                    >
                      {getLevelIcon(entry.level)}
                      <div className="flex-1">
                        <p className="text-white text-sm">{entry.message}</p>
                        {entry.data && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                              פרטים נוספים
                            </summary>
                            <pre className="text-xs text-gray-300 mt-2 whitespace-pre-wrap overflow-x-auto bg-slate-900 p-2 rounded">
                              {JSON.stringify(entry.data, null, 2)}
                            </pre>
                          </details>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(entry.timestamp).toLocaleTimeString('he-IL')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Refresh Button */}
      {!autoRefresh && (
        <div className="flex justify-center">
          <Button
            onClick={fetchLogs}
            className="bg-purple-600 hover:bg-purple-700"
          >
            🔄 רענן לוגים
          </Button>
        </div>
      )}
    </div>
  )
}
