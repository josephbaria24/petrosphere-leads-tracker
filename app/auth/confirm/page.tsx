// app/auth/confirm/page.tsx
'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function AuthConfirm() {
  const router = useRouter()
  const supabase = useMemo(() => createClientComponentClient(), [])

  useEffect(() => {
    const run = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          console.error("No user found:", error)
          router.replace('/login?error=no_user')
          return
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, team")
          .eq("id", user.id)
          .single()

        if (profile?.role === "admin" || profile?.role === "super_admin") {
          router.replace(profile.team === "PDN" ? "/dashboard/pdn" : "/dashboard")
        } else {
          router.replace("/unauthorized")
        }
      } catch (err) {
        console.error("Error in confirm:", err)
        router.replace('/login?error=confirm_failed')
      }
    }

    run()
  }, [router, supabase])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Completing sign in...</p>
      </div>
    </div>
  )
}