'use client'

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  // 👉 login page layout (centered, isolated)
  if (isLoginPage) {
    return (
      <main className="flex h-screen items-center justify-center bg-muted p-6 md:p-10">
        {children}
      </main>
    )
  }

  // 👉 app layout with sidebar + sidebar-aligned content
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />

        <div className="relative flex-1 overflow-y-auto">
          {/* SidebarToggle inside relative parent */}
          <div className="sticky top-4 left-0 right-0 z-50 flex items-center justify-between px-5">
          <SidebarTrigger />
          <ModeToggle />
        </div>


        <main className="p-4 md:p-6">{children}</main>
      </div>
    
      </div>
    </SidebarProvider>
  )
}
