"use client"

import * as React from "react"
import {
  Settings2,
  Droplet,
  LayoutDashboard,
  Video,
  Users2Icon,
  FacebookIcon,
  Facebook,
  MapPinnedIcon,
  LucideNewspaper,
  Building2,
  FolderKanban,
  Package,
  ClipboardList,
  User,
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { AppImageIcon } from "@/components/icons/app-image-icon";

import { usePathname } from "next/navigation"
import { PDNIcon } from "./icons/PDNIcon"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const supabase = createClientComponentClient()
  const [userEmail, setUserEmail] = React.useState("Loading...")
  const [userName, setUserName] = React.useState("User")
  const [userTeam, setUserTeam] = React.useState<string>("CRM")
  const [currentTeam, setCurrentTeam] = React.useState<string>("CRM")
  const pathname = usePathname()
  
  React.useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
  
      if (session?.user) {
        const userId = session.user.id
  
        // Fetch full_name and team from "profiles" table
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name, team")
          .eq("id", userId)
          .single()
  
        if (error) {
          console.error("Failed to fetch profile:", error.message)
        }
  
        setUserEmail(session.user.email ?? "Unknown")
        setUserName(profile?.full_name || "User")
        setUserTeam(profile?.team || "CRM")
        
        // Check localStorage for saved team preference
        const savedTeam = localStorage.getItem("selected-team")
        setCurrentTeam(savedTeam || profile?.team || "CRM")
      }
    }
  
    getUser()
  }, [supabase])

  // Handle team change
  const handleTeamChange = (team: string) => {
    setCurrentTeam(team)
  }

  // Teams data
  const teams = [
    {
      name: "Petrosphere Inc.",
      logo: () => (
        <AppImageIcon
          src="/logo.png"
          alt="CRM Logo"
          size={24}
          className="rounded-lg"
        />
      ),
      plan: "Leads Tracker",
      value: "CRM",
    },
    {
      name: "Palawan Daily News",
      logo: () => (
        <AppImageIcon
          src="/PDN-ICON.png"
          alt="PDN Team Logo"
          size={24}
          className="rounded-lg"
        />
      ),
      plan: "Leads Tracker",
      value: "PDN",
    },
  ];
  

  // CRM Navigation
  const crmNavigation = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
    },
    {
      title: "Manage Lead",
      url: "#",
      icon: Users2Icon,
      isActive: pathname.startsWith("/lead"),
      items: [
        {
          title: "Leads List",
          url: "/lead-table",
          isActive: pathname === "/lead-table",
        },
        {
          title: "Add New Lead",
          url: "/add-new-leads",
          isActive: pathname === "/add-new-leads",
        },
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

  // PDN Navigation
  const pdnNavigation = [
    {
      title: "Dashboard",
      url: "/dashboard/pdn",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard/pdn",
    },
    {
      title: "Leads Managemnent",
      url: "#",
      icon: User,
      isActive: pathname.startsWith("/pdn/projects"),
      items: [
        {
          title: "Leads Lists",
          url: "/pdn-leads",
          isActive: pathname === "/pdn/projects",
        },
        {
          title: "Add New Leads",
          url: "/pdn/projects/new",
          isActive: pathname === "/pdn/projects/new",
        },
        
      ],
    },
    {
      title: "Products",
      url: "/pdn/products",
      icon: Package,
      isActive: pathname === "/pdn/products",
    },
    {
      title: "Reports",
      url: "/pdn/reports",
      icon: ClipboardList,
      isActive: pathname === "/pdn/reports",
    },
  ]

  // Select navigation based on current team
  const navMain = currentTeam === "PDN" ? pdnNavigation : crmNavigation

  const data = {
    user: {
      name: userName,
      email: userEmail,
      avatar: "/logo.png",
    },
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher 
          teams={teams} 
          currentTeam={currentTeam}
          onTeamChange={handleTeamChange}
        />
      </SidebarHeader>
      <SidebarContent className="m-1">
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}