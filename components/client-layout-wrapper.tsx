'use client'

import { useEffect, useState } from 'react'
import { Session, SessionContextProvider } from '@supabase/auth-helpers-react'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { usePathname } from 'next/navigation'
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "sonner"
import { ThemeToggle } from './mode-toggle'


export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  const [supabaseClient] = useState(() => createPagesBrowserClient())
  const [initialSession, setInitialSession] = useState<Session | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabaseClient.auth.getSession()
      setInitialSession(data.session)
      setIsReady(true)
    }
    getSession()
  }, [supabaseClient])

  // Wait until session is loaded to avoid false redirects
  if (!isReady) {
    return <div className="p-10 text-center">Loading...</div>
  }

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
      {isLoginPage ? (
        <main className="flex h-screen items-center justify-center bg-muted p-6 md:p-10">
          {children}
        </main>
      ) : (
        <SidebarProvider>
          <div className="flex h-screen w-full overflow-hidden">
            <AppSidebar/>
            <Toaster richColors position="top-right" />
            <div className="relative flex-1 overflow-y-auto">
              <div className="absolute top-4 left-0 right-0 z-50 flex items-center justify-between px-0">
                <SidebarTrigger />
                <div className="mb-4 flex justify-center pr-5">
                <ThemeToggle />
              </div>
                

              </div>
              <main className="p-4 md:p-6">{children}</main>
            </div>
          </div>
        </SidebarProvider>
      )}
    </SessionContextProvider>
  )
}
