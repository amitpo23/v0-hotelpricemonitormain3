import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react"
import { MarkAlertReadButton } from "./mark-read-button"

export default async function AlertsPage() {
  const supabase = await createClient()

  const { data: alerts } = await supabase
    .from("pricing_alerts")
    .select(`*, hotels (name)`)
    .order("created_at", { ascending: false })

  const unreadCount = alerts?.filter((a: any) => !a.is_read).length || 0

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "error":
        return "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950"
      case "warning":
        return "border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950"
      default:
        return "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950"
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Alerts</h1>
          <p className="text-slate-600 dark:text-slate-400">Price change notifications and market alerts</p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {unreadCount} unread
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            All Alerts
          </CardTitle>
          <CardDescription>Recent pricing alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          {!alerts || alerts.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">All clear!</h3>
              <p className="text-slate-500">
                No alerts at the moment. We'll notify you when something needs your attention.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg ${getSeverityStyle(alert.severity)} ${alert.is_read ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(alert.severity)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{alert.hotels?.name}</span>
                          <Badge variant="outline">{alert.alert_type}</Badge>
                          {!alert.is_read && <Badge>New</Badge>}
                        </div>
                        <p className="text-sm mb-2">{alert.message}</p>
                        <span className="text-xs text-slate-500">{new Date(alert.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    {!alert.is_read && <MarkAlertReadButton alertId={alert.id} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
