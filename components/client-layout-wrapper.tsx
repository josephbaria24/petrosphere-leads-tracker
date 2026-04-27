// components/client-layout-wrapper.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "sonner"
import { ThemeToggle } from "./mode-toggle"
import Image from "next/image"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { SessionContextProvider } from "@supabase/auth-helpers-react"

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/login"

  // ✅ single client instance
  const supabase = useMemo(() => createClientComponentClient(), [])

  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let mounted = true

    const isPublic = (path: string) =>
      path.startsWith("/login") || path.startsWith("/auth") || path.startsWith("/unauthorized")

    const init = async () => {
      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (!mounted) return
      setIsReady(true)

      // Protect routes
      if (!session && !isPublic(pathname)) {
        router.replace("/login")
      }

      if (session && isLoginPage) {
        router.replace("/dashboard")
      }
    }

    init()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // ignore token refresh redirects
      if (event === "TOKEN_REFRESHED") return

      if (!session && !isPublic(pathname)) router.replace("/login")
      if (session && isLoginPage) router.replace("/dashboard")
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [pathname, router, isLoginPage, supabase])

  if (!isReady) return <div className="p-10 text-center">Loading...</div>

  return (
    <SessionContextProvider supabaseClient={supabase}>
      {isLoginPage ? (
        <main className="flex h-screen items-center justify-center bg-muted p-6 md:p-10">
          {children}
        </main>
      ) : (
        <SidebarProvider>
          <div className="flex h-screen w-full overflow-hidden">
            <AppSidebar />
            <Toaster richColors position="top-right" />
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Top Header */}
              <header className="h-14 shrink-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" />
                  <Image 
                    src="/Petros logo1.png" 
                    alt="Petrosphere Logo" 
                    width={200} 
                    height={40} 
                    className="h-8 w-auto object-contain dark:hidden" 
                  />
                  <Image 
                    src="/Petros logo white logo.png" 
                    alt="Petrosphere Logo" 
                    width={200} 
                    height={40} 
                    className="h-8 w-auto object-contain hidden dark:block" 
                  />
                </div>
                <div className="flex items-center gap-4">
                  <ThemeToggle />
                </div>
              </header>
              
              <div className="relative flex-1 overflow-y-auto bg-slate-50/50 dark:bg-zinc-950">
                <main className="p-4 md:p-6">{children}</main>
              </div>
            </div>
          </div>
        </SidebarProvider>
      )}
    </SessionContextProvider>
  )
}
