// app/leads-map/page.tsx
"use client"

import RegionHeatmap from "@/components/region-map"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function LeadsMapPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leads by Region Map</h1>
        <p className="text-muted-foreground mt-1">
          Visual representation of where Petrosphere has captured leads across the Philippines.
        </p>
      </div>

      <Separator />

      {/* Information Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
      </div>


      {/* Map Section */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Philippines Regional Heatmap</CardTitle>
          <CardDescription>
            Hover over a region to view its total leads. Pins indicate specific lead locations if available.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[650px]">
        <div style={{ height: "100%", width: "100%", borderRadius: "6px", overflow: "hidden" }}>
          <RegionHeatmap />
        </div>
        </CardContent>
      </Card>

      {/* Footer Notes */}
      <div className="text-sm text-muted-foreground mt-4">
        <p>
          📌 Data is sourced from the CRM database and updated in real-time.  
          Heat intensity reflects the relative number of leads in each region.  
          Use this map to plan marketing strategies and allocate resources effectively.
        </p>
      </div>
    </div>
  )
}
