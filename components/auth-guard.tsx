//components\auth-guard.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!mounted) return

      if (!session) {
        router.replace('/login')
      } else {
        setReady(true)
      }
    }

    check()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return
      if (!session) router.replace('/login')
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  if (!ready) return <div className="p-10 text-center">Loading...</div>
  return <>{children}</>
}
