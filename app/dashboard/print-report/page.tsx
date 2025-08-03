'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import html2pdf from 'html2pdf.js'

import { StatCard } from '@/components/dashboard/stat-card'
import { LeadSourceAreaChart } from '@/components/charts/area-chart'
import { ChartPieCapturedBy } from '@/components/charts/pie-chart'
import { ServiceBarChart } from '@/components/charts/bar-chart'
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

        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
            <CardDescription>Based on lead activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ServiceBarChart data={serviceData} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
