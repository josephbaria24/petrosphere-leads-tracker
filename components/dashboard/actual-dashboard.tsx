/* eslint-disable react-hooks/exhaustive-deps */
//actual-dashboard.tsx
'use client'

import { OverallLeadsLineChart } from '@/components/charts/line-chart-label'
import { useEffect, useMemo, useRef, useState } from 'react'
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


// ─── Helpers ─────────────────────────────────────────────────

function generateTimeLabels(interval: string, month: string, year: number, availableYears: number[]): string[] {
  switch (interval) {
    case 'all':
      return availableYears.map(String)
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

/** Map UI interval + month to SQL bucket param */
function getBucket(interval: string, month: string): string {
  if (interval === 'all') return 'year'
  if (interval === 'weekly') return 'week'
  if (interval === 'quarterly') return 'quarter'
  if (interval === 'annually') return 'year'
  if (month === 'all') return 'month'
  return 'day'
}

/** Safe key for Recharts data keys */
function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')
}

/** Compute stats range, previous range, and chart range from filter state */
function computeDateRange(
  year: number,
  month: string,
  interval: string,
  rangeIndex: number,
  timeLabels: string[],
  availableYears: number[]
): { start: string; end: string; prevStart: string; prevEnd: string; chartStart: string; chartEnd: string } | null {

  // ── Stats range (depends on rangeIndex) ──
  let startDate = new Date(year, 0, 1)
  let endDate = new Date(year + 1, 0, 1)
  let prevStart = new Date(year - 1, 0, 1)
  let prevEnd = new Date(year, 0, 1)

  if (month !== 'all') {
    const mi = new Date(`${month} 1, ${year}`).getMonth()
    startDate = new Date(year, mi, 1)
    endDate = new Date(year, mi + 1, 1)
    prevStart = new Date(year, mi - 1, 1)
    prevEnd = new Date(year, mi, 1)
  }

  switch (interval) {
    case 'all': {
      const minY = Math.min(...(availableYears.length ? availableYears : [year]))
      const maxY = Math.max(...(availableYears.length ? availableYears : [year]))
      startDate = new Date(minY, 0, 1)
      endDate = new Date(maxY + 1, 0, 1)
      prevStart = new Date(minY - 1, 0, 1)
      prevEnd = new Date(minY, 0, 1)
      break
    }
    case 'weekly': {
      const janFirst = new Date(year, 0, 1)
      const s = new Date(janFirst)
      s.setDate(janFirst.getDate() + rangeIndex * 7)
      startDate = s
      endDate = new Date(s)
      endDate.setDate(s.getDate() + 7)
      prevStart = new Date(startDate)
      prevStart.setDate(startDate.getDate() - 7)
      prevEnd = new Date(startDate)
      break
    }
    case 'quarterly': {
      const sm = rangeIndex * 3
      startDate = new Date(year, sm, 1)
      endDate = new Date(year, sm + 3, 1)
      prevStart = new Date(year, sm - 3, 1)
      prevEnd = new Date(year, sm, 1)
      break
    }
    case 'annually': {
      const label = timeLabels[rangeIndex]
      const ly = parseInt(label)
      if (!label || isNaN(ly)) return null
      startDate = new Date(ly, 0, 1)
      endDate = new Date(ly + 1, 0, 1)
      prevStart = new Date(ly - 1, 0, 1)
      prevEnd = new Date(ly, 0, 1)
      break
    }
  }

  // ── Chart range (wider, for line/area charts — NOT rangeIndex-dependent) ──
  let chartStart: Date
  let chartEnd: Date

  if (interval === 'annually' || interval === 'all') {
    const minY = Math.min(...(availableYears.length ? availableYears : [year]))
    const maxY = Math.max(...(availableYears.length ? availableYears : [year]))
    chartStart = new Date(minY, 0, 1)
    chartEnd = new Date(maxY + 1, 0, 1)
  } else if (month !== 'all') {
    const mi = new Date(`${month} 1, ${year}`).getMonth()
    chartStart = new Date(year, mi, 1)
    chartEnd = new Date(year, mi + 1, 1)
  } else {
    chartStart = new Date(year, 0, 1)
    chartEnd = new Date(year + 1, 0, 1)
  }

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return {
    start: fmt(startDate),
    end: fmt(endDate),
    prevStart: fmt(prevStart),
    prevEnd: fmt(prevEnd),
    chartStart: fmt(chartStart),
    chartEnd: fmt(chartEnd),
  }
}


// ─── Component ───────────────────────────────────────────────

export function ActualDashboardPage() {

  type OverallLeadsData = {
    label: string
    totalLeads: number
  }
  const [overallLeadsData, setOverallLeadsData] = useState<OverallLeadsData[]>([])

  const supabase = useMemo(() => createClientComponentClient(), [])

  const getDateHeaderLabel = () => {
    if (selectedInterval === 'all') {
      return 'All Time'
    }
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
      const monthName = startOfWeek.toLocaleString('default', { month: 'long' })
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

  const currentYear = new Date().getFullYear()
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const currentMonthName = monthNames[new Date().getMonth()]

  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName)
  const [selectedInterval, setSelectedInterval] = useState<string>('monthly')

  const [capturedByData, setCapturedByData] = useState<{ name: string; value: number }[]>([])
  const [newestLeads, setNewestLeads] = useState<{ captured_by: string; contact_name: string; status: string }[]>([])

  const timeLabels = generateTimeLabels(selectedInterval, selectedMonth, selectedYear, availableYears)

  const [closedWonTrendData, setClosedWonTrendData] = useState<ClosedWonTrend[]>([])
  const [closedWonRevenue, setClosedWonRevenue] = useState(0)

  type RevenueOpportunitiesTrend = {
    month: string;
    expectedRevenue: number;
    opportunitiesDue: number;
  };
  const [revenueOpportunitiesData, setRevenueOpportunitiesData] = useState<RevenueOpportunitiesTrend[]>([]);

  const [leadInLeads, setLeadInLeads] = useState<{ name: string; captured_by: string; created_at: string }[]>([])
  const [closedWonLeads, setClosedWonLeads] = useState<{ name: string; captured_by: string; created_at: string }[]>([]);
  const [closedLostLeads, setClosedLostLeads] = useState<{ name: string; captured_by: string; created_at: string }[]>([]);

  const [userName, setUserName] = useState("")
  const [userPosition, setUserPosition] = useState("")

  const [loading, setLoading] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Prefetch cache (simple Map via ref)
  const prefetchCache = useRef<Map<string, any>>(new Map())

  // ─── Profile / Auth ──────────────────────────────────────

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

  // ─── Lead Reminder ───────────────────────────────────────

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
          description: "You haven't submitted your lead quota for today.",
          duration: Infinity,
          action: {
            label: "Dismiss",
            onClick: () => { },
          },
        });
        localStorage.setItem(todayKey, "true");
      }
    };
    checkLeadInputStatus();
  }, []);

  // ─── Available Years (init) ──────────────────────────────

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

  // ─── Core: loadDashboard via RPC ─────────────────────────

  const loadDashboard = async () => {
    const range = computeDateRange(
      selectedYear, selectedMonth, selectedInterval,
      rangeIndex, timeLabels, availableYears
    )
    if (!range) return

    const bucket = getBucket(selectedInterval, selectedMonth)

    // Check prefetch cache first
    const cacheKey = `${range.start}_${range.end}_${range.chartStart}_${range.chartEnd}_${bucket}`
    const cached = prefetchCache.current.get(cacheKey)
    if (cached) {
      prefetchCache.current.delete(cacheKey)
      mapRpcToState(cached, bucket)
      return
    }

    const { data, error } = await supabase.rpc('dashboard_summary', {
      p_start: range.start,
      p_end: range.end,
      p_prev_start: range.prevStart,
      p_prev_end: range.prevEnd,
      p_chart_start: range.chartStart,
      p_chart_end: range.chartEnd,
      p_bucket: bucket,
    })

    if (error) {
      console.error('Dashboard RPC error:', error)
      toast.error('Failed to load dashboard data')
      return
    }

    mapRpcToState(data, bucket)
  }

  /** Map RPC JSON response into component state */
  const mapRpcToState = (data: any, bucket: string) => {
    const k = data.kpis || {}

    // KPIs
    setStats({
      totalLeads: k.totalLeads ?? 0,
      totalLeadsPrev: 0,
      closedLeads: k.won ?? 0,
      closedLeadsPrev: k.wonPrev ?? 0,
      closedLost: k.lost ?? 0,
      closedLostPrev: k.lostPrev ?? 0,
      leadsThisMonth: k.leadsThisPeriod ?? 0,
      leadsLastMonth: k.leadsLastPeriod ?? 0,
      totalInProgress: k.inProgress ?? 0,
      inProgressPrev: k.inProgressPrev ?? 0,
    })

    setClosedWonRevenue(k.wonRevenue ?? 0)

    // Newest leads
    setNewestLeads(data.newest || [])

    // Captured By
    setCapturedByData(data.capturedBy || [])

    // Top Services
    setServiceChartData(data.topServices || [])

    // Overall Series → fill in zero-gap labels from generateTimeLabels
    const labels = generateTimeLabels(selectedInterval, selectedMonth, selectedYear, availableYears)
    const seriesMap: Record<string, number> = {}
      ; (data.overallSeries || []).forEach((r: any) => { seriesMap[r.label] = r.total_leads })
    setOverallLeadsData(labels.map(label => ({ label, totalLeads: seriesMap[label] || 0 })))

    // Lead Source Series → pivot from flat rows to wide format
    const srcRows: { label: string; source: string; count: number }[] = data.leadSourceSeries || []
    const uniqueSources = new Set<string>()
    const grouped: Record<string, Record<string, number>> = {}

    srcRows.forEach(({ label, source, count }) => {
      const nk = normalizeKey(source)
      uniqueSources.add(nk)
      if (!grouped[label]) grouped[label] = {}
      grouped[label][nk] = count
    })

    const sources = Array.from(uniqueSources)
    const formatted: AreaData[] = labels.map(label => {
      const row: AreaData = { date: label }
      sources.forEach(s => { row[s] = grouped[label]?.[s] || 0 })
      return row
    })
    setLeadAreaChartData(formatted)

    // Detail lists for stat cards
    setLeadInLeads(data.leadInLeads || [])
    setClosedWonLeads(data.closedWonLeads || [])
    setClosedLostLeads(data.closedLostLeads || [])
  }

  // ─── Main data effect ────────────────────────────────────

  useEffect(() => {
    loadDashboard()
  }, [selectedYear, selectedMonth, selectedInterval, rangeIndex, availableYears])

  // ─── Background prefetch for adjacent rangeIndex ─────────

  useEffect(() => {
    const prefetch = async (idx: number) => {
      const range = computeDateRange(
        selectedYear, selectedMonth, selectedInterval,
        idx, timeLabels, availableYears
      )
      if (!range) return
      const bucket = getBucket(selectedInterval, selectedMonth)
      const key = `${range.start}_${range.end}_${range.chartStart}_${range.chartEnd}_${bucket}`
      if (prefetchCache.current.has(key)) return

      const { data } = await supabase.rpc('dashboard_summary', {
        p_start: range.start,
        p_end: range.end,
        p_prev_start: range.prevStart,
        p_prev_end: range.prevEnd,
        p_chart_start: range.chartStart,
        p_chart_end: range.chartEnd,
        p_bucket: bucket,
      })
      if (data) prefetchCache.current.set(key, data)
    }

    // Prefetch next & previous range
    if (rangeIndex < timeLabels.length - 1) prefetch(rangeIndex + 1)
    if (rangeIndex > 0) prefetch(rangeIndex - 1)
  }, [rangeIndex, selectedYear, selectedMonth, selectedInterval])

  // ─── Closed-Won Trends (all-time, separate query) ───────

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

      if (error) { console.error('Error fetching leads:', error); return [] }
      if (!data || data.length === 0) break

      allData = allData.concat(data)
      if (data.length < pageSize) { done = true } else { from += pageSize; to += pageSize }
    }

    const trends: Record<string, { closed_amount: number; won_opportunities: number }> = {}

    allData.forEach((lead) => {
      if (!lead.first_contact) return
      const date = new Date(lead.first_contact)
      const label = date.toLocaleString('default', { month: 'short', year: 'numeric' })
      if (!trends[label]) { trends[label] = { closed_amount: 0, won_opportunities: 0 } }
      if (typeof lead.service_price === 'number') { trends[label].closed_amount += lead.service_price }
      trends[label].won_opportunities += 1
    })

    const sortedLabels = Object.keys(trends).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    )
    return sortedLabels.map((label) => ({ month: label, ...trends[label] }))
  }

  useEffect(() => {
    const loadData = async () => {
      const trends = await fetchClosedWonTrends();
      setClosedWonTrendData(trends || []);
    };
    loadData();
  }, [selectedYear, selectedMonth, selectedInterval, rangeIndex]);

  // ─── Helpers ─────────────────────────────────────────────

  function getTrend(current: number, previous: number): { trend: 'up' | 'down'; change: string } {
    if (previous === 0) {
      if (current === 0) return { trend: 'up', change: '+0%' }
      return { trend: 'up', change: 'New' }
    }
    const diff = current - previous
    const percent = (diff / previous) * 100
    return {
      trend: diff >= 0 ? 'up' : 'down',
      change: `${diff >= 0 ? '+' : ''}${percent.toFixed(1)}%`,
    }
  }

  const makeSmoothTrendData = (
    chartData: { date: string; value: number }[]
  ) => {
    return chartData.slice(-4);
  };

  const handleOpenPrintView = () => {
    const reportData = {
      stats,
      areaChartData: leadAreaChartData,
      capturedByData,
      serviceData: serviceChartData,
      closedWonTrendData,
      crmFilters: { selectedYear, selectedMonth, selectedInterval, rangeIndex }
    }
    localStorage.setItem('report-data', JSON.stringify(reportData))
    router.push('/dashboard/print-report')
  }

  // Available months for report
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
      const contentType = res.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        const json = await res.json();
        throw new Error(json?.error || json?.message || "Failed to generate report");
      }

      if (!res.ok) throw new Error("Failed to generate report");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Monthly_Report_${month.replace('-', '_')}.pdf`;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      toast.success("Report downloaded successfully!");
    } catch (err: any) {
      console.error('Download error:', err);
      toast.error(err?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshFilters = () => {
    prefetchCache.current.clear()
    loadDashboard()
    toast.success("Dashboard refreshed!")
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }


  // ─── JSX ─────────────────────────────────────────────────

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label={
                selectedInterval === "all"
                  ? "All Leads"
                  : selectedMonth === "all"
                    ? selectedInterval === "annually"
                      ? `Leads in ${selectedYear}`
                      : `Leads in ${selectedYear}`
                    : `Leads in ${selectedMonth} ${selectedYear}`
              }
              icon={<Users className="w-4 h-4" />}
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

                  <div className="space-y-2" >
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
                              className={`inline-flex items-center px-2 py-0.5 text-[12px] rounded-full font-medium ${status.className || "bg-gray-400 text-white"
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
