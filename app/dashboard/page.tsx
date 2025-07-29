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

  const [serviceChartData, setServiceChartData] = useState<{ service_product: string; count: number }[]>([])

  type AreaData = {
    date: string
    [leadSource: string]: string | number
  }
  
  const [leadAreaChartData, setLeadAreaChartData] = useState<AreaData[]>([])


  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('all')  // default is "all"


  const [leadSourceTotals, setLeadSourceTotals] = useState<Record<string, number>>({})

  const fetchLeadsBySource = async (year: number, month: string) => {
    let startDate: Date, endDate: Date;
  
    if (month === 'all') {
      startDate = new Date(year, 0, 1)
      endDate = new Date(year + 1, 0, 1)
    } else {
      const monthIndex = new Date(`${month} 1, ${year}`).getMonth()
      startDate = new Date(year, monthIndex, 1)
      endDate = new Date(year, monthIndex + 1, 1)
    }
  
    const { data, error } = await supabase
      .from('crm_leads')
      .select('lead_source, first_contact')
      .gte('first_contact', startDate.toISOString())
      .lt('first_contact', endDate.toISOString())
  
    if (error) {
      console.error('Error fetching leads:', error)
      return
    }
  
    const grouped: Record<string, Record<string, number>> = {}
    const uniqueSources = new Set<string>()
    const totals: Record<string, number> = {}
  
    data?.forEach(({ lead_source, first_contact }) => {
      if (!first_contact) return
  
      const date = new Date(first_contact)
      const xLabel = month === 'all'
        ? date.toLocaleString('default', { month: 'short' })
        : String(date.getDate()).padStart(2, '0')  // '01', '02', ...
  
      const normalizedSource = (lead_source || 'Unknown').trim().toLowerCase()
      uniqueSources.add(normalizedSource)
  
      if (!grouped[xLabel]) grouped[xLabel] = {}
      grouped[xLabel][normalizedSource] = (grouped[xLabel][normalizedSource] || 0) + 1
  
      totals[normalizedSource] = (totals[normalizedSource] || 0) + 1
    })
  
    const allSources = Array.from(uniqueSources)
    const xValues = month === 'all'
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : Array.from({ length: new Date(year, new Date(`${month} 1, ${year}`).getMonth() + 1, 0).getDate() }, (_, i) => String(i + 1).padStart(2, '0'))
  
    const formatted = xValues.map((label) => {
      const row: AreaData = { date: label }
      allSources.forEach(source => {
        row[source] = grouped[label]?.[source] || 0
      })
      return row
    })
  
    setLeadAreaChartData(formatted)
    setLeadSourceTotals(totals)
  }
  


const fetchTopServicesByYear = async (year: number) => {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);

  const { data, error } = await supabase
    .from('crm_leads')
    .select('service_product, first_contact')
    .gte('first_contact', startOfYear.toISOString())
    .lt('first_contact', endOfYear.toISOString());

  if (error) {
    console.error('Error fetching service_product:', error);
    return;
  }

  const counts: Record<string, number> = {};

  data?.forEach((item) => {
    const product = item.service_product?.trim().toUpperCase() || 'UNKNOWN';
    counts[product] = (counts[product] || 0) + 1;
  });

  const chartData = Object.entries(counts)
    .map(([service_product, count]) => ({ service_product, count }))
    .sort((a, b) => b.count - a.count);

  setServiceChartData(chartData);
};


useEffect(() => {
  fetchLeadsBySource(selectedYear, selectedMonth)
}, [selectedYear, selectedMonth])


  // useEffect(() => {
  //   fetchLeadsBySourcePerMonth(selectedYear)
  // }, [selectedYear])
  

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
            className="bg-blue-100 dark:bg-blue-900" // Light and dark variant
          />
          <StatCard
            label="Leads Closed"
            value={stats.closedLeads.toString()}
            change="+8.0%"
            trend="up"
            subtext="Leads marked as closed won"
            className="bg-cyan-100 dark:bg-cyan-800"
          />
          <StatCard
            label="Leads This Month"
            value={stats.leadsThisMonth.toString()}
            change="+15.0%"
            trend="up"
            subtext="New leads added this month"
            className="bg-amber-100 dark:bg-amber-700"
          />
          <StatCard
            label="In progress"
            value={`${stats.totalInProgress}`}
            change="+3.5%"
            trend="up"
            subtext="Total In-progress"
            className="bg-rose-100 dark:bg-rose-800"
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
        {/* month dropdown  */}
      <select
          className="border px-2 py-1 rounded-md text-sm ml-2"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          <option value="all">All Months</option>
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
        {/* year dropdown */}          
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
    <div className="mt-4 text-sm">
  <h4 className="font-semibold mb-2">Total Leads per Source (Year {selectedYear})</h4>
  <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-2">
    {Object.entries(leadSourceTotals).map(([source, count]) => (
      <li key={source} className="flex justify-between">
        <span className="capitalize">{source}</span>
        <span className="font-medium">{count}</span>
      </li>
    ))}
  </ul>
</div>

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
