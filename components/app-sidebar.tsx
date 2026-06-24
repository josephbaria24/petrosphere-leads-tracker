"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { useSession } from "@supabase/auth-helpers-react"

import { NavMain } from "@/components/nav-main"
import { NavUserWrapper } from "@/components/nav-wrapper"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { AppImageIcon } from "@/components/icons/app-image-icon"

import {
  LayoutDashboard,
  Users2Icon,
  Video,
  Facebook,
  MapPinnedIcon,
  Package,
  ClipboardList,
  User,
} from "lucide-react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const session = useSession()
  const pathname = usePathname()

  const [userEmail, setUserEmail] = React.useState("Loading...")
  const [userName, setUserName] = React.useState("Loading...")
  const [currentTeam, setCurrentTeam] = React.useState<string>("CRM")

  React.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {})
    return () => sub.subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!session?.user) return

    const load = async () => {
      setUserEmail(session.user.email ?? "Unknown")

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, team")
        .eq("id", session.user.id)
        .single()

      if (error) console.error("Failed to fetch profile:", error.message)

      setUserName(profile?.full_name ?? session.user.user_metadata?.full_name ?? "User")

      const savedTeam = localStorage.getItem("selected-team")
      setCurrentTeam(savedTeam || profile?.team || "CRM")
    }

    load()
  }, [session?.user?.id])

  const handleTeamChange = (team: string) => {
    setCurrentTeam(team)
    localStorage.setItem("selected-team", team)
  }

  const teams = [
    {
      name: "Petrosphere Inc.",
      logo: () => (
        <AppImageIcon src="/logo.png" alt="CRM Logo" size={20} className="rounded-md" />
      ),
      plan: "Leads Tracker",
      value: "CRM",
    },
    {
      name: "Palawan Daily News",
      logo: () => (
        <AppImageIcon src="/PDN-ICON.png" alt="PDN Team Logo" size={20} className="rounded-md" />
      ),
      plan: "Leads Tracker",
      value: "PDN",
    },
  ]

  const crmNavigation = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, isActive: pathname === "/dashboard" },
    {
      title: "Manage Lead",
      url: "#",
      icon: Users2Icon,
      isActive:
        pathname.startsWith("/lead") ||
        pathname.startsWith("/add-new-leads") ||
        pathname.startsWith("/proposals-tracker"),
      items: [
        { title: "Leads List", url: "/lead-table", isActive: pathname === "/lead-table" },
        { title: "Add New Lead", url: "/add-new-leads", isActive: pathname === "/add-new-leads" },
        {
          title: "Proposals tracker",
          url: "/proposals-tracker",
          isActive: pathname === "/proposals-tracker",
        },
      ],
    },
    {
      title: "Webinar Tracker",
      url: "/webinar-list",
      icon: Video,
      isActive: pathname === "/webinar-list",
    },
    {
      title: "SocMed Engagement",
      url: "/social-media-list",
      icon: Facebook,
      isActive: pathname === "/social-media-list",
    },
    {
      title: "Regional Leads Map",
      url: "/regional-map",
      icon: MapPinnedIcon,
      isActive: pathname === "/regional-map",
    },
  ]

  const pdnNavigation = [
    { title: "Dashboard", url: "/dashboard/pdn", icon: LayoutDashboard, isActive: pathname === "/dashboard/pdn" },
    {
      title: "Leads Management",
      url: "#",
      icon: User,
      isActive: pathname.startsWith("/pdn"),
      items: [
        { title: "Leads Lists", url: "/pdn-leads", isActive: pathname === "/pdn-leads" },
        { title: "Add New Leads", url: "/pdn/projects/new", isActive: pathname === "/pdn/projects/new" },
      ],
    },
    { title: "Products", url: "/pdn/products", icon: Package, isActive: pathname === "/pdn/products" },
    { title: "Reports", url: "/pdn/reports", icon: ClipboardList, isActive: pathname === "/pdn/reports" },
  ]

  const navMain = currentTeam === "PDN" ? pdnNavigation : crmNavigation

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="gap-4 p-4 pb-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-3 group-data-[collapsible=icon]:p-3">
        <TeamSwitcher teams={teams} currentTeam={currentTeam} onTeamChange={handleTeamChange} />
      </SidebarHeader>

      <SidebarContent className="px-1 group-data-[collapsible=icon]:px-2">
        <NavMain items={navMain} />
      </SidebarContent>

      <SidebarFooter className="mt-auto gap-0 p-0">
        <div className="px-3 pb-4 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pb-3">
          <NavUserWrapper
            user={{
              name: userName,
              email: userEmail,
              avatar: session?.user?.user_metadata?.avatar_url ?? null,
            }}
          />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
