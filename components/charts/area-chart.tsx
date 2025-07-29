import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
  } from 'recharts'
  import { LegendProps } from 'recharts'
import type { Payload } from 'recharts/types/component/DefaultLegendContent'

  type AreaData = {
    date: string
    [leadSource: string]: string | number
  }
  
  const CustomLegend = ({ payload }: LegendProps) => (
    <ul className="flex flex-wrap gap-4 mt-2 text-sm">
      {(payload as Payload[]).map((entry, index) => (
        <li key={`item-${index}`} className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{(entry.value as string).charAt(0).toUpperCase() + (entry.value as string).slice(1)}</span>

        </li>
      ))}
    </ul>
  )
  
  
  
  export function LeadSourceAreaChart({ data }: { data: AreaData[] }) {
    const colors = [
      '#d6a800', '#42a5f5', '#d6000e', '#66bb6a', '#ab47bc',
      '#fc0303', '#ffa726', '#8d6e63', '#f200ff', '#590000', '#008a37',
    ]
  
    const leadSources = Array.from(
      new Set(
        data.flatMap(row =>
          Object.keys(row).filter(k => k !== 'date')
        )
      )
    ).sort((a, b) => a.localeCompare(b)) // optional: stable order
    
    
  
    return (
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend content={<CustomLegend />} />
            {leadSources.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.3}
                name={key.charAt(0).toUpperCase() + key.slice(1)}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }
  