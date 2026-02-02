"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { NavUser as BaseNavUser } from "./nav-user"

type U = { name: string; email: string; avatar?: string | null }

export function NavUserWrapper({ user }: { user: U }) {
  const supabase = createClientComponentClient()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar ?? null)

  useEffect(() => {
    let revoked: string | null = null

    ;(async () => {
      try {
        if (avatarUrl) return

        const { data } = await supabase.auth.getSession()
        const token = data.session?.provider_token
        if (!token) return

        const res = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          revoked = url
          setAvatarUrl(url)
        }
      } catch (e) {
        console.error("Failed to fetch MS photo", e)
      }
    })()

    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [avatarUrl, user.email])

  return <BaseNavUser user={{ ...user, avatar: avatarUrl ?? "" }} />
}
