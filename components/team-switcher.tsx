// components/team-switcher.tsx
"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function TeamSwitcher({
  teams,
  currentTeam,
  onTeamChange,
}: {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
    value: string
  }[]
  currentTeam?: string
  onTeamChange?: (team: string) => void
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()

  const [activeTeam, setActiveTeam] = React.useState(() => {
    return teams.find((t) => t.value === currentTeam) || teams[0]
  })

  React.useEffect(() => {
    const team = teams.find((t) => t.value === currentTeam)
    if (team) setActiveTeam(team)
  }, [currentTeam, teams])

  const handleTeamSwitch = (team: (typeof teams)[0]) => {
    setActiveTeam(team)
    localStorage.setItem("selected-team", team.value)
    onTeamChange?.(team.value)

    if (team.value === "PDN") {
      router.push("/dashboard/pdn")
    } else {
      router.push("/dashboard")
    }
  }

  if (!activeTeam) return null

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:items-center">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={activeTeam.name}
              className={cn(
                "h-auto rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm",
                "hover:bg-zinc-50 data-[state=open]:bg-zinc-50",
                "dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:data-[state=open]:bg-zinc-800",
                "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!border-0",
                "group-data-[collapsible=icon]:!bg-transparent group-data-[collapsible=icon]:!p-0",
                "group-data-[collapsible=icon]:!shadow-none group-data-[collapsible=icon]:justify-center"
              )}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50",
                  "dark:border-zinc-700 dark:bg-zinc-800",
                  "group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:rounded-xl"
                )}
              >
                <activeTeam.logo />
              </div>
              <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {activeTeam.name}
                </span>
                <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {activeTeam.plan}
                </span>
              </div>
              <ChevronDown className="ml-auto size-4 shrink-0 text-zinc-500 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={8}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch workspace
            </DropdownMenuLabel>
            {teams.map((team) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => handleTeamSwitch(team)}
                className="gap-2 rounded-lg p-2"
              >
                <div className="flex size-7 items-center justify-center rounded-md border bg-zinc-50 dark:bg-zinc-800">
                  <team.logo />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{team.name}</span>
                  <span className="text-xs text-muted-foreground">{team.plan}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
