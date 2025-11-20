// app/dashboard/pdn/page.tsx
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Users, Building2 } from "lucide-react"
import CountUp from "react-countup"

export default function PDNDashboardPage() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeProjects: 0,
    completedProjects: 0,
  })

  const [userName, setUserName] = useState("")
  const [userPosition, setUserPosition] = useState("")

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, position")
          .eq("id", user.id)
          .single()

        if (!error && data) {
          setUserName(data.full_name || "")
          setUserPosition(data.position || "")
        }
      }
    }
    fetchUserProfile()
  }, [])

  useEffect(() => {
    const fetchPDNStats = async () => {
      // Fetch from pdn_leads table
      const [totalLeads, activeProjects, completedProjects] = await Promise.all([
        supabase.from("pdn_leads").select("id", { count: "exact", head: true }),
        supabase.from("pdn_leads").select("id", { count: "exact", head: true }).eq("status", "In Progress"),
        supabase.from("pdn_leads").select("id", { count: "exact", head: true }).ilike("status", "closed win"),
      ]).then(results => results.map(r => r.count ?? 0))

      setStats({
        totalLeads,
        activeProjects,
        completedProjects,
      })
    }

    fetchPDNStats()
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  return (
    <SidebarInset>
      {/* Greeting */}
      <div className="flex pl-4 pb-6 items-center gap-3">
      
      <div className="relative h-10 w-10">
        {/* Light mode icon */}
        <img
            src="/icons/black.png"
            alt="PDN Icon"
            className="h-10 w-10 block dark:hidden"
        />

        {/* Dark mode icon */}
        <img
            src="/icons/white.png"
            alt="PDN Icon"
            className="h-10 w-10 hidden dark:block"
        />
        </div>

        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {userName ? userName.split(" ")[0] : "User"}!
          </h1>
          {userPosition && (
            <p className="text-sm text-muted-foreground">{userPosition} - PDN Team</p>
          )}
        </div>
      </div>

      <Separator className="mb-4" />

      {/* PDN Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-blue-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Total Leads
            </CardTitle>
            <CardDescription className="text-blue-100">
              All PDN leads recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              <CountUp start={0} end={stats.totalLeads} duration={2} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-600 text-white">
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
            <CardDescription className="text-orange-100">
              Currently in progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              <CountUp start={0} end={stats.activeProjects} duration={2} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-600 text-white">
          <CardHeader>
            <CardTitle>Completed</CardTitle>
            <CardDescription className="text-green-100">
              Successfully delivered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              <CountUp start={0} end={stats.completedProjects} duration={2} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for PDN-specific charts */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>PDN Dashboard</CardTitle>
            <CardDescription>
              Product Development & Network analytics coming soon...
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
            <p>PDN-specific charts and analytics will appear here</p>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  )
}
