// app/dashboard/page.tsx
'use client'

import { AuthGuard } from '@/components/auth-guard'
import { ActualDashboardPage } from '@/components/dashboard/actual-dashboard' // create this

export default function Page() {
  return (
    <AuthGuard>
      <ActualDashboardPage />
    </AuthGuard>
  )
}
