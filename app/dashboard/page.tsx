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
import { StatCard } from '@/components/dashboard/stat-card'
import { ServiceBarChart } from '@/components/charts/bar-chart'
import { LeadSourceAreaChart } from '@/components/charts/area-chart'

export default function Page() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    closedLeads: 0,
    leadsThisMonth: 0,
    totalInProgress: 0
  })


  const [selectedRange, setSelectedRange] = useState<'3m' | '30d' | '7d'>('3m')
  const [serviceChartData, setServiceChartData] = useState<{ service_product: string; count: number }[]>([])

  type AreaData = {
    date: string
    [leadSource: string]: string | number
  }
  
  const [leadAreaChartData, setLeadAreaChartData] = useState<AreaData[]>([])


  const currentYear = new Date().getFullYear()
const [selectedYear, setSelectedYear] = useState<number>(currentYear)
const [availableYears, setAvailableYears] = useState<number[]>([])



const fetchLeadsBySourcePerMonth = async (year: number) => {
  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date(year + 1, 0, 1)

  const { data, error } = await supabase
    .from('crm_leads')
    .select('lead_source, first_contact')
    .gte('first_contact', startOfYear.toISOString())
    .lt('first_contact', endOfYear.toISOString())

  if (error) {
    console.error('Error fetching leads:', error)
    return
  }

  const grouped: Record<string, Record<string, number>> = {}
  const uniqueSources = new Set<string>()

  data?.forEach(({ lead_source, first_contact }) => {
    if (!first_contact) return

    const date = new Date(first_contact)
    const month = date.toLocaleString('default', { month: 'short' })
    const source = lead_source?.trim().toLowerCase() || 'unknown'

    uniqueSources.add(source)

    if (!grouped[month]) grouped[month] = {}
    grouped[month][source] = (grouped[month][source] || 0) + 1
  })

  const allSources = Array.from(uniqueSources)
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  const formatted = months.map((month) => {
    const base: { date: string; [key: string]: string | number } = { date: month }
  
    allSources.forEach((source) => {
      base[source] = grouped[month]?.[source] || 0
    })
  
    return base
  })
  

  setLeadAreaChartData(formatted)
}


  const fetchTopServices = async (range: '3m' | '30d' | '7d') => {
    const now = new Date()
    const fromDate = new Date()
  
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
  
    setServiceChartData(chartData)
  }

  

  useEffect(() => {
    fetchLeadsBySourcePerMonth(selectedYear)
  }, [selectedYear])
  

  useEffect(() => {
    fetchTopServices(selectedRange)
  }, [selectedRange])

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('first_contact')
  
      if (error) return console.error(error)
  
      const years = new Set<number>()
      data?.forEach(({ first_contact }) => {
        if (first_contact) {
          const y = new Date(first_contact).getFullYear()
          years.add(y)
        }
      })
  
      const sorted = Array.from(years).sort((a, b) => b - a)
      setAvailableYears(sorted)
    }
  
    init()
  }, [])

  
  
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

  {/* Chart 1 */}
  <div className="py-4">
    
  
  <Card className="flex-1">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div>
        <CardTitle className="text-lg">Lead Captures Over Time</CardTitle>
        <CardDescription></CardDescription>
      </div>
      <div>
          <select
            className="border px-2 py-1 rounded-md text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
    </CardHeader>
    <CardContent>
    <LeadSourceAreaChart data={leadAreaChartData} />
    </CardContent>
  </Card>
  </div>

  {/* Chart 2: Top 3 Services */}
<Card className="flex-1">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <div>
      <CardTitle className="text-lg">Services / Products</CardTitle>
      <CardDescription>Most requested services by leads</CardDescription>
    </div>
  </CardHeader>
  <CardContent>
    <ServiceBarChart data={serviceChartData} />
  </CardContent>
</Card>

    </SidebarInset>
  )
}
