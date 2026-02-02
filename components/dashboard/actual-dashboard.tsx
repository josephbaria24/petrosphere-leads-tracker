/* eslint-disable react-hooks/exhaustive-deps */
//actual-dashboard.tsx
'use client'

import { OverallLeadsLineChart } from '@/components/charts/line-chart-label'
import { useEffect, useMemo, useState } from 'react'
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

import CountUp from "react-countup"
import { Separator } from "@/components/ui/separator"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from '@/components/dashboard/stat-card'
import { ServiceBarChart } from '@/components/charts/bar-chart'
import { LeadSourceAreaChart } from '@/components/charts/area-chart'
import { ChartPieCapturedBy } from '../charts/pie-chart'
import { UserPlus, MessageCircle, FileText, Handshake, BadgeCheck, XCircle, Loader, CheckCircle, Printer, ArrowUpRight, Trophy, Hourglass, Users, Loader2, Send } from 'lucide-react'
import Link from 'next/link'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useRouter } from 'next/navigation'
import CRMBarChart from '../charts/bar-chart-2'
import ClosedWonTrendsChart from '../charts/line-chart'
import RevenueOpportunitiesTrendsChart from '../charts/line-chart-2'
import Image from 'next/image'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { format, parse } from 'date-fns'
import { startOfMonth, endOfMonth } from 'date-fns';
import { FloatingDateFilter } from './floating-date-filter'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"



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

  type OverallLeadsData = {
  label: string
  totalLeads: number
  }
  const [overallLeadsData, setOverallLeadsData] = useState<OverallLeadsData[]>([])


  const today = new Date();
  const startDate = startOfMonth(today);
  const endDate = endOfMonth(today);

const supabase = useMemo(() => createClientComponentClient(), [])

  
  const getDateHeaderLabel = () => {
    if (selectedInterval === 'annually') {
      return `Year: ${timeLabels[rangeIndex] || selectedYear}`
    }
  
    if (selectedInterval === 'quarterly') {
      return `${timeLabels[rangeIndex]} ${selectedYear}`
    }
  
    if (selectedInterval === 'weekly') {
      const janFirst = new Date(selectedYear, 0, 1)
      const startOfWeek = new Date(janFirst)
      startOfWeek.setDate(janFirst.getDate() + rangeIndex * 7)
    
      const monthName = startOfWeek.toLocaleString('default', { month: 'long' }) // e.g., "August"
      return `${timeLabels[rangeIndex]} (${monthName}) ${selectedYear}`
    }
    
  
    if (selectedMonth === 'all') {
      return `Year: ${selectedYear}`
    }
  
    return `${selectedMonth} ${selectedYear}`
  }
  


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

  type ClosedWonTrend = {
    closed_amount: number
    won_opportunities: number
    month: string
  }
  
  const [leadAreaChartData, setLeadAreaChartData] = useState<AreaData[]>([])
  const [, setLeadSourceDisplayMap] = useState<Record<string, string>>({})



  const currentYear = new Date().getFullYear()
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const currentMonthName = monthNames[new Date().getMonth()]
  
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  // Default now set to current month instead of "all"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName)
  const [selectedInterval, setSelectedInterval] = useState<string>('monthly')
  
  

  const [, setLeadSourceTotals] = useState<Record<string, number>>({})
  const [capturedByData, setCapturedByData] = useState<{ name: string; value: number }[]>([])
  const [, setTotalCapturedByCount] = useState(0)
  const [newestLeads, setNewestLeads] = useState<{ captured_by: string; contact_name: string; status: string }[]>([])


// 3. Add this function to fetch overall leads (add it with your other fetch functions)
const fetchOverallLeads = async (year: number, month: string, interval: string) => {
  let startDate: Date
  let endDate: Date

  if (interval === 'annually') {
    const minYear = Math.min(...availableYears) || year
    const maxYear = Math.max(...availableYears) || year
    startDate = new Date(minYear, 0, 1)
    endDate = new Date(maxYear + 1, 0, 1)
  } else {
    startDate = new Date(year, 0, 1)
    endDate = new Date(year + 1, 0, 1)

    if (month !== 'all') {
      const monthIndex = new Date(`${month} 1, ${year}`).getMonth()
      startDate = new Date(year, monthIndex, 1)
      endDate = new Date(year, monthIndex + 1, 1)
    }
  }

  const limit = 1000
  let offset = 0
  let allData: { first_contact: string | null }[] = []
  let done = false

  while (!done) {
    const { data, error } = await supabase
      .from('crm_leads')
      .select('first_contact')
      .gte('first_contact', startDate.toISOString())
      .lte('first_contact', endDate.toISOString())
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching overall leads:', error)
      return
    }

    if (!data || data.length < limit) {
      done = true
    }

    allData = allData.concat(data)
    offset += limit
  }

  const grouped: Record<string, number> = {}

  allData.forEach(({ first_contact }) => {
    if (!first_contact) return

    const normalizedDate = first_contact.split("T")[0]
    const [year, monthNum, day] = normalizedDate.split("-").map(Number)

    let xLabel = ''
    switch (interval) {
      case 'weekly': {
        const d = new Date(Date.UTC(year, monthNum - 1, day))
        const janFirst = new Date(Date.UTC(year, 0, 1))
        const dayOfYear = Math.floor((d.getTime() - janFirst.getTime()) / (1000 * 60 * 60 * 24)) + 1
        const week = Math.ceil(dayOfYear / 7)
        xLabel = `W${week}`
        break
      }
      case 'quarterly': {
        const quarter = Math.floor((monthNum - 1) / 3) + 1
        xLabel = `Q${quarter}`
        break
      }
      case 'annually': {
        xLabel = `${year}`
        break
      }
      default: {
        if (selectedMonth === 'all') {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          xLabel = monthNames[monthNum - 1]
        } else {
          const selectedMonthIndex = new Date(`${selectedMonth} 1, ${selectedYear}`).getMonth() + 1
          if (monthNum !== selectedMonthIndex) {
            return
          }
          xLabel = String(day).padStart(2, '0')
        }
      }
    }

    if (!grouped[xLabel]) grouped[xLabel] = 0
    grouped[xLabel] += 1

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
      if (month === 'all') {
        xValues = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      } else {
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth()
        const daysInSelectedMonth = new Date(year, monthIndex + 1, 0).getDate()
        xValues = Array.from(
          { length: daysInSelectedMonth },
          (_, i) => String(i + 1).padStart(2, '0')
        )
      }
      break
  }

  const formatted: OverallLeadsData[] = xValues.map((label) => ({
    label,
    totalLeads: grouped[label] || 0,
  }))

  setOverallLeadsData(formatted)
}



// Add this useEffect after the fetchOverallLeads function
useEffect(() => {
  fetchOverallLeads(selectedYear, selectedMonth, selectedInterval)
}, [selectedYear, selectedMonth, selectedInterval, availableYears])

  useEffect(() => {
    const checkLeadInputStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, id")
        .eq("id", user.id)
        .single();
  
      const SALES_EMAILS = [
        "kbg@petrosphere.com.ph",
        "dra@petrosphere.com.ph",
        "rlm@petrosphere.com.ph",
        "jlb@petrosphere.com.ph"
      ];
  
      if (!profile || !SALES_EMAILS.includes(profile.email)) return;
  
      const todayKey = `lead-reminder-shown-${user.id}-${new Date().toISOString().slice(0, 10)}`;
      const alreadyShown = localStorage.getItem(todayKey);
      if (alreadyShown) return;
  
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
  
      const { data: leadsToday, error } = await supabase
        .from("crm_leads")
        .select("id")
        .eq("user_id", profile.id)
        .gte("created_at", startOfToday.toISOString())
        .lte("created_at", endOfToday.toISOString());
  
      if (error) {
        console.error("Error checking today's leads:", error);
        return;
      }
  
      if (!leadsToday || leadsToday.length === 0) {
        toast("🚨 Reminder", {
          description: "You haven’t submitted your lead quota for today.",
          duration: Infinity, // Will not disappear until manually dismissed
          action: {
            label: "Dismiss",
            onClick: () => {},
          },
        });
  
        localStorage.setItem(todayKey, "true");
      }
    };
  
    checkLeadInputStatus();
  }, []);
  


  useEffect(() => {
    const fetchNewestLeads = async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('captured_by, contact_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(4)
  
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
        .lte('first_contact', endDate.toISOString())
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
  
  
  
  // Helper to normalize to YYYY-MM-DD string
function normalizeDateString(dateString: string) {
  return dateString.split("T")[0]  // e.g. "2024-09-30"
}

  
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
        .lte('first_contact', endDate.toISOString())
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
  
    const normalizedDate = first_contact.split("T")[0]
    const [year, monthNum, day] = normalizedDate.split("-").map(Number)

    let xLabel = ''
    switch (interval) {
      case 'weekly': {
        const d = new Date(Date.UTC(year, monthNum - 1, day))
        const janFirst = new Date(Date.UTC(year, 0, 1))
        const dayOfYear = Math.floor((d.getTime() - janFirst.getTime()) / (1000 * 60 * 60 * 24)) + 1
        const week = Math.ceil(dayOfYear / 7)
        xLabel = `W${week}`
        break
      }
      case 'quarterly': {
        const quarter = Math.floor((monthNum - 1) / 3) + 1
        xLabel = `Q${quarter}`
        break
      }
      case 'annually': {
        xLabel = `${year}`
        break
      }
      default: {
        if (selectedMonth === 'all') {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          xLabel = monthNames[monthNum - 1]
        } else {
          // ✅ CRITICAL FIX: Only include days that belong to the selected month
          const selectedMonthIndex = new Date(`${selectedMonth} 1, ${selectedYear}`).getMonth() + 1
          
          // Skip this record if it doesn't belong to the selected month
          if (monthNum !== selectedMonthIndex) {
            return // Don't process dates outside the selected month
          }
          
          xLabel = String(day).padStart(2, '0')
        }
      }
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
          if (month === 'all') {
            xValues = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          } else {
            // ✅ Get the actual number of days in the selected month
            const monthIndex = new Date(`${month} 1, ${year}`).getMonth()
            const daysInSelectedMonth = new Date(year, monthIndex + 1, 0).getDate()
            
            xValues = Array.from(
              { length: daysInSelectedMonth },
              (_, i) => String(i + 1).padStart(2, '0')
            )
          }
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
        .lte('first_contact', endDate.toISOString())
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
    if (previous === 0) {
      if (current === 0) {
        return { trend: 'up', change: '+0%' };
      } else {
        return { trend: 'up', change: 'New' }; // or 'N/A' or '' if you prefer
      }
    }
  
    const diff = current - previous;
    const percent = (diff / previous) * 100;
  
    return {
      trend: diff >= 0 ? 'up' : 'down',
      change: `${diff >= 0 ? '+' : ''}${percent.toFixed(1)}%`,
    };
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
    
      let prevStart = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      let prevEnd = new Date(startDate)


      switch (interval) {
        case 'weekly': {
          const janFirst = new Date(year, 0, 1);
          const start = new Date(janFirst);
          start.setDate(janFirst.getDate() + rangeIndex * 7);
          startDate = start;
          endDate = new Date(start);
          endDate.setDate(start.getDate() + 7);

          // Calculate previous week
          prevStart.setDate(startDate.getDate() - 7);
          prevEnd.setDate(startDate.getDate());
          break;
        }
        case 'quarterly': {
          const startMonth = rangeIndex * 3;
          startDate = new Date(year, startMonth, 1);
          endDate = new Date(year, startMonth + 3, 1);

          prevStart.setMonth(startMonth - 3);
          prevEnd.setMonth(startMonth);
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

          prevStart.setFullYear(labelYear - 1);
          prevEnd.setFullYear(labelYear);
          break;
        }
        
        default: {
          if (month !== 'all') {
            const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
            startDate = new Date(year, monthIndex, 1);
            endDate = new Date(year, monthIndex + 1, 1);
        
            prevStart = new Date(year, monthIndex - 1, 1);
            prevEnd = new Date(year, monthIndex, 1);
          } else {
            // All months selected → use entire year as current period
            startDate = new Date(year, 0, 1);
            endDate = new Date(year + 1, 0, 1);
        
            // Previous year range
            prevStart = new Date(year - 1, 0, 1);
            prevEnd = new Date(year, 0, 1);
          }
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
          .lte("first_contact", startDate.toISOString()),
    
        supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .ilike("status", "closed win")
          .gte("first_contact", startDate.toISOString())
          .lte("first_contact", endDate.toISOString()),
    
        supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .ilike("status", "closed win")
          .gte("first_contact", prevStart.toISOString())
          .lte("first_contact", prevEnd.toISOString()),
    
        supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .ilike("status", "closed lost")
          .gte("first_contact", startDate.toISOString())
          .lte("first_contact", endDate.toISOString()),
    
        supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .ilike("status", "closed lost")
          .gte("first_contact", prevStart.toISOString())
          .lte("first_contact", prevEnd.toISOString()),
    
        // Current In Progress (includes "Lead In")
        supabase
        .from("crm_leads")
        .select("id", { count: "exact", head: true })
        .or('status.ilike.%in progress%,status.ilike.%lead in%')
        .gte("first_contact", startDate.toISOString())
        .lte("first_contact", endDate.toISOString()),

        // Previous In Progress (includes "Lead In")
        supabase
        .from("crm_leads")
        .select("id", { count: "exact", head: true })
        .or('status.ilike.%in progress%,status.ilike.%lead in%')
        .gte("first_contact", prevStart.toISOString())
        .lte("first_contact", prevEnd.toISOString()),

        supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .gte("first_contact", startDate.toISOString())
          .lte("first_contact", endDate.toISOString()),
    
        supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .gte("first_contact", prevStart.toISOString())
          .lte("first_contact", prevEnd.toISOString()),
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
    .lte('first_contact', endDate.toISOString())
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
    .lte('first_contact', endDate.toISOString())
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
    .lte('first_contact', endDate.toISOString())
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
  





const makeSmoothTrendData = (
  chartData: { date: string; value: number }[]
) => {
  return chartData.slice(-4); // last 3 months + current
};


const handleOpenPrintView = () => {
  const reportData = {
    stats,
    areaChartData: leadAreaChartData,
    capturedByData,
    serviceData: serviceChartData,
    closedWonTrendData,
    crmFilters: {
      selectedYear,
      selectedMonth,
      selectedInterval,
      rangeIndex,
    }
  }
  localStorage.setItem('report-data', JSON.stringify(reportData))
  router.push('/dashboard/print-report')  // ✅ now safe to call
}


const [closedWonTrendData, setClosedWonTrendData] = useState<ClosedWonTrend[]>([])

const [closedWonRevenue, setClosedWonRevenue] = useState(0);
const fetchClosedWonRevenue = async (
  year: number,
  month: string,
  interval: string,
  rangeIndex: number
) => {
  let startDate = new Date(year, 0, 1);
  let endDate = new Date(year + 1, 0, 1);
  const label = timeLabels[rangeIndex];

  switch (interval) {
    case 'weekly': {
      const janFirst = new Date(year, 0, 1);
      startDate = new Date(janFirst);
      startDate.setDate(janFirst.getDate() + rangeIndex * 7);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    }
    case 'quarterly': {
      const startMonth = rangeIndex * 3;
      startDate = new Date(year, startMonth, 1);
      endDate = new Date(year, startMonth + 3, 1);
      break;
    }
    case 'annually': {
      const labelYear = parseInt(label);
      if (!label || isNaN(labelYear)) return;
      startDate = new Date(labelYear, 0, 1);
      endDate = new Date(labelYear + 1, 0, 1);
      break;
    }
    default: {
      if (month !== 'all') {
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
        startDate = new Date(year, monthIndex, 1);
        endDate = new Date(year, monthIndex + 1, 1);
      }
    }
  }

  // Redundant fallback (can be removed but safe)
  if (month !== 'all' && interval !== 'annually') {
    const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
    startDate = new Date(year, monthIndex, 1);
    endDate = new Date(year, monthIndex + 1, 1);
  }

  let totalRevenue = 0;
  const pageSize = 1000;
  let from = 0;
  let to = pageSize - 1;
  let done = false;

  while (!done) {
    const { data, error } = await supabase
      .from('crm_leads')
      .select('service_price')
      .ilike('status', 'Closed Win')
      .gte('first_contact', startDate.toISOString())
      .lte('first_contact', endDate.toISOString())
      .range(from, to);

    if (error) break;
    if (!data || data.length === 0) break;

    totalRevenue += data.reduce((sum, lead) => sum + (Number(lead.service_price) || 0), 0);

    if (data.length < pageSize) {
      done = true;
    } else {
      from += pageSize;
      to += pageSize;
    }
  }

  setClosedWonRevenue(totalRevenue);
};



const fetchClosedWonTrends = async () => {
  const pageSize = 1000
  let from = 0
  let to = pageSize - 1
  let allData: { first_contact: string; service_price: number | null }[] = []
  let done = false

  while (!done) {
    const { data, error } = await supabase
  .from('crm_leads')
  .select('first_contact, service_price')
  .or('status.neq.Lead In,status.neq.Closed Lost,status.neq.In Progress')
  .range(from, to)


    if (error) {
      console.error('Error fetching leads:', error)
      return []
    }

    if (!data || data.length === 0) break

    allData = allData.concat(data)

    if (data.length < pageSize) {
      done = true
    } else {
      from += pageSize
      to += pageSize
    }
  }

  const trends: Record<string, { closed_amount: number; won_opportunities: number }> = {}

  allData.forEach((lead) => {
    if (!lead.first_contact) return
  
    const date = new Date(lead.first_contact)
    const label = date.toLocaleString('default', { month: 'short', year: 'numeric' })
  
    if (!trends[label]) {
      trends[label] = { closed_amount: 0, won_opportunities: 0 }
    }
  
    // Only add price if it exists
    if (typeof lead.service_price === 'number') {
      trends[label].closed_amount += lead.service_price
    }
  
    trends[label].won_opportunities += 1
  })
  

  const sortedLabels = Object.keys(trends).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  )

  return sortedLabels.map((label) => ({
    month: label,
    ...trends[label],
  }))
}


useEffect(() => {
  const loadData = async () => {
    const trends = await fetchClosedWonTrends();
    setClosedWonTrendData(trends);
    fetchClosedWonRevenue(selectedYear, selectedMonth, selectedInterval, rangeIndex);
  };
  loadData();
}, [selectedYear, selectedMonth, selectedInterval, rangeIndex]);



type RevenueOpportunitiesTrend = {
  month: string;
  expectedRevenue: number;
  opportunitiesDue: number;
};

const [revenueOpportunitiesData, setRevenueOpportunitiesData] = useState<RevenueOpportunitiesTrend[]>([]);


const fetchRevenueAndOpportunitiesTrends = async () => {
  const pageSize = 1000;
  let from = 0;
  let to = pageSize - 1;
  let allData: { first_contact: string; service_price: number | null }[] = [];
  let done = false;

  while (!done) {
    const { data, error } = await supabase
      .from('crm_leads')
      .select('first_contact, service_price')
      .not('status', 'in', '("Lead In","Closed Lost","In Progress")')
      .range(from, to);
      console.log("Supabase data:", data);
console.log("Supabase error:", error);

    if (error) {
      console.error('Error fetching revenue/opportunity leads:', error);
      return [];
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);

    if (data.length < pageSize) {
      done = true;
    } else {
      from += pageSize;
      to += pageSize;
    }
  }

  const trends: Record<string, { expected_revenue: number; opportunities_due: number }> = {};

  allData.forEach((lead) => {
    if (!lead.first_contact) return;

    const date = new Date(lead.first_contact);
    const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });

    if (!trends[label]) {
      trends[label] = { expected_revenue: 0, opportunities_due: 0 };
    }

    // Only add price if it exists
    if (typeof lead.service_price === 'number') {
      trends[label].expected_revenue += lead.service_price;
    }

    trends[label].opportunities_due += 1;
  });

  const sortedLabels = Object.keys(trends).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return sortedLabels.map((label) => ({
    month: label,
    expectedRevenue: trends[label].expected_revenue,
    opportunitiesDue: trends[label].opportunities_due,
  }));
};

useEffect(() => {
  const loadData = async () => {
    const trends = await fetchRevenueAndOpportunitiesTrends();
    setRevenueOpportunitiesData(trends);
  };
  loadData();
}, []);

const [leadInLeads, setLeadInLeads] = useState<{ name: string; captured_by: string; created_at: string }[]>([])
const [closedWonLeads, setClosedWonLeads] = useState<{ name: string; captured_by: string; created_at: string }[]>([]);
const [closedLostLeads, setClosedLostLeads] = useState<{ name: string; captured_by: string; created_at: string }[]>([]);



const [userName, setUserName] = useState("")
const [userPosition, setUserPosition] = useState("")
// Fetch user name & position
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

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }
  
  const [loading, setLoading] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
// Fetch available months for dropdown (from Supabase)
useEffect(() => {
  fetch("/api/available-months")
  .then(res => res.json())
  .then(data => setAvailableMonths(data.months))
  .catch(() => setAvailableMonths([]));
  }, []);
  
  
  const handleGenerate = async (month: string) => {
  setLoading(true);
  
  
  try {
  const res = await fetch(`/api/send-weekly-reports?month=${month}`);
  const json = await res.json();
  
  
  if (!res.ok) throw new Error(json?.error || "Failed to send report");
  
  
  toast.success("Report sent successfully!");
  setTimeout(() => {
  router.push("/reports/success");
  }, 1000);
  } catch (err) {
  toast.error("Something went wrong.");
  } finally {
  setLoading(false);
  }
  };


const handleRefreshFilters = () => {
  fetchOverallLeads(selectedYear, selectedMonth, selectedInterval)
  fetchLeadsBySource(selectedYear, selectedMonth, selectedInterval)
  fetchCapturedByStats(selectedYear, selectedMonth, selectedInterval, rangeIndex)
  fetchTopServices(selectedYear, selectedMonth, selectedInterval, rangeIndex)
  toast.success("Dashboard refreshed!");
}

  return (
    <div>
    <SidebarInset>
      {/* Greeting + Total Leads */}
      <div className="flex pl-4 pb-6 items-center gap-3">
        {/* Icon that switches in dark mode */}
        <div className="w-10 h-10 relative">
          
          <Image
            src="/icons/black2.png"
            alt="Logo"
            fill
            className="object-contain block dark:hidden"
          />
        
          <Image
            src="/icons/white2.png"
            alt="Logo"
            fill
            className="object-contain hidden dark:block"
          />
        </div>

        {/* Text greeting */}
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {userName ? userName.split(" ")[0] : "User"}!
          </h1>
          {userPosition && (
            <p className="text-sm text-muted-foreground">{userPosition}</p>
          )}
        </div>
      </div>

      
      <div className="px-0 pb-2">
        <div className="text-sm font-semibold text-muted-foreground mb-1">
          Closed Won Revenue Goal
        </div>
        <div className="relative w-[10vw] h-1 bg-gray-300 dark:bg-zinc-700 rounded overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-blue-800 dark:bg-blue-600 transition-all duration-500"
            style={{
              width: `${Math.min(closedWonRevenue / 750000 * 100, 100)}%`
            }}
          />
        </div>
        <div className="text-xs mt-1 text-muted-foreground">
          ₱{closedWonRevenue.toLocaleString()} / ₱750,000
        </div>
      </div>

      <Separator className="mb-4" />


      <div className="flex justify-between pb-3">
        {/* Month Dropdown */}
       

        <div className='flex justify-end'>
        <Popover>
            <PopoverTrigger asChild>
            <Button
            disabled={loading}
            className="bg-background hover:bg-gray-100 dark:hover:bg-zinc-900 cursor-pointer flex items-center gap-2 dark:text-white text-black"
            >
            {loading ? (
            <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending...
            </>
            ) : (
            <>
            <Send className="w-4 h-4" />
            Generate Report
            </>
            )}
            </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px]">
            <p className="text-sm font-medium text-gray-600 mb-2">Select Month:</p>
            <ul className="space-y-1">
            {availableMonths.map((monthStr) => (
            <li key={monthStr}>
            <button
            className="w-full text-left text-sm text-blue-600 hover:underline"
            onClick={() => handleGenerate(monthStr)}
            >
            {format(parse(monthStr, "yyyy-MM", new Date()), "MMMM yyyy")}
            </button>
            </li>
            ))}
            </ul>
            </PopoverContent>
            </Popover>
        </div>
     
      </div>

     
<div id="print-section">
      
      {/* CRM Stats Grid */}
      <div  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* <StatCard
            label="Total Leads"
            value={stats.totalLeads.toString()}
            subtext="All leads recorded"
            className="bg-black dark:bg-white text-white dark:text-black"
          /> */}
          <StatCard
            label={
              selectedMonth === "all"
                ? selectedInterval === "annually"
                  ? `Leads in ${selectedYear}`
                  : `Leads in ${selectedYear}`
                : `Leads in ${selectedMonth} ${selectedYear}`
            }
            icon={<Users className="w-4 h-4" />} // ✅ icon here
            value={stats.leadsThisMonth.toString()}
            {...getTrend(stats.leadsThisMonth, stats.leadsLastMonth)}
            subtext={
              selectedMonth === "all"
                ? "Total leads in the selected year"
                : `New leads: ${selectedMonth} ${selectedYear}`
            }
            chartData={makeSmoothTrendData(
              leadAreaChartData.map((d) => ({
                date: d.date,
                value: Number(d.totalLeads),
              }))
            )}
            className="bg-black dark:bg-white text-white dark:text-black"
          />

          <StatCard
            label="In Progress"
            icon={<Hourglass className="w-4 h-4" />}
            value={stats.totalInProgress.toString()}
            {...getTrend(stats.totalInProgress, stats.inProgressPrev)}
            subtext="Currently active leads"
            className="bg-blue-600 dark:bg-blue-800 text-white dark:text-white"
            details={leadInLeads}
          />

          <StatCard
            label="Won"
            icon={<Trophy className="w-4 h-4" />}
            value={stats.closedLeads.toString()}
            {...getTrend(stats.closedLeads, stats.closedLeadsPrev)}
            subtext="Closed as won"
            className="bg-green-600 dark:bg-green-800 text-white dark:text-white"
            details={closedWonLeads}
          />

          <StatCard
            label="Lost"
            icon={<XCircle className="w-4 h-4" />}
            value={stats.closedLost.toString()}
            {...getTrend(stats.closedLost, stats.closedLostPrev)}
            subtext="Closed as lost"
            className="bg-red-600 dark:bg-red-800 text-white dark:text-white"
            details={closedLostLeads}
          />


 {/* Professional Card Design */}
 <div className="bg-card border-0 border-gray-200/60 rounded-xl p-4 shadow-lg hover:shadow-md transition-all duration-300 group">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-50 dark:bg-blue-50/20 rounded-md flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-200">
                <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <span className="text-sm font-medium text-zinc-600 dark:text-gray-300 tracking-wide">
                  Total Leads
                </span>
              </div>
            </div>
          </div>

          {/* Main Metric */}
          <div className="mb-2">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              <CountUp start={0} end={stats.totalLeads} duration={2} separator="," />
            </div>
            <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mt-3"></div>
          </div>
        </div>
        </div>




        {/* Chart 3: Captured By Personnel */}
        <div className="grid grid-cols-1 sm:grid-cols-[315px_1fr_450px] gap-4 pt-3 items-start">


              {/* Pie Chart with reduced size */}
              <div className="w-full max-w-xs ">
                <ChartPieCapturedBy data={capturedByData} />
              </div>

         {/* Sales Pipeline by Owner chart */}
         <div className="flex flex-col justify-between h-full min-h-[360px]">
         <CRMBarChart
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              selectedInterval={selectedInterval}
              rangeIndex={rangeIndex}
            />
          </div>


        {/* Newest leads */}
          
        <div data-html2canvas-ignore> 
            <Card className="flex-1 bg-background h-[380px] border-l-white-400">
              <CardHeader >
                <CardTitle className="text-xl">Newest Leads</CardTitle>
                <CardDescription>Most recently captured entries</CardDescription>
              </CardHeader>
              <CardContent>
        <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground mb-0 px-1">
          <div>Captured By</div>
          <div>Contact Name</div>
          <div className="text-right">Status</div>
        </div>

        <div  className="space-y-2" >
          {newestLeads.map((lead, idx) => {
            
            const rowStyle =
            idx === 0
              ? "text-lg font-semibold"
              : idx === 1
              ? "text-normal font-medium"
              : "text-sm text-muted-foreground"

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
                <div className="truncate text-sm">{lead.contact_name}</div>
                
                <div className="flex justify-end">
                <span
                    className={`inline-flex items-center px-2 py-0.5 text-[12px] rounded-full font-medium ${
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
          <div className="pt-0 text-center">
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
  <div className="py-3">
    
  
  <Card className="flex-1 bg-background border-0 shadow-lg">
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



  {/* NEW: Overall Leads Line Chart */}
  <div className="py-3">
    <OverallLeadsLineChart 
      data={overallLeadsData}
      selectedYear={selectedYear}
      selectedMonth={selectedMonth}
      selectedInterval={selectedInterval}
    />
  </div>

  <div className="pb-3 flex space-x-3 justify-evenly">
  <div className="flex-1">
    <ClosedWonTrendsChart data={closedWonTrendData} />
  </div>
  {/* <div className="flex-1">
  <RevenueOpportunitiesTrendsChart data={revenueOpportunitiesData} />
  </div> */}
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


    </SidebarInset>

    <FloatingDateFilter 
  selectedYear={selectedYear}
  setSelectedYear={setSelectedYear}
  selectedMonth={selectedMonth}
  setSelectedMonth={setSelectedMonth}
  selectedInterval={selectedInterval}
  setSelectedInterval={setSelectedInterval}
  rangeIndex={rangeIndex}
  setRangeIndex={setRangeIndex}
  availableYears={availableYears}
  timeLabels={timeLabels}
  onRefresh={handleRefreshFilters}
/>
  </div>
  )
}
