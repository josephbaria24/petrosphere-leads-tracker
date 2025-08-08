"use client"

import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import L from "leaflet"

type RegionCount = { region: string; count: number }

export default function RegionHeatmap() {
  const [regionCounts, setRegionCounts] = useState<RegionCount[]>([])
  const [geoData, setGeoData] = useState<any>(null)

  const customMarker = L.icon({
    iconUrl: "/pin.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
  useEffect(() => {
    const fetchRegions = async () => {
      const { data, error } = await supabase
        .from("crm_leads")
        .select("region")

      if (error) {
        console.error("Error fetching regions:", error)
        return
      }

      const counts: Record<string, number> = {}
      data?.forEach((lead) => {
        if (lead.region) {
          counts[lead.region] = (counts[lead.region] || 0) + 1
        }
      })

      setRegionCounts(
        Object.entries(counts).map(([region, count]) => ({ region, count }))
      )
    }

    const fetchGeoData = async () => {
      const res = await fetch("/ph_regions.geojson")
      const json = await res.json()
      setGeoData(json)
    }

    fetchRegions()
    fetchGeoData()
  }, [])

  const getColor = (count: number) => {
    return count > 50 ? "#800026" :
           count > 30 ? "#BD0026" :
           count > 20 ? "#E31A1C" :
           count > 10 ? "#FC4E2A" :
           count > 5  ? "#FD8D3C" :
           count > 0  ? "#FEB24C" :
                        "#FFEDA0"
  }

  const regionNameMap: Record<string, string> = {
    "Region IV-B - MIMAROPA Region": "MIMAROPA Region",
    "MIMAROPA Region": "MIMAROPA Region",
    "Region VI - Western Visayas": "Western Visayas",
    "Region IV-A - CALABARZON": "CALABARZON",
    "NCR - National Capital Region": "National Capital Region",
    "Region I - Ilocos Region": "Ilocos Region",
    "Region II - Cagayan Valley": "Cagayan Valley",
    "Region III - Central Luzon": "Central Luzon",
    "Region V - Bicol Region": "Bicol Region",
    "Region VII - Central Visayas": "Central Visayas",
    "Region VIII - Eastern Visayas": "Eastern Visayas",
    "Region IX - Zamboanga Peninsula": "Zamboanga Peninsula",
    "Region X - Northern Mindanao": "Northern Mindanao",
    "Region XI - Davao Region": "Davao Region",
    "Region XII - SOCCSKSARGEN": "SOCCSKSARGEN",
    "Region XIII - Caraga": "Caraga",
    "CAR - Cordillera Administrative Region": "Cordillera Administrative Region",
    "BARMM - Bangsamoro Autonomous Region in Muslim Mindanao": "Bangsamoro Autonomous Region"
  }

  const findCount = (geoName: string) => {
    const match = regionCounts.find(
      r => regionNameMap[r.region] === geoName || r.region === geoName
    )
    return match ? match.count : 0
  }

  const style = (feature: any) => {
    const geoName = feature.properties.NAME_1
    const count = findCount(geoName)
    return {
      fillColor: getColor(count),
      weight: 1,
      opacity: 1,
      color: "#333",
      dashArray: "3",
      fillOpacity: 0.7
    }
  }

  const onEachFeature = (feature: any, layer: any) => {
    const geoName = feature.properties.NAME_1
    const count = findCount(geoName)
    layer.bindPopup(`<strong>${geoName}</strong><br/>Leads: ${count}`)
  }

  const getFeatureCenter = (feature: any) => {
    const bounds = L.geoJSON(feature).getBounds()
    return bounds.getCenter()
  }

  return (
    <div style={{ height: "600px", width: "100%" }}>
      <MapContainer center={[12.8797, 121.7740]} zoom={5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoData && (
          <>
            <GeoJSON
              data={geoData}
              style={style}
              onEachFeature={onEachFeature}
            />
            {geoData.features.map((feature: any, idx: number) => {
              const center = getFeatureCenter(feature)
              const geoName = feature.properties.NAME_1
              const count = findCount(geoName)
              return (
                <Marker key={idx} position={center} icon={customMarker}>
                  <Popup>
                    <strong>{geoName}</strong><br />
                    Leads: {count}
                  </Popup>
                </Marker>
              )
            })}
          </>
        )}
      </MapContainer>
    </div>
  )
}
