"use client"
import { useSession } from "@supabase/auth-helpers-react"
import { useEffect } from "react"

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

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
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error signing out:", error.message)
      return
    }

    router.push("/login")
  }

  // Auto logout after 24 hours
  useEffect(() => {
    if (!session) return

    const checkSessionExpiry = () => {
      const loginTime = localStorage.getItem('login_time')
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

      if (!loginTime) {
        // Set login time if not exists
        localStorage.setItem('login_time', now.toString())
        return
      }

      const timeSinceLogin = now - parseInt(loginTime)
      
      if (timeSinceLogin >= oneDayInMs) {
        console.log("Session expired after 24 hours, logging out...")
        handleLogout()
      }
    }

    // Check immediately
    checkSessionExpiry()

    // Check every minute
    const interval = setInterval(checkSessionExpiry, 60 * 1000)

    return () => clearInterval(interval)
  }, [session])

  // Set login time when session is established
  useEffect(() => {
    if (session && !localStorage.getItem('login_time')) {
      localStorage.setItem('login_time', Date.now().toString())
    }
    
    // Clear login time when session is gone
    if (!session) {
      localStorage.removeItem('login_time')
    }
  }, [session])

  // Don't render avatar until session is available
  const showAvatar = !!session

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-4xl">
                {showAvatar && (
                  <AvatarImage src="/api/me/avatar" alt={user.name} />
                )}
                <AvatarFallback className="rounded-lg">PW</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-4xl">
                  {showAvatar && (
                    <AvatarImage src="/api/me/avatar" alt={user.name} />
                  )}
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}