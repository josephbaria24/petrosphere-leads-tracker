"use client"

import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import L from "leaflet"

type RegionCount = { region: string; count: number }

export default function RegionHeatmap() {
  const [regionCounts, setRegionCounts] = useState<RegionCount[]>([])
  const [geoData, setGeoData] = useState<any>(null)

  const regionMarkerCoords: Record<string, [number, number]> = {
    "Ilocos Region": [16.048498, 120.511297 ],
    "Cagayan Valley": [17.3, 121.7],
    "Central Luzon": [15.2, 120.9],
    "CALABARZON": [14.1, 121.3],
    "MIMAROPA Region": [10.2, 119.0],
    "Bicol Region": [13.3, 123.4],
    "Western Visayas": [10.6, 122.5],
    "Central Visayas": [9.8, 123.3],
    "Eastern Visayas": [11.2, 124.8],
    "Zamboanga Peninsula": [7.9, 123.0],
    "Northern Mindanao": [8.181906, 124.922944],
    "Davao Region": [7.3, 125.7],
    "SOCCSKSARGEN": [6.9, 124.9],
    "Caraga": [8.820247, 125.712667],
    "Bangsamoro Autonomous Region": [6.8, 124.3],
    "Cordillera Administrative Region": [17.5, 121.1],
    "Negros Island Region": [10.2, 123.1],
    "National Capital Region": [14.6, 121.0],
    "Autonomous Region in Muslim Mindanao": [6.9, 124.3] // fallback alias for legacy label
  }
  
  
  const customMarker = L.icon({
    iconUrl: "/pin8.png",
    iconSize: [32, 32],
    iconAnchor: [12, 32],
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
          counts[lead.region] = (counts[lead.region] || 0) + 1;
        }
      });
      console.log("🧩 Processed Region Counts:", counts); // <-- HERE
      setRegionCounts(
        Object.entries(counts).map(([region, count]) => ({ region, count }))
      );
      
    }

    const fetchGeoData = async () => {
      const res = await fetch("/ph_regions_with_ncr.geojson")
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
                        "#FFFFFF"
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
    "BARMM - Bangsamoro Autonomous Region in Muslim Mindanao": "Bangsamoro Autonomous Region",
    "NIR - Negros Island Region": "Negros Island Region"
  }

  const findCount = (geoName: string) => {
    const match = regionCounts.find(
      r => regionNameMap[r.region] === geoName || r.region === geoName
    );
    const count = match ? match.count : 0;
    console.log("🔍 Matching geoName:", geoName, "| Found region:", match?.region || "None", "| Count:", count);
    return count;
  };
  
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
    const geoName = feature.properties.NAME_1;
    const count = findCount(geoName);
  
    const popupContent = `<strong>${geoName}</strong><br/>Leads: ${count}`;
    
    layer.bindPopup(popupContent);
  
    // 🔥 Add this to open popup when polygon is clicked
    layer.on("click", function (e: any) {
      layer.openPopup(e.latlng);
    });
  };
  

  const getManualCenter = (geoName: string): [number, number] => {
    const normalized = regionNameMap[geoName] || geoName;
    return regionMarkerCoords[normalized] || [0, 0]; // fallback to [0,0] if not found
  };
  
  
  

  return (
    <div style={{ height: "600px", width: "100%" }}>
      <MapContainer center={[12.8797, 121.7740]} zoom={5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoData && (
          <>
            {geoData.features.map((feature: any, idx: number) => (
              <GeoJSON
                key={idx}
                data={feature}
                style={style}
                onEachFeature={onEachFeature}
              />
            ))}

        {geoData.features.map((feature: any, idx: number) => {
          const geoName = feature.properties.NAME_1;
          const count = findCount(geoName);
          const markerPos = getManualCenter(geoName); // <- use manual coords

          return (
            <Marker key={idx} position={markerPos} icon={customMarker}>
              <Popup>
                <strong>{geoName}</strong><br />
                Leads: {count}
              </Popup>
            </Marker>
          );
        })}

          </>
        )}
      </MapContainer>
    </div>
  )
}
