import { SessionContextProvider } from "@supabase/auth-helpers-react"
import { supabase } from "@/lib/supabase-client"
import React from "react"

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionContextProvider supabaseClient={supabase}>{children}</SessionContextProvider>
}
