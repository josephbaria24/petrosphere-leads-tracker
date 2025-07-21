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
  ChartBar
} from "lucide-react"

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

// This is sample data.
const data = {
  user: {
    name: "Palawan Weather",
    email: "palawanweather@gmail.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Palawan Weather",
      logo: Cloud,
      plan: "Monitoring",
    },
  ],
  navMain: [
    {
      title: "Weather Overview",
      url: "/weather",
      icon: CloudyIcon,
    },
    {
      title: "Weather Charts",
      url: "#",
      icon: ChartBar,
      isActive: true,
      items: [
        {
          title: "Temperature Trends",
          url: "/charts/line/",
        },
        {
          title: "Rainfall Patterns",
          url: "#",
        },
        {
          title: "Wind Speed Graph",
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
          title: "Unit Preference",
          url: "#",
        },
        {
          title: "Notification",
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
