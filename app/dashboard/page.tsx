'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart } from "@/components/charts/line-chart"
import { StatCard } from '@/components/dashboard/stat-card'
import { ServiceBarChart } from '@/components/charts/bar-chart'

export default function Page() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    closedLeads: 0,
    leadsThisMonth: 0,
    totalInProgress: 0
  })


  const [selectedRange, setSelectedRange] = useState<'3m' | '30d' | '7d'>('3m')
  const [serviceChartData, setServiceChartData] = useState<{ service_product: string; count: number }[]>([])

  const [leadChartData, setLeadChartData] = useState<{ lead_source: string, count: number }[]>([])

  const fetchLeadChartData = async (range: '3m' | '30d' | '7d') => {
    const now = new Date()
    let fromDate = new Date()
  
    if (range === '3m') fromDate.setMonth(now.getMonth() - 3)
    else if (range === '30d') fromDate.setDate(now.getDate() - 30)
    else if (range === '7d') fromDate.setDate(now.getDate() - 7)
  
    const { data, error } = await supabase
      .from('crm_leads')
      .select('lead_source, created_at')
      .gte('created_at', fromDate.toISOString())
  
    if (error) {
      console.error('Error fetching lead sources:', error)
      return
    }
  
    const counts: Record<string, number> = {}
  
    data?.forEach((item) => {
      const source = item.lead_source?.trim().toLowerCase() || 'unknown'
      counts[source] = (counts[source] || 0) + 1
    })
  
    const chartData = Object.entries(counts)
      .map(([lead_source, count]) => ({ lead_source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  
    setLeadChartData(chartData)
  }
  




  const fetchTopServices = async (range: '3m' | '30d' | '7d') => {
    const now = new Date()
    let fromDate = new Date()
  
    if (range === '3m') fromDate.setMonth(now.getMonth() - 3)
    else if (range === '30d') fromDate.setDate(now.getDate() - 30)
    else if (range === '7d') fromDate.setDate(now.getDate() - 7)
  
    const { data, error } = await supabase
      .from('crm_leads')
      .select('service_product, created_at')
      .gte('created_at', fromDate.toISOString())
  
    if (error) {
      console.error('Error fetching service_product:', error)
      return
    }
  
    const counts: Record<string, number> = {}
  
    data?.forEach((item) => {
      const product = item.service_product?.trim().toUpperCase() || 'UNKNOWN'
      counts[product] = (counts[product] || 0) + 1
    })
  
    const chartData = Object.entries(counts)
      .map(([service_product, count]) => ({ service_product, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  
    setServiceChartData(chartData)
  }

  




  useEffect(() => {
    fetchLeadChartData(selectedRange)
    fetchTopServices(selectedRange)
  }, [selectedRange])

  
  useEffect(() => {
    const fetchStats = async () => {
      const { count: totalCount } = await supabase
        .from('crm_leads')
        .select('id', { count: 'exact', head: true })
  
      const { count: closedCount } = await supabase
        .from('crm_leads')
        .select('id', { count: 'exact', head: true })
        .ilike('status', 'closed won') // case-insensitive match
  
      const { count: inProgress } = await supabase
        .from('crm_leads')
        .select('id', { count: 'exact', head: true })
        .ilike('status', 'in progress') // also case-insensitive
  
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
  
      const { count: monthCount } = await supabase
        .from('crm_leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
  
      setStats({
        totalLeads: totalCount ?? 0,
        closedLeads: closedCount ?? 0,
        leadsThisMonth: monthCount ?? 0,
        totalInProgress: inProgress ?? 0,
      })
    }
  
    fetchStats()
  }, [])
  
  return (
    <SidebarInset>
      {/* Topbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 pl-10">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <Separator className="my-4" />

      {/* CRM Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Leads"
          value={stats.totalLeads.toString()}
          change="+12.5%"
          trend="up"
          subtext="All leads recorded"
        />
        <StatCard
          label="Leads Closed"
          value={stats.closedLeads.toString()}
          change="+8.0%"
          trend="up"
          subtext="Leads marked as closed won"
        />
        <StatCard
          label="Leads This Month"
          value={stats.leadsThisMonth.toString()}
          change="+15.0%"
          trend="up"
          subtext="New leads added this month"
        />
        <StatCard
          label="In progress"
          value={`${stats.totalInProgress}`}
          change="+3.5%"
          trend="up"
          subtext="Total In-progress"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-4 justify-evenly w-full pt-5">
  {/* Chart 1 */}
  <Card className="flex-1">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div>
        <CardTitle className="text-lg">Lead Captures Over Time</CardTitle>
        <CardDescription></CardDescription>
      </div>
      <div className="flex gap-2">
        <Button
          variant={selectedRange === '3m' ? 'outline' : 'ghost'}
          size="sm"
          onClick={() => setSelectedRange('3m')}
        >
          Last 3 months
        </Button>
        <Button
          variant={selectedRange === '30d' ? 'outline' : 'ghost'}
          size="sm"
          onClick={() => setSelectedRange('30d')}
        >
          Last 30 days
        </Button>
        <Button
          variant={selectedRange === '7d' ? 'outline' : 'ghost'}
          size="sm"
          onClick={() => setSelectedRange('7d')}
        >
          Last 7 days
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <LineChart data={leadChartData} />
    </CardContent>
  </Card>

  {/* Chart 2: Top 3 Services */}
<Card className="flex-1">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <div>
      <CardTitle className="text-lg">Top 3 Services</CardTitle>
      <CardDescription>Most requested services by leads</CardDescription>
    </div>
  </CardHeader>
  <CardContent>
    <ServiceBarChart data={serviceChartData} />
  </CardContent>
</Card>
</div>

    </SidebarInset>
  )
}
