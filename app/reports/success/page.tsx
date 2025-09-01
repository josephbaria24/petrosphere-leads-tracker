// app/reports/success/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export default function ReportSuccessPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center h-screen px-4 text-center">
      <CheckCircle2 className="text-green-500 w-16 h-16 mb-4" />
      <h1 className="text-2xl font-semibold mb-2">Report Sent Successfully</h1>
      <p className="text-gray-600 mb-6">Your monthly PDF report has been emailed.</p>
      <Button onClick={() => router.back()}>Go Back</Button>
    </div>
  )
}
