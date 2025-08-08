'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import html2pdf from 'html2pdf.js'
import ClosedWonTrendsChart from '@/components/charts/line-chart'
import { StatCard } from '@/components/dashboard/stat-card'
import { LeadSourceAreaChart } from '@/components/charts/area-chart'
import { ChartPieCapturedBy } from '@/components/charts/pie-chart'
import { ServiceBarChart } from '@/components/charts/bar-chart'
import CRMBarChart from '@/components/charts/bar-chart-2'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// TYPES
interface Stats {
  totalLeads: number
  totalInProgress: number
  closedLeads: number
  closedLost: number
  leadsThisMonth: number
}

interface LeadDataPoint {
    date: string
    [leadSource: string]: string | number
  }
  

interface BarData {
  service_product: string
  count: number
}

interface CapturedBy {
  name: string
  value: number
}

export default function PrintReportPage() {

  const [closedWonTrendData, setClosedWonTrendData] = useState<any[]>([])
  const [crmFilters, setCrmFilters] = useState({
    selectedYear: new Date().getFullYear(),
    selectedMonth: 'all',
    selectedInterval: 'monthly',
    rangeIndex: 0
  })
  
  const router = useRouter()
  const reportRef = useRef<HTMLDivElement>(null)
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    totalInProgress: 0,
    closedLeads: 0,
    closedLost: 0,
    leadsThisMonth: 0,
  })
  const [areaChartData, setAreaChartData] = useState<LeadDataPoint[]>([])
  const [capturedByData, setCapturedByData] = useState<CapturedBy[]>([])
  const [serviceData, setServiceData] = useState<BarData[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    const local = localStorage.getItem('report-data')
    if (local) {
      const parsed = JSON.parse(local)
      setStats(parsed.stats)
      setAreaChartData(parsed.areaChartData)
      setCapturedByData(parsed.capturedByData)
      setServiceData(parsed.serviceData)
      setClosedWonTrendData(parsed.closedWonTrendData || []) // ✅ new
      setCrmFilters(parsed.crmFilters || crmFilters) // ✅
      
    } else {
      router.replace('/dashboard')
    }
  }, [router])

  const handlePrintPDF = () => {
    const element = reportRef.current
    if (!element) return

    setIsGenerating(true)

    element.style.transform = 'scale(0.85)'
    element.style.transformOrigin = 'top left'
    element.style.width = '117%'

    element.querySelectorAll<HTMLElement>('*').forEach(el => {
      const computed = getComputedStyle(el)
      ;['color', 'backgroundColor', 'borderColor'].forEach(prop => {
        const val = computed.getPropertyValue(prop)
        if (val.includes('lab') || val.includes('oklch')) {
          el.style.setProperty(prop, '#000000')
        }
      })
    })

    setTimeout(() => {
      html2pdf()
        .from(element)
        .set({
          margin: 0.5,
          filename: `high-quality-report.pdf`,
          html2canvas: {
            scale: 3.5,
            useCORS: true,
            backgroundColor: '#ffffff',
          },
          jsPDF: {
            unit: 'in',
            format: 'a4',
            orientation: 'portrait',
            precision: 16,
          },
        })
        .save()
        .then(() => {
          element.style.transform = ''
          element.style.transformOrigin = ''
          element.style.width = ''
          setIsGenerating(false)
        })
        .catch((err: unknown) => {
          console.error('PDF generation failed:', err)
          setIsGenerating(false)
        })
    }, 300)
  }

  return (
    <div className="p-6 bg-white text-black space-y-6">
      <h1 className="text-3xl font-bold">CRM Report</h1>

      <div className="flex gap-3">
        <Button onClick={handlePrintPDF} disabled={isGenerating}>
          {isGenerating ? 'Generating PDF...' : 'Download PDF'}
        </Button>
        <Button onClick={() => router.back()} variant="outline">
          Go Back
        </Button>
      </div>
      

      <div ref={reportRef} id="print-section" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total Leads" value={stats.totalLeads.toString()} subtext="All leads" />
          <StatCard label="In Progress" value={stats.totalInProgress.toString()} subtext="Leads in progress" />
          <StatCard label="Win" value={stats.closedLeads.toString()} subtext="Closed wins" />
          <StatCard label="Lost" value={stats.closedLost.toString()} subtext="Closed losses" />
          <StatCard label="This Month" value={stats.leadsThisMonth.toString()} subtext="Recent leads" />
        </div>
{/* CRM Bar Chart */}
<Card>
  <CardHeader>
    <CardTitle>Sales Pipeline by Owner</CardTitle>
  </CardHeader>
  <CardContent>
    <CRMBarChart
      selectedYear={crmFilters.selectedYear}
      selectedMonth={crmFilters.selectedMonth}
      selectedInterval={crmFilters.selectedInterval}
      rangeIndex={crmFilters.rangeIndex}
    />
  </CardContent>
</Card>
        <div className="grid grid-cols-2 gap-6">
          <ChartPieCapturedBy data={capturedByData} />
          <Card>
            <CardHeader>
              <CardTitle>Lead Captures Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadSourceAreaChart data={areaChartData} />
            </CardContent>
          </Card>
        </div>
        {/* Closed Won Trends */}
        <div className="pb-3 flex space-x-3 justify-evenly">
          <div className="flex-1">
            <ClosedWonTrendsChart data={closedWonTrendData} />
          </div>
          <div className="flex-1">
            <ClosedWonTrendsChart data={closedWonTrendData} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
            <CardDescription>Based on lead activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ServiceBarChart data={serviceData} />
          </CardContent>
        </Card>
        {/* Summary Report */}
<Card>
  <CardHeader>
    <CardTitle>Summary Report</CardTitle>
    <CardDescription>Insights based on the selected CRM period</CardDescription>
  </CardHeader>
  <CardContent className="space-y-3 text-sm">
    <p>
      In the selected period, a total of <strong>{stats.totalLeads}</strong> leads were recorded.
      Of these, <strong>{stats.closedLeads}</strong> ({((stats.closedLeads / stats.totalLeads) * 100 || 0).toFixed(1)}%) 
      were closed as wins, <strong>{stats.closedLost}</strong> ({((stats.closedLost / stats.totalLeads) * 100 || 0).toFixed(1)}%) 
      were closed as losses, and <strong>{stats.totalInProgress}</strong> are still in progress.
    </p>

    {serviceData.length > 0 && (
      <p>
        The most requested service/product was 
        <strong> {serviceData[0].service_product}</strong> 
        with <strong>{serviceData[0].count}</strong> leads.
      </p>
    )}

    {capturedByData.length > 0 && (
      <p>
        The top lead capturer was 
        <strong> {capturedByData[0].name}</strong> 
        with <strong>{capturedByData[0].value}</strong> leads, 
        representing {((capturedByData[0].value / capturedByData.reduce((sum, c) => sum + c.value, 0)) * 100).toFixed(1)}% 
        of total captures.
      </p>
    )}

    {closedWonTrendData.length > 1 && (() => {
      const first = closedWonTrendData[0].closed_amount;
      const last = closedWonTrendData[closedWonTrendData.length - 1].closed_amount;
      const diff = last - first;
      const pctChange = ((diff / first) * 100).toFixed(1);
      return (
        <p>
          Closed Won revenue changed from <strong>{first.toLocaleString()}</strong> to 
          <strong> {last.toLocaleString()}</strong>, a {diff >= 0 ? 'growth' : 'decline'} of {pctChange}% 
          over the tracked period.
        </p>
      );
    })()}
  </CardContent>
</Card>

      </div>
    </div>
  )
}
