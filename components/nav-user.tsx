//components\nav-user.tsx
"use client"
import { useSession } from "@supabase/auth-helpers-react"
import { useEffect } from "react"

import { supabase } from "@/lib/supabase-client"

import { ChevronsUpDown, LogOut } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

import { useRouter } from "next/navigation"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const session = useSession()
  const { isMobile } = useSidebar()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  useEffect(() => {
    if (!session) return

    const checkSessionExpiry = () => {
      const loginTime = localStorage.getItem("login_time")
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000

      if (!loginTime) {
        localStorage.setItem("login_time", now.toString())
        return
      }

      if (now - parseInt(loginTime) >= oneDayInMs) {
        handleLogout()
      }
    }

    checkSessionExpiry()
    const interval = setInterval(checkSessionExpiry, 60 * 1000)
    return () => clearInterval(interval)
  }, [session])

  useEffect(() => {
    if (session && !localStorage.getItem("login_time")) {
      localStorage.setItem("login_time", Date.now().toString())
    }
    if (!session) {
      localStorage.removeItem("login_time")
    }
  }, [session])

  const showAvatar = !!session
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:items-center">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={user.name}
              className={cn(
                "h-auto rounded-xl px-2 py-2 hover:bg-zinc-200/60",
                "data-[state=open]:bg-zinc-200/60",
                "dark:hover:bg-zinc-800 dark:data-[state=open]:bg-zinc-800",
                "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0",
                "group-data-[collapsible=icon]:justify-center"
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="size-9 rounded-full group-data-[collapsible=icon]:size-10">
                  {showAvatar && (
                    <AvatarImage src="/api/me/avatar" alt={user.name} />
                  )}
                  <AvatarFallback className="rounded-full bg-zinc-200 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
                    {initials || "PW"}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-zinc-100 bg-emerald-500 group-data-[collapsible=icon]:hidden dark:border-zinc-900" />
              </div>
              <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {user.name}
                </span>
                <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 shrink-0 text-zinc-500 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                <Avatar className="size-9 rounded-full">
                  {showAvatar && (
                    <AvatarImage src="/api/me/avatar" alt={user.name} />
                  )}
                  <AvatarFallback className="rounded-full">{initials || "PW"}</AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="rounded-lg">
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
