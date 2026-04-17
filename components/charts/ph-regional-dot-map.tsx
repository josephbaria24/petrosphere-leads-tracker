'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { RefreshCw, MapPin } from 'lucide-react'
import {
  Map,
  MapCircleMarker,
  MapPopup,
  MapTileLayer,
  MapTooltip,
  MapZoomControl,
} from '@/components/ui/map'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'

type RegionCode =
  | 'NCR'
  | 'CAR'
  | 'R1'
  | 'R2'
  | 'R3'
  | 'R4A'
  | 'R4B'
  | 'R5'
  | 'R6'
  | 'R7'
  | 'R8'
  | 'R9'
  | 'R10'
  | 'R11'
  | 'R12'
  | 'R13'
  | 'BARMM'
  | 'NIR'

type RegionMeta = {
  name: string
  short: string
  lat: number
  lng: number
}

const REGION_META: Record<RegionCode, RegionMeta> = {
  NCR: { name: 'Metro Manila', short: 'NCR', lat: 14.5995, lng: 120.9842 },
  CAR: { name: 'Cordillera', short: 'CAR', lat: 17.35, lng: 121.0 },
  R1: { name: 'Ilocos Region', short: 'Region I', lat: 16.9, lng: 120.35 },
  R2: { name: 'Cagayan Valley', short: 'Region II', lat: 17.3, lng: 121.8 },
  R3: { name: 'Central Luzon', short: 'Region III', lat: 15.4, lng: 120.7 },
  R4A: { name: 'CALABARZON', short: 'Region IV-A', lat: 14.1, lng: 121.3 },
  R4B: { name: 'MIMAROPA', short: 'Region IV-B', lat: 9.8, lng: 118.75 },
  R5: { name: 'Bicol Region', short: 'Region V', lat: 13.4, lng: 123.4 },
  R6: { name: 'Western Visayas', short: 'Region VI', lat: 11.0, lng: 122.55 },
  R7: { name: 'Central Visayas', short: 'Region VII', lat: 10.3, lng: 123.9 },
  R8: { name: 'Eastern Visayas', short: 'Region VIII', lat: 11.5, lng: 125.0 },
  R9: {
    name: 'Zamboanga Peninsula',
    short: 'Region IX',
    lat: 7.9,
    lng: 122.1,
  },
  R10: { name: 'Northern Mindanao', short: 'Region X', lat: 8.3, lng: 124.75 },
  R11: { name: 'Davao Region', short: 'Region XI', lat: 7.1, lng: 125.6 },
  R12: { name: 'SOCCSKSARGEN', short: 'Region XII', lat: 6.5, lng: 124.85 },
  R13: { name: 'Caraga', short: 'Region XIII', lat: 8.8, lng: 125.75 },
  BARMM: { name: 'BARMM', short: 'BARMM', lat: 6.95, lng: 124.25 },
  NIR: { name: 'Negros Island', short: 'NIR', lat: 10.2, lng: 123.1 },
}

const DB_REGION_MAP: Record<string, RegionCode> = {
  'Region I - Ilocos Region': 'R1',
  'Region II - Cagayan Valley': 'R2',
  'Region III - Central Luzon': 'R3',
  'Region IV-A - CALABARZON': 'R4A',
  'Region IV-B - MIMAROPA Region': 'R4B',
  'Region V - Bicol Region': 'R5',
  'Region VI - Western Visayas': 'R6',
  'Region VII - Central Visayas': 'R7',
  'Region VIII - Eastern Visayas': 'R8',
  'Region IX - Zamboanga Peninsula': 'R9',
  'Region X - Northern Mindanao': 'R10',
  'Region XI - Davao Region': 'R11',
  'Region XII - SOCCSKSARGEN': 'R12',
  'Region XIII - Caraga': 'R13',
  'NCR - National Capital Region': 'NCR',
  'CAR - Cordillera Administrative Region': 'CAR',
  'BARMM - Bangsamoro Autonomous Region in Muslim Mindanao': 'BARMM',
  'NIR - Negros Island Region': 'NIR',
}

// Philippines bounding box: SW (Tawi-Tawi) to NE (Batanes)
const PH_CENTER: LatLngExpression = [12.4, 122.4]
const PH_BOUNDS: LatLngBoundsExpression = [
  [4.2, 115.5],
  [21.5, 127.5],
]

function formatRelative(d: Date | null): string {
  if (!d) return 'just now'
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 10) return 'just now'
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

type Props = {
  title?: string
  subtitle?: string
  maxRows?: number
}

export function PHRegionalDotMap({
  title = 'Leads by Region',
  subtitle = 'Regional distribution across the Philippines',
  maxRows = 8,
}: Props) {
  const [regionCounts, setRegionCounts] = useState<Record<RegionCode, number>>(
    () => {
      const base = {} as Record<RegionCode, number>
      ;(Object.keys(REGION_META) as RegionCode[]).forEach((c) => (base[c] = 0))
      return base
    },
  )
  const [totalLeads, setTotalLeads] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('crm_leads').select('region')

    if (error) {
      console.error('PH Regional Map fetch error:', error)
      setLoading(false)
      return
    }

    const counts = {} as Record<RegionCode, number>
    ;(Object.keys(REGION_META) as RegionCode[]).forEach((c) => (counts[c] = 0))

    ;(data || []).forEach((lead: { region: string | null }) => {
      if (lead.region) {
        const code = DB_REGION_MAP[lead.region]
        if (code) counts[code] = (counts[code] || 0) + 1
      }
    })

    setRegionCounts(counts)
    setTotalLeads((data || []).length)
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

  const ranked = useMemo(() => {
    return (Object.entries(regionCounts) as [RegionCode, number][])
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxRows)
  }, [regionCounts, maxRows])

  const activeRegions = useMemo(
    () =>
      (Object.values(regionCounts) as number[]).filter((c) => c > 0).length,
    [regionCounts],
  )

  const maxCount = useMemo(
    () => Math.max(1, ...(Object.values(regionCounts) as number[])),
    [regionCounts],
  )

  // Radius in pixels, scaled by lead share. Empty regions still get a tiny marker.
  const radiusFor = (count: number): number => {
    if (count <= 0) return 4
    const ratio = count / maxCount
    return 6 + Math.sqrt(ratio) * 18
  }

  // We override the wrapper's default `fill-foreground stroke-foreground`
  // classes because CSS `fill:` beats the SVG `fill=""` attribute Leaflet sets.
  // tailwind-merge keeps the later `fill-*` / `stroke-*` so ours wins.
  const tierClassFor = (count: number): string => {
    if (count <= 0)
      return 'fill-zinc-400/40 stroke-zinc-500/70 stroke-1'
    const ratio = count / maxCount
    if (ratio > 0.66)
      return 'fill-emerald-500/80 stroke-emerald-600 stroke-2'
    if (ratio > 0.33)
      return 'fill-emerald-400/70 stroke-emerald-500 stroke-2'
    return 'fill-emerald-300/60 stroke-emerald-400 stroke-1'
  }

  return (
    <div className="w-full bg-card border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-4 relative overflow-hidden">
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-bold leading-none tabular-nums">
            {totalLeads.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Total leads
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-4 items-stretch">
        <ul className="space-y-2 self-start">
          {ranked.map(([code, count], i) => {
            const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0
            const meta = REGION_META[code]
            const isTop = i === 0
            return (
              <li key={code} className="flex items-center gap-3 text-xs">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isTop
                      ? 'bg-emerald-500'
                      : 'bg-emerald-400/80 dark:bg-emerald-500/70'
                  }`}
                />
                <span className="flex-1 truncate text-foreground/90">
                  {meta.name}
                </span>
                <span className="tabular-nums text-muted-foreground w-10 text-right">
                  {pct.toFixed(0)}%
                </span>
              </li>
            )
          })}

          {ranked.length === 0 && (
            <li className="text-xs text-muted-foreground py-4 text-center">
              No regional data yet.
            </li>
          )}
        </ul>

        <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 min-h-[260px] h-[280px]">
          <Map
            center={PH_CENTER}
            zoom={5}
            minZoom={5}
            maxZoom={9}
            maxBounds={PH_BOUNDS}
            maxBoundsViscosity={1.0}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            className="!min-h-0 h-full w-full rounded-lg"
          >
            <MapTileLayer />
            <MapZoomControl />

            {(Object.entries(regionCounts) as [RegionCode, number][]).map(
              ([code, count]) => {
                const meta = REGION_META[code]
                const pct =
                  totalLeads > 0 ? (count / totalLeads) * 100 : 0
                return (
                  <MapCircleMarker
                    key={code}
                    center={[meta.lat, meta.lng]}
                    radius={radiusFor(count)}
                    className={tierClassFor(count)}
                  >
                    <MapTooltip>
                      <span className="font-semibold">{meta.name}</span>
                    </MapTooltip>
                    <MapPopup>
                      <div className="min-w-[160px]">
                        <div className="font-semibold text-sm mb-1">
                          {meta.name}
                        </div>
                        <div className="text-xs text-muted-foreground mb-0.5">
                          {meta.short}
                        </div>
                        <div className="flex justify-between text-xs mt-2">
                          <span className="text-muted-foreground">Leads</span>
                          <span className="font-semibold tabular-nums">
                            {count.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs mt-0.5">
                          <span className="text-muted-foreground">Share</span>
                          <span className="font-mono tabular-nums">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </MapPopup>
                  </MapCircleMarker>
                )
              },
            )}
          </Map>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">
          {activeRegions} active {activeRegions === 1 ? 'region' : 'regions'}
          <span className="hidden">{tick}</span>
          {lastUpdated && (
            <span className="ml-2">· updated {formatRelative(lastUpdated)}</span>
          )}
        </span>
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-60"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  )
}

export default PHRegionalDotMap
