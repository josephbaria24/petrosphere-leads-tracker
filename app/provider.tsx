///app\provider.tsx
"use client"

import { SessionContextProvider } from "@supabase/auth-helpers-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import React from "react"

export default function Providers({ children }: { children: React.ReactNode }) {
  const [supabase] = React.useState(() => createClientComponentClient())
  return <SessionContextProvider supabaseClient={supabase}>{children}</SessionContextProvider>
}
