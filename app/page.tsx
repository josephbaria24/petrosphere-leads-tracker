'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@supabase/auth-helpers-react'

export default function Home() {
  const session = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [session, router])

  return null
}
