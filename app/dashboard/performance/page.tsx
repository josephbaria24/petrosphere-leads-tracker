'use client'

import { Suspense } from 'react'
import { PerformanceDashboard } from '@/components/dashboard/performance-dashboard'

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading performance…</div>}>
      <PerformanceDashboard />
    </Suspense>
  )
}
