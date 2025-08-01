'use client'

import { useSession } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useSession()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  console.log('Session:', session)
  useEffect(() => {
    // 🟡 Wait for session to be defined before deciding
    if (session === undefined) return

    if (session === null) {
      router.replace('/login')
    } else {
      setReady(true)
    }
  }, [session, router])

  // While session is still loading (undefined), show a blank or spinner
  if (session === undefined || !ready) {
    return <div className="p-10 text-center">Loading...</div>
  }
  return <>{children}</>
}
