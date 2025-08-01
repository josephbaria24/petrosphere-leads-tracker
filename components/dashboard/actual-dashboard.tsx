//actual-dashboard.tsx
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
import { ChartPieCapturedBy } from '../charts/radar-grid'

export function ActualDashboardPage() {


  

  const [stats, setStats] = useState({
    totalLeads: 0,
    totalLeadsPrev: 0,
    closedLeads: 0,
    closedLeadsPrev: 0,
    closedLost: 0,
    closedLostPrev: 0,
    leadsThisMonth: 0,
    leadsLastMonth: 0,
    totalInProgress: 0,
    inProgressPrev: 0,
  })
  

  const [serviceChartData, setServiceChartData] = useState<{ service_product: string; count: number }[]>([])

  type AreaData = {
    date: string
    [leadSource: string]: string | number
  }
  
  const [leadAreaChartData, setLeadAreaChartData] = useState<AreaData[]>([])
  const [, setLeadSourceDisplayMap] = useState<Record<string, string>>({})



  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('all')  // default is "all"
  const [selectedInterval, setSelectedInterval] = useState<string>('monthly')
  

  const [leadSourceTotals, setLeadSourceTotals] = useState<Record<string, number>>({})
  const [capturedByData, setCapturedByData] = useState<{ name: string; value: number }[]>([])
  const [totalCapturedByCount, setTotalCapturedByCount] = useState(0)

  const fetchCapturedByStats = async () => {
    const limit = 1000
    let offset = 0
    let allData: { captured_by: string | null }[] = []
    let done = false
  
    while (!done) {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('captured_by')
        .range(offset, offset + limit - 1)
  
      if (error) {
        console.error('Error fetching captured_by:', error)
        return
      }
  
      if (data.length < limit) {
        done = true
      }
  
      allData = allData.concat(data)
      offset += limit
    }
  
    // Count captured_by
    const counts: Record<string, number> = {}
    const nameMap: Record<string, string> = {}
  
    allData.forEach(({ captured_by }) => {
      if (!captured_by || captured_by.trim() === '') return
      const trimmed = captured_by.trim()
      counts[trimmed] = (counts[trimmed] || 0) + 1
      nameMap[trimmed] = trimmed
    })
  
    const result = Object.entries(counts).map(([key, value]) => ({
      name: nameMap[key],
      value,
    }))
  
    console.table(result)
    setCapturedByData(result)
    setTotalCapturedByCount(result.reduce((sum, item) => sum + item.value, 0))
  }
  
  

  
  useEffect(() => {
    fetchCapturedByStats()
  }, [])
  


  const normalizeKey = (key: string) =>
    key.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')  // safe for Recharts
  
  const fetchLeadsBySource = async (year: number, month: string, interval: string) => {
    let startDate: Date;
    let endDate: Date;
  
    if (interval === 'annually') {
      const minYear = Math.min(...availableYears) || year;
      const maxYear = Math.max(...availableYears) || year;
      startDate = new Date(minYear, 0, 1);
      endDate = new Date(maxYear + 1, 0, 1);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1);
  
      if (month !== 'all') {
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
        startDate = new Date(year, monthIndex, 1);
        endDate = new Date(year, monthIndex + 1, 1);
      }
    }
  
    const limit = 1000
    let offset = 0
    let allData: { lead_source: string | null; first_contact: string | null }[] = []
    let done = false
  
    while (!done) {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('lead_source, first_contact')
        .gte('first_contact', startDate.toISOString())
        .lt('first_contact', endDate.toISOString())
        .range(offset, offset + limit - 1)
  
      if (error) {
        console.error('Error fetching leads:', error)
        return
      }
  
      if (!data || data.length < limit) {
        done = true
      }
  
      allData = allData.concat(data)
      offset += limit
    }
  
    const grouped: Record<string, Record<string, number>> = {}
    const totals: Record<string, number> = {}
    const uniqueSources = new Set<string>()
    const displayMap: Record<string, string> = {}
  
    allData.forEach(({ lead_source, first_contact }) => {
      if (!first_contact) return
  
      const date = new Date(first_contact)
      let xLabel = ''
  
      switch (interval) {
        case 'weekly': {
          const firstJan = new Date(date.getFullYear(), 0, 1)
          const dayOfYear = Math.floor((date.getTime() - firstJan.getTime()) / (1000 * 60 * 60 * 24)) + 1
          const week = Math.ceil((dayOfYear + firstJan.getDay()) / 7)
          xLabel = `W${week}`
          break
        }
        case 'quarterly': {
          const quarter = Math.floor(date.getMonth() / 3) + 1
          xLabel = `Q${quarter}`
          break
        }
        case 'annually':
          xLabel = `${date.getFullYear()}`
          break
        default:
          xLabel = month === 'all'
            ? date.toLocaleString('default', { month: 'short' })
            : String(date.getDate()).padStart(2, '0')
          break
      }
  
      const originalSource = (lead_source || 'Unknown').trim()
      const normalized = normalizeKey(originalSource)
      uniqueSources.add(normalized)
      displayMap[normalized] = originalSource
  
      if (!grouped[xLabel]) grouped[xLabel] = {}
      grouped[xLabel][normalized] = (grouped[xLabel][normalized] || 0) + 1
      totals[normalized] = (totals[normalized] || 0) + 1
    })
  
    let xValues: string[] = []
  
    switch (interval) {
      case 'weekly':
        xValues = Array.from({ length: 52 }, (_, i) => `W${i + 1}`)
        break
      case 'quarterly':
        xValues = ['Q1', 'Q2', 'Q3', 'Q4']
        break
      case 'annually':
        xValues = availableYears.map(String)
        break
      default:
        xValues = month === 'all'
          ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          : Array.from(
              { length: new Date(year, new Date(`${month} 1, ${year}`).getMonth() + 1, 0).getDate() },
              (_, i) => String(i + 1).padStart(2, '0')
            )
        break
    }
  
    const sources = Array.from(uniqueSources)
  
    const formatted: AreaData[] = xValues.map((label) => {
      const row: AreaData = { date: label }
      sources.forEach(source => {
        row[source] = grouped[label]?.[source] || 0
      })
      return row
    })
  
    setLeadAreaChartData(formatted)
    setLeadSourceTotals(totals)
    setLeadSourceDisplayMap(displayMap)
  }
  
  

 
  



  // Fetch top services/products for the selected year

  const fetchTopServicesByYear = async (year: number) => {
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year + 1, 0, 1)
  
    const limit = 1000
    let offset = 0
    let allData: { service_product: string | null; first_contact: string | null }[] = []
    let done = false
  
    while (!done) {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('service_product, first_contact')
        .gte('first_contact', startOfYear.toISOString())
        .lt('first_contact', endOfYear.toISOString())
        .range(offset, offset + limit - 1)
  
      if (error) {
        console.error('Error fetching service_product:', error)
        return
      }
  
      allData = allData.concat(data)
      if (data.length < limit) {
        done = true
      } else {
        offset += limit
      }
    }
  
    const counts: Record<string, number> = {}
  
    allData.forEach((item) => {
      const product = item.service_product?.trim().toUpperCase() || 'UNKNOWN'
      counts[product] = (counts[product] || 0) + 1
    })
  
    const chartData = Object.entries(counts)
      .map(([service_product, count]) => ({ service_product, count }))
      .sort((a, b) => b.count - a.count)
  
    setServiceChartData(chartData)
  }
  

useEffect(() => {
  fetchLeadsBySource(selectedYear, selectedMonth, selectedInterval)
}, [selectedYear, selectedMonth, selectedInterval])





  useEffect(() => {
    fetchTopServicesByYear(selectedYear);  // <-- replace old fetchTopServices call
  }, [selectedYear]);

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



  function getTrend(current: number, previous: number): { trend: 'up' | 'down'; change: string } {
    if (previous === 0) return { trend: 'up', change: '+100%' }
  
    const diff = current - previous
    const percent = (diff / previous) * 100
  
    return {
      trend: diff >= 0 ? 'up' : 'down',
      change: `${diff >= 0 ? '+' : ''}${percent.toFixed(1)}%`
    }
  }
  
  
  useEffect(() => {

    const fetchStats = async () => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    totalLeads,
    totalLeadsPrev,
    closedLeads,
    closedLeadsPrev,
    closedLost,
    closedLostPrev,
    totalInProgress,
    inProgressPrev,
    leadsThisMonth,
    leadsLastMonth,
  ] = await Promise.all([
    supabase.from("crm_leads").select("id", { count: "exact", head: true }),
    supabase
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .lt("first_contact", startOfMonth.toISOString()),

      supabase
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .ilike("status", "closed won")
      .gte("first_contact", startOfMonth.toISOString()),

    supabase
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .ilike("status", "closed won")
      .lt("first_contact", startOfMonth.toISOString()),

      supabase
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .ilike("status", "closed lost")
      .gte("first_contact", startOfMonth.toISOString()),

    supabase
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .ilike("status", "closed lost")
      .lt("first_contact", startOfMonth.toISOString()),

    supabase
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .ilike("status", "in progress"),

    supabase
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .ilike("status", "in progress")
      .lt("first_contact", startOfMonth.toISOString()),

    supabase
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .gte("first_contact", startOfMonth.toISOString()),

    supabase
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .gte("first_contact", startOfLastMonth.toISOString())
      .lte("first_contact", endOfLastMonth.toISOString()),
  ]).then(results => results.map(r => r.count ?? 0))

  setStats({
    totalLeads,
    totalLeadsPrev,
    closedLeads,
    closedLeadsPrev,
    closedLost,
    closedLostPrev,
    totalInProgress,
    inProgressPrev,
    leadsThisMonth,
    leadsLastMonth,
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
            label="Total Leads"
            value={stats.totalLeads.toString()}
            {...getTrend(stats.totalLeads, stats.totalLeadsPrev)}
            subtext="All leads recorded"
            className="bg-black dark:bg-white text-white dark:text-black"
            />

            <StatCard
            label="In Progress"
            value={stats.totalInProgress.toString()}
            {...getTrend(stats.totalInProgress, stats.inProgressPrev)}
            subtext="Currently active leads"
            className="bg-blue-600 dark:bg-blue-800 text-white dark:text-white"
            />

            <StatCard
            label="Win"
            value={stats.closedLeads.toString()}
            {...getTrend(stats.closedLeads, stats.closedLeadsPrev)}
            subtext="Closed as won"
            className="bg-green-600 dark:bg-green-800 text-white dark:text-white"
            />

            <StatCard
            label="Lost"
            value={stats.closedLost.toString()}
            {...getTrend(stats.closedLost, stats.closedLostPrev)}
            subtext="Closed as lost"
            className="bg-red-600 dark:bg-red-800 text-white dark:text-white"
            />

            <StatCard
            label="Leads This Month"
            value={stats.leadsThisMonth.toString()}
            {...getTrend(stats.leadsThisMonth, stats.leadsLastMonth)}
            subtext="New leads added this month"
            className="bg-black dark:bg-white text-white dark:text-black"
            />
        </div>

        {/* Chart 3: Captured By Personnel */}



        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-3">
            {/* ... your StatCards here */}
            <ChartPieCapturedBy data={capturedByData} />

        </div>

  {/* Chart 1 */}
  <div className="py-4">
    
  
  <Card className="flex-1">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div>
        <CardTitle className="text-lg">Lead Captures Over Time</CardTitle>
        <CardDescription></CardDescription>
      </div>


      <div className="flex space-x-2">
        {/* Conditional month dropdown */}
        {selectedInterval === 'monthly' && (
          <select
            className="border px-2 py-1 rounded-md text-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="all">All Months</option>
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        )}

        {/* Year dropdown */}          
        {selectedInterval !== 'annually' && (
          <select
            className="border px-2 py-1 rounded-md text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        )}
        {/* Interval dropdown */}
        <select
          className="border px-2 py-1 rounded-md text-sm"
          value={selectedInterval}
          onChange={(e) => setSelectedInterval(e.target.value)}
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="weekly">Weekly</option>
          <option value="annually">Annually</option>
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
