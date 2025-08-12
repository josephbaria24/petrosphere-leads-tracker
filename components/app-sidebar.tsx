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
import { usePathname } from "next/navigation";



export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {




  
  const supabase = createClientComponentClient()
  const [userEmail, setUserEmail] = React.useState("Loading...")
  const [userName, setUserName] = React.useState("User")
  const pathname = usePathname();
  
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
      plan: "Leads Tracker",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
    },
    // {
    //   title: "Create",
    //   url: "/employees",
    //   icon: PlusCircleIcon,
    // },
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
      ],
    },
    {
      title: "Webinar Tracker",
      url: "#",
      icon: Video,
      isActive: pathname.startsWith("/webinar"),
      items: [
        {
          title: "Manage Webinars",
          url: "webinar-list",
          isActive: pathname === "/webinar-list",
        },
        {
          title: "Create Webinar Report",
          url: "#",
          isActive: pathname === "#",
        },
      ],
    },
    {
      title: "Social Media Engagement",
      url: "#",
      icon: Facebook,
      isActive: true,
      items: [
        {
          title: "Manage Engagement",
          url: "#",
        },
        {
          title: "Create Engagement Report",
          url: "#",
        },
      ],
    },
    
    {
      title: "Regional Leads Map",
      url: "/regional-map",
      icon: MapPinnedIcon,
      isActive: pathname === "/regional-map",
    },
  ],

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
