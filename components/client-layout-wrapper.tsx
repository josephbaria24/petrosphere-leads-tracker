'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Toaster } from 'sonner'
import { ThemeToggle } from './mode-toggle'
import Image from 'next/image'
import Link from 'next/link'
import { LeadAgingManager } from './LeadAgingManager'
import { PwaProvider } from '@/components/pwa/pwa-provider'
import { MobileQuickAdd } from '@/components/mobile-quick-add'

import { supabase } from '@/lib/supabase-client'
import { SessionContextProvider } from '@supabase/auth-helpers-react'

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === '/login'
  const isQuickAddWidget = pathname === '/quick-add'

  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let mounted = true

    const isPublic = (path: string) =>
      path.startsWith('/login') || path.startsWith('/auth') || path.startsWith('/unauthorized')

    const routeForAuth = (hasUser: boolean) => {
      if (!hasUser && !isPublic(pathname)) {
        router.replace('/login')
        return
      }
      if (hasUser && pathname === '/login') {
        router.replace('/dashboard')
      }
    }

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!mounted) return
      setIsReady(true)
      routeForAuth(!!user)
    }

    init()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return
      if (!mounted) return
      routeForAuth(!!session?.user)
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [pathname, router])

  if (!isReady) {
    return <div className="grid min-h-dvh place-items-center p-6 text-center text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <SessionContextProvider supabaseClient={supabase}>
      {isLoginPage || isQuickAddWidget ? (
        <main className="h-dvh w-full overflow-hidden bg-[#f3f4f6]">{children}</main>
      ) : (
        <SidebarProvider>
          <LeadAgingManager />
          <div className="flex h-dvh w-full max-w-[100vw] overflow-hidden">
            <AppSidebar />
            <Toaster richColors position="top-center" className="sm:!top-4 sm:!right-4 sm:!left-auto" />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <header className="z-50 shrink-0 border-b border-zinc-200 bg-white pt-[env(safe-area-inset-top,0px)] dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex h-14 items-center justify-between px-3 sm:px-4">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <SidebarTrigger className="shrink-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" />
                    <Link href="/dashboard" className="min-w-0 shrink" aria-label="Go to dashboard">
                      <Image
                        src="/Petros logo1.png"
                        alt="Petrosphere Logo"
                        width={200}
                        height={40}
                        className="h-7 w-auto max-w-[140px] object-contain sm:h-8 sm:max-w-none dark:hidden"
                        priority
                      />
                      <Image
                        src="/Petros logo white logo.png"
                        alt="Petrosphere Logo"
                        width={200}
                        height={40}
                        className="hidden h-7 w-auto max-w-[140px] object-contain sm:h-8 sm:max-w-none dark:block"
                        priority
                      />
                    </Link>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                    <ThemeToggle />
                  </div>
                </div>
              </header>

              <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/50 dark:bg-zinc-950">
                <main className="mx-auto w-full max-w-[1600px] p-3 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:p-4 md:pb-6 md:p-6">
                  {children}
                </main>
              </div>
            </div>
          </div>
        </SidebarProvider>
      )}
      <MobileQuickAdd />
      <PwaProvider />
    </SessionContextProvider>
  )
}
