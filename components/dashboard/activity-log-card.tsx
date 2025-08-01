// components/dashboard/activity-log-card.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ActivityLog = {
  user_name: string
  action: 'added' | 'edited' | 'deleted'
  entity_type: string
  timestamp: string
}

interface ActivityLogCardProps {
  logs: ActivityLog[]
}

export function ActivityLogCard({ logs }: ActivityLogCardProps) {
  if (logs.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-sm space-y-2">
          {logs.map((log, idx) => (
            <li key={idx} className="flex justify-between items-center">
              <div>
                <span className="font-medium">{log.user_name}</span> {log.action} <span className="font-semibold">{log.entity_type}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(log.timestamp).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
