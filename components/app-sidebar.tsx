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
      name: "Petrosphere Inc.",
      logo: Droplet ,
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
      url: "social-media-list",
      icon: Facebook,
      isActive: pathname === "/social-media-list",
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
