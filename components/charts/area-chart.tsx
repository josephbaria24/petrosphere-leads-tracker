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
  import Image from 'next/image'
  import { LegendProps } from 'recharts'
import type { Payload } from 'recharts/types/component/DefaultLegendContent'

  type AreaData = {
    date: string
    [leadSource: string]: string | number
  }
  
  // 1. Define icons per lead source
  const iconMap: Record<string, string> = {
    facebook: '/icons/fb.svg',
    viber: '/icons/viber.svg',
    teams: '/icons/teams.svg',
    'phone call': '/icons/call.svg',
    'tawk.to': '/icons/tawkto.jpeg',
    unknown: '/icons/question.svg',
    'phone text': '/icons/chat.svg',
    'site visit': '/icons/site.svg',
    peza: '/icons/site.svg',
    'e-mail': '/icons/email.svg',
    google: '/icons/google.svg',
  }
  
  // 2. Custom legend renderer
  const CustomLegend = ({ payload }: LegendProps) => (
    <ul className="flex flex-wrap gap-4 mt-2 text-sm">
      {(payload as Payload[]).map((entry, index) => {
        const label = entry.value as string
        const icon = iconMap[label.toLowerCase()]
        return (
          <li key={`item-${index}`} className="flex items-center gap-1">
            {icon && (
              <Image
                src={icon}
                alt={label}
                width={14}
                height={14}
                style={{ display: 'inline-block' }}
              />
            )}
            <span style={{ color: entry.color }}>{label}</span>
          </li>
        )
      })}
    </ul>
  )
  
  
  export function LeadSourceAreaChart({ data }: { data: AreaData[] }) {
    const colors = [
      '#42a5f5', '#03fc03', '#6703fc', '#66bb6a', '#ab47bc',
      '#fc0303', '#ffa726', '#8d6e63', '#f200ff', '#ff0066',
    ]
  
    const leadSources = Object.keys(data[0] || {}).filter(k => k !== 'date')
  
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
  