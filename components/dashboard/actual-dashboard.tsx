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
import { ChartPieCapturedBy } from '../charts/pie-chart'
import { UserPlus, MessageCircle, FileText, Handshake, BadgeCheck, XCircle, Loader, CheckCircle, Printer } from 'lucide-react'
import Link from 'next/link'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import html2pdf from 'html2pdf.js'
import { useRouter } from 'next/navigation'




  function generateTimeLabels(interval: string, month: string, year: number, availableYears: number[]): string[] {
    switch (interval) {
      case 'weekly':
        return Array.from({ length: 52 }, (_, i) => `W${i + 1}`)
      case 'quarterly':
        return ['Q1', 'Q2', 'Q3', 'Q4']
      case 'annually':
        return availableYears.map(String)
      default: {
        if (month === 'all') {
          return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        } else {
          const monthIndex = new Date(`${month} 1, ${year}`).getMonth()
          const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
          return Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'))
        }
      }
    }
  }
  
  
export function ActualDashboardPage() {


  const router = useRouter()

  
  const [rangeIndex, setRangeIndex] = useState(0)

  
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
  

  type BarData = {
    service_product: string
    count: number
  }
  const [serviceChartData, setServiceChartData] = useState<BarData[]>([])

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
  

  const [, setLeadSourceTotals] = useState<Record<string, number>>({})
  const [capturedByData, setCapturedByData] = useState<{ name: string; value: number }[]>([])
  const [, setTotalCapturedByCount] = useState(0)
  const [newestLeads, setNewestLeads] = useState<{ captured_by: string; contact_name: string; status: string }[]>([])




  useEffect(() => {
    const fetchNewestLeads = async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('captured_by, contact_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
  
      if (error) {
        console.error('Error fetching newest leads:', error)
      } else {
        setNewestLeads(data || [])
      }
    }
  
    fetchNewestLeads()
  }, [])




  const fetchCapturedByStats = async (year: number, month: string, interval: string, rangeIndex: number) => {
    let startDate = new Date(year, 0, 1);
    let endDate = new Date(year + 1, 0, 1);
  
    const label = timeLabels[rangeIndex]
    switch (interval) {
      case 'weekly': {
        const janFirst = new Date(year, 0, 1)
        startDate = new Date(janFirst)
        startDate.setDate(janFirst.getDate() + rangeIndex * 7)
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 7)
        break
      }
      case 'quarterly': {
        const startMonth = rangeIndex * 3
        startDate = new Date(year, startMonth, 1)
        endDate = new Date(year, startMonth + 3, 1)
        break
      }
      case 'annually': {
        const labelYear = parseInt(label)
        if (!label || isNaN(labelYear)) return
        startDate = new Date(labelYear, 0, 1)
        endDate = new Date(labelYear + 1, 0, 1)
        break
      }
      default: {
        if (month !== 'all') {
          const monthIndex = new Date(`${month} 1, ${year}`).getMonth()
          startDate = new Date(year, monthIndex, 1)
          endDate = new Date(year, monthIndex + 1, 1)
        }
      }
    }

    if (month !== 'all') {
      const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
      startDate = new Date(year, monthIndex, 1);
      endDate = new Date(year, monthIndex + 1, 1);
    }
  
    const pageSize = 1000;
    let from = 0;
    let to = pageSize - 1;
    let allData: { captured_by: string; first_contact: string }[] = [];
    let finished = false;
  
    while (!finished) {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('captured_by, first_contact')
        .gte('first_contact', startDate.toISOString())
        .lt('first_contact', endDate.toISOString())
        .range(from, to);
  
      if (error) {
        console.error('Error fetching captured_by:', error);
        return;
      }
  
      if (!data || data.length === 0) break;
  
      allData = allData.concat(data);
      if (data.length < pageSize) {
        finished = true;
      } else {
        from += pageSize;
        to += pageSize;
      }
    }
  
    const counts: Record<string, number> = {};
  
    allData.forEach(({ captured_by, first_contact }) => {
      if (!captured_by || !first_contact) return;
  
      // Optional: add grouping logic by interval if needed for future enhancements
      switch (interval) {
        case 'weekly':
        case 'quarterly':
        case 'monthly':
        case 'annually':
        default:
          // Default case just aggregates total per personnel
          break;
      }
  
      const name = captured_by.trim();
      counts[name] = (counts[name] || 0) + 1;
    });
  
    const result = Object.entries(counts).map(([name, value]) => ({ name, value }));
    setCapturedByData(result);
    setTotalCapturedByCount(result.reduce((sum, item) => sum + item.value, 0));
  };
  
  
  
  

  
  useEffect(() => {
    fetchCapturedByStats(selectedYear, selectedMonth, selectedInterval, rangeIndex)
  }, [selectedYear, selectedMonth, selectedInterval, rangeIndex])
  


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
  

  const timeLabels = generateTimeLabels(selectedInterval, selectedMonth, selectedYear, availableYears)

  // Fetch top services/products for the selected year
  const fetchTopServices = async (year: number, month: string, interval: string, rangeIndex: number) => {
    let startDate = new Date(year, 0, 1)
    let endDate = new Date(year + 1, 0, 1)
  
    const label = timeLabels[rangeIndex]
  switch (interval) {
    case 'weekly': {
      const janFirst = new Date(year, 0, 1)
      startDate = new Date(janFirst)
      startDate.setDate(janFirst.getDate() + rangeIndex * 7)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 7)
      break
    }
    case 'quarterly': {
      const startMonth = rangeIndex * 3
      startDate = new Date(year, startMonth, 1)
      endDate = new Date(year, startMonth + 3, 1)
      break
    }
    case 'annually': {
      const labelYear = parseInt(label)
      if (!label || isNaN(labelYear)) return
      startDate = new Date(labelYear, 0, 1)
      endDate = new Date(labelYear + 1, 0, 1)
      break
    }
    default: {
      if (month !== 'all') {
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth()
        startDate = new Date(year, monthIndex, 1)
        endDate = new Date(year, monthIndex + 1, 1)
      }
    }
  }

    if (month !== 'all') {
      const monthIndex = new Date(`${month} 1, ${year}`).getMonth()
      startDate = new Date(year, monthIndex, 1)
      endDate = new Date(year, monthIndex + 1, 1)
    }
  
    const limit = 1000
    let offset = 0
    let allData: { service_product: string | null; first_contact: string | null }[] = []
    let done = false
  
    while (!done) {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('service_product, first_contact')
        .gte('first_contact', startDate.toISOString())
        .lt('first_contact', endDate.toISOString())
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
    fetchTopServices(selectedYear, selectedMonth, selectedInterval, rangeIndex)
  }, [selectedYear, selectedMonth, selectedInterval, rangeIndex])
  
  

useEffect(() => {
  fetchLeadsBySource(selectedYear, selectedMonth, selectedInterval)
}, [selectedYear, selectedMonth, selectedInterval, fetchLeadsBySource])







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
      setRangeIndex(0)
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

    const fetchStats = async (year: number, month: string, interval: string) => {
      // Calculate the dynamic date range
      let startDate = new Date(year, 0, 1)
      let endDate = new Date(year + 1, 0, 1)

      
    
      if (month !== 'all') {
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth()
        startDate = new Date(year, monthIndex, 1)
        endDate = new Date(year, monthIndex + 1, 1)
      }
    
      const prevStart = new Date(startDate)
      const prevEnd = new Date(startDate)

      const selectedLabel = timeLabels[rangeIndex];

      switch (interval) {
        case 'weekly': {
          const janFirst = new Date(year, 0, 1);
          const start = new Date(janFirst);
          start.setDate(janFirst.getDate() + rangeIndex * 7);
          startDate = start;
          endDate = new Date(start);
          endDate.setDate(start.getDate() + 7);
          break;
        }
        case 'quarterly': {
          const startMonth = rangeIndex * 3;
          startDate = new Date(year, startMonth, 1);
          endDate = new Date(year, startMonth + 3, 1);
          break;
        }
        case 'annually': {
          const label = timeLabels[rangeIndex];
          const labelYear = parseInt(label);
          if (!label || isNaN(labelYear)) {
            console.warn('Invalid labelYear in annually range:', label);
            return; // Abort the fetch if data isn't ready
          }
          startDate = new Date(labelYear, 0, 1);
          endDate = new Date(labelYear + 1, 0, 1);
          break;
        }
        
      }
    
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
          .lt("first_contact", startDate.toISOString()),
    
        supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .ilike("status", "closed won")
          .gte("first_contact", startDate.toISOString())
          .lt("first_contact", endDate.toISOString()),
    
        supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .ilike("status", "closed won")
          .gte("first_contact", prevStart.toISOString())
          .lt("first_contact", prevEnd.toISOString()),
    
        supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .ilike("status", "closed lost")
          .gte("first_contact", startDate.toISOString())
          .lt("first_contact", endDate.toISOString()),
    
        supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .ilike("status", "closed lost")
          .gte("first_contact", prevStart.toISOString())
          .lt("first_contact", prevEnd.toISOString()),
    
        supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .ilike("status", "in progress")
          .gte("first_contact", startDate.toISOString())
          .lt("first_contact", endDate.toISOString()),
    
        supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .ilike("status", "in progress")
          .gte("first_contact", prevStart.toISOString())
          .lt("first_contact", prevEnd.toISOString()),
    
        supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .gte("first_contact", startDate.toISOString())
          .lt("first_contact", endDate.toISOString()),
    
        supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .gte("first_contact", prevStart.toISOString())
          .lt("first_contact", prevEnd.toISOString()),
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


      

     // Fetch all "Lead In" and "In Progress" entries without row limit
const pageSize = 1000
let from = 0
let to = pageSize - 1
let allLeadInData: { contact_name: string | null; captured_by: string | null; first_contact: string | null }[] = []
let done = false
// Fetch all Closed Won and Closed Lost leads (with no limit)

while (!done) {
  const { data, error } = await supabase
    .from('crm_leads')
    .select('contact_name, captured_by, first_contact')
    .in('status', ['Lead In', 'In Progress'])
    .gte('first_contact', startDate.toISOString())
    .lt('first_contact', endDate.toISOString())
    .range(from, to)

  if (error) {
    console.error('Error fetching Lead In data:', error)
    break
  }

  if (!data || data.length === 0) {
    break
  }

  allLeadInData = allLeadInData.concat(data)

  if (data.length < pageSize) {
    done = true
  } else {
    from += pageSize
    to += pageSize
  }
}

// Sort by newest first_contact date
const sortedLeads = allLeadInData
  .filter(l => l.first_contact)
  .sort((a, b) => new Date(b.first_contact!).getTime() - new Date(a.first_contact!).getTime())

// Store in state
setLeadInLeads(
  sortedLeads.map(l => ({
    name: l.contact_name || 'Unnamed',
    captured_by: l.captured_by || '',
    created_at: l.first_contact || '',
  }))
)



let allClosedWonData: typeof allLeadInData = []
let allClosedLostData: typeof allLeadInData = []

from = 0
to = pageSize - 1
done = false

while (!done) {
  const { data, error } = await supabase
    .from('crm_leads')
    .select('contact_name, captured_by, first_contact')
    .ilike('status', 'closed won')
    .gte('first_contact', startDate.toISOString())
    .lt('first_contact', endDate.toISOString())
    .range(from, to)

  if (error) break
  if (!data || data.length === 0) break

  allClosedWonData = allClosedWonData.concat(data)
  if (data.length < pageSize) done = true
  else {
    from += pageSize
    to += pageSize
  }
}

from = 0
to = pageSize - 1
done = false

while (!done) {
  const { data, error } = await supabase
    .from('crm_leads')
    .select('contact_name, captured_by, first_contact')
    .ilike('status', 'closed lost')
    .gte('first_contact', startDate.toISOString())
    .lt('first_contact', endDate.toISOString())
    .range(from, to)

  if (error) break
  if (!data || data.length === 0) break

  allClosedLostData = allClosedLostData.concat(data)
  if (data.length < pageSize) done = true
  else {
    from += pageSize
    to += pageSize
  }
}

setClosedWonLeads(
  allClosedWonData
    .filter(l => l.first_contact)
    .sort((a, b) => new Date(b.first_contact!).getTime() - new Date(a.first_contact!).getTime())
    .map(l => ({
      name: l.contact_name || 'Unnamed',
      captured_by: l.captured_by || '',
      created_at: l.first_contact || '',
    }))
)

setClosedLostLeads(
  allClosedLostData
    .filter(l => l.first_contact)
    .sort((a, b) => new Date(b.first_contact!).getTime() - new Date(a.first_contact!).getTime())
    .map(l => ({
      name: l.contact_name || 'Unnamed',
      captured_by: l.captured_by || '',
      created_at: l.first_contact || '',
    }))
)

    }
    
  
    fetchStats(selectedYear, selectedMonth, selectedInterval)
}, [selectedYear, selectedMonth, selectedInterval, rangeIndex])
  









const handleOpenPrintView = () => {
  const reportData = {
    stats,
    areaChartData: leadAreaChartData,
    capturedByData,
    serviceData: serviceChartData,
  }
  localStorage.setItem('report-data', JSON.stringify(reportData))
  router.push('/dashboard/print-report')  // ✅ now safe to call
}




const [leadInLeads, setLeadInLeads] = useState<{ name: string; captured_by: string; created_at: string }[]>([])
const [closedWonLeads, setClosedWonLeads] = useState<{ name: string; captured_by: string; created_at: string }[]>([]);
const [closedLostLeads, setClosedLostLeads] = useState<{ name: string; captured_by: string; created_at: string }[]>([]);



  return (
    <div>
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
      

      <div className='flex justify-between'>
      <div className="flex space-x-3 space-y-3">
        {/* Month Dropdown */}
        {selectedInterval === "monthly" && (
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] text-sm">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(
                (month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        )}

        {/* Year Dropdown */}
        {selectedInterval !== "annually" && (
          <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
            <SelectTrigger className="w-[100px] text-sm">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Interval Dropdown */}
        <Select value={selectedInterval} onValueChange={setSelectedInterval}>
          <SelectTrigger className="w-[120px] text-sm">
            <SelectValue placeholder="Interval" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="annually">Annually</SelectItem>
          </SelectContent>
        </Select>
        
      </div>

     
    <Button onClick={handleOpenPrintView} className="bg-background cursor-pointer flex items-center gap-2 dark:text-white">
      <Printer className="w-4 h-4" />
      Print Report
    </Button>
      </div>
      {['weekly', 'quarterly', 'annually'].includes(selectedInterval) && (
        <div className="pt-4 justify-start">
          <label className="text-sm mb-1 block">Select Period</label>
          <Select value={rangeIndex.toString()} onValueChange={(val) => setRangeIndex(parseInt(val))}>
            <SelectTrigger className="w-[200px] text-sm">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              {timeLabels.map((label, idx) => (
                <SelectItem key={label} value={idx.toString()}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground pt-1">
            Showing data for: <strong>{timeLabels[rangeIndex]}</strong>
          </div>
        </div>
      )}

<div id="print-section">
      {/* CRM Stats Header */}

      {/* CRM Stats Grid */}
      <div  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" data-html2canvas-ignore>
      <StatCard
            label="Total Leads"
            value={stats.totalLeads.toString()}
            subtext="All leads recorded"
            className="bg-black dark:bg-white text-white dark:text-black"
          />
          <StatCard
              label="In Progress"
              value={stats.totalInProgress.toString()}
              {...getTrend(stats.totalInProgress, stats.inProgressPrev)}
              subtext="Currently active leads"
              className="bg-blue-600 dark:bg-blue-800 text-white dark:text-white"
              details={leadInLeads.length > 0 ? leadInLeads : []}
            />

            <StatCard
              label="Win"
              value={stats.closedLeads.toString()}
              {...getTrend(stats.closedLeads, stats.closedLeadsPrev)}
              subtext="Closed as won"
              className="bg-green-600 dark:bg-green-800 text-white dark:text-white"
              details={closedWonLeads}
            />

            <StatCard
              label="Lost"
              value={stats.closedLost.toString()}
              {...getTrend(stats.closedLost, stats.closedLostPrev)}
              subtext="Closed as lost"
              className="bg-red-600 dark:bg-red-800 text-white dark:text-white"
              details={closedLostLeads}
            />

            <StatCard
            label="Leads of Selected Month"
            value={stats.leadsThisMonth.toString()}
            {...getTrend(stats.leadsThisMonth, stats.leadsLastMonth)}
            subtext="New leads added this month"
            className="bg-black dark:bg-white text-white dark:text-black"
            />
        </div>

        {/* Chart 3: Captured By Personnel */}



        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 pt-3" >
            {/* ... your StatCards here */}
            <ChartPieCapturedBy data={capturedByData}/>


        <div data-html2canvas-ignore> 
            <Card className="flex-1 bg-background">
              <CardHeader>
                <CardTitle className="text-3xl">Newest Leads</CardTitle>
                <CardDescription>Most recently captured entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground mb-2 px-1">
                  <div>Captured By</div>
                  <div>Contact Name</div>
                  <div className="text-right">Status</div>
                </div>

    <div  className="space-y-2" >
      {newestLeads.map((lead, idx) => {
        
        const rowStyle =
        idx === 0
          ? "text-3xl font-semibold"
          : idx === 1
          ? "text-xl font-medium"
          : "text-m text-muted-foreground"

        const statusKey = lead.status?.toLowerCase() || "unknown"

        const statusStyles: Record<
          string,
          { label: string; className: string; icon: React.ReactNode }
        > = {
          "lead in": {
            label: "Lead In",
            className: "bg-gray-600 text-white",
            icon: <UserPlus className="w-3.5 h-3.5 mr-1.5" />,
          },
          "contact made": {
            label: "Contact Made",
            className: "bg-blue-600 text-white",
            icon: <MessageCircle className="w-3.5 h-3.5 mr-1.5" />,
          },
          "needs defined": {
            label: "Needs Defined",
            className: "bg-yellow-500 text-white",
            icon: <FileText className="w-3.5 h-3.5 mr-1.5" />,
          },
          "proposal sent": {
            label: "Proposal Sent",
            className: "bg-purple-600 text-white",
            icon: <FileText className="w-3.5 h-3.5 mr-1.5" />,
          },
          "negotiation started": {
            label: "Negotiation Started",
            className: "bg-orange-500 text-white",
            icon: <Handshake className="w-3.5 h-3.5 mr-1.5" />,
          },
          "closed won": {
            label: "Closed Win",
            className: "bg-green-600 text-white",
            icon: <BadgeCheck className="w-3.5 h-3.5 mr-1.5" />,
          },
          "closed win": {
            label: "Closed Win",
            className: "bg-green-600 text-white",
            icon: <BadgeCheck className="w-3.5 h-3.5 mr-1.5" />,
          },
          "closed lost": {
            label: "Closed Lost",
            className: "bg-red-600 text-white",
            icon: <XCircle className="w-3.5 h-3.5 mr-1.5" />,
          },
          "in progress": {
            label: "In Progress",
            className: "bg-zinc-800 text-white border border-zinc-700",
            icon: <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />,
          },
          done: {
            label: "Done",
            className: "bg-black text-green-400 border border-green-700",
            icon: <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-500" />,
          },
        }

        const status = statusStyles[statusKey] || {
          label: lead.status || "Unknown",
          className: "bg-gray-200 text-gray-700",
          icon: null,
        }

        return (
          
          <div
            key={idx}
            className={`grid grid-cols-3 items-center px-1 ${rowStyle}`}
          >
            
            <div className="truncate">{lead.captured_by}</div>
            <div className="truncate">{lead.contact_name}</div>
            
            <div className="flex justify-end">
            <span
                className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium ${
                  status.className || "bg-gray-400 text-white"
                }`}
              >
                {status.icon}
                {status.label}
              </span>

            </div>
          </div>
        )
      })}
      
    </div>
      </CardContent>
      <div className="pt-7 text-center">
              <Link href="/lead-table" passHref>
                <Button variant="link" className="text-sm text-muted-foreground hover:text-primary px-0 cursor-pointer">
                  View Details →
                </Button>
              </Link>
            </div>
    </Card>
    </div>



        </div>

  {/* Chart 1 */}
  <div className="py-4">
    
  
  <Card className="flex-1 bg-background">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div>
        <CardTitle className="text-lg">Lead Captures Over Time</CardTitle>
        <CardDescription></CardDescription>
      </div>

      


    </CardHeader>

    <CardContent style={{ minHeight: '400px' }}>
    <LeadSourceAreaChart data={leadAreaChartData} />

    </CardContent>
  </Card>
  </div>


  {/* {/* Chart 2: Top 3 Services */}
  <Card className="flex-1 bg-background">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <div>
    <CardTitle className="text-lg">
        Services / Products ({selectedMonth === 'all' ? selectedYear : `${selectedMonth} ${selectedYear}`})
      </CardTitle>
      <CardDescription>Most requested services by leads</CardDescription>
    </div>
  </CardHeader>
  <CardContent>
    <ServiceBarChart data={serviceChartData} />
    
  </CardContent>
     
</Card>
</div>
{/* <Card className="flex-1 bg-background mt-4">
  <CardHeader>
    <CardTitle className="text-lg">Service Heatmap</CardTitle>
    <CardDescription>Distribution across time</CardDescription>
  </CardHeader>
  <CardContent className='bg-background' >
    <HeatmapChart data={heatmapData} />
  </CardContent>
</Card> */}

    </SidebarInset>
  </div>
  )
}
