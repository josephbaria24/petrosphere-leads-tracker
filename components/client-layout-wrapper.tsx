// components/client-layout-wrapper.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "sonner"
import { ThemeToggle } from "./mode-toggle"

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
