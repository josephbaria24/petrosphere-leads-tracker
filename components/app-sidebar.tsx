"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Cloud,
  CloudAlert,
  CloudyIcon,
  ChartBar,
  CloudDrizzle,
  CloudLightningIcon,
  Droplet,
  SquareDashedKanbanIcon,
  LayoutDashboard,
  PlusCircleIcon
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Session } from "@supabase/auth-helpers-nextjs"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"



export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {




  
  const supabase = createClientComponentClient()
  const [userEmail, setUserEmail] = React.useState("Loading...")
  const [userName, setUserName] = React.useState("User")
  
  
  React.useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
  
      if (session?.user) {
        const userId = session.user.id
  
        // fetch full_name from "profiles" table
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .single()
  
        if (error) {
          console.error("Failed to fetch profile:", error.message)
        }
  
        setUserEmail(session.user.email ?? "Unknown")
        setUserName(profile?.full_name || "User")
      }
    }
  
    getUser()
  }, [supabase])
  



  // This is sample data.
const data = {
  user: {
    name: userName,
    email: userEmail,
    avatar: "/logo.png",
  },
  teams: [
    {
      name: "Petrosphere",
      logo: Droplet,
      plan: "Customer Relationship Management",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Create",
      url: "/employees",
      icon: PlusCircleIcon,
    },
    {
      title: "Manage Lead",
      url: "#",
      icon: ChartBar,
      isActive: true,
      items: [
        {
          title: "Leads List",
          url: "/leads-list",
        },
        {
          title: "Add New Lead",
          url: "#",
        },
        {
          title: "Lead Insights",
          url: "#",
        },
        {
          title: "Lead Activity Log",
          url: "#",
        },
      ],
    },
    
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "User Management",
          url: "#",
        },
        {
          title: "CRM Settings",
          url: "#",
        },
      ],
    },
  ],
  // projects: [
  //   {
  //     name: "Design Engineering",
  //     url: "#",
  //     icon: Frame,
  //   },
  //   {
  //     name: "Sales & Marketing",
  //     url: "#",
  //     icon: PieChart,
  //   },
  //   {
  //     name: "Travel",
  //     url: "/",
  //     icon: Map,
  //   },
  // ],
}

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
