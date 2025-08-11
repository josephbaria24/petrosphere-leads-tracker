import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
  } from 'recharts'
  
  import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
  import { TooltipProps } from 'recharts'
  
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null
  
    const items = payload.map((entry, index) => (
      <div
        key={index}
        className="flex justify-between items-center text-xs text-white"
      >
        <div className="flex items-center space-x-1">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: entry.color }}
          ></span>
          <span>{entry.name}</span>
        </div>
        <span>{Number(entry.value).toLocaleString()}</span>
      </div>
    ))
  
    // ✅ Only sum Expected Revenue (exclude Opportunities Due)
    const total = payload
      .filter(entry => entry.name !== "Opportunities Due")
      .reduce((sum, entry) => sum + Number(entry.value || 0), 0)
  
    return (
      <div className="bg-black bg-opacity-90 text-white text-xs rounded shadow-md p-3 min-w-[140px]">
        <div className="text-sm font-semibold mb-2">{label}</div>
        <div className="space-y-1">{items}</div>
        <div className="border-t border-white/20 mt-2 pt-1 flex justify-between text-white font-semibold text-sm">
          <span>Total</span>
          <span>{total.toLocaleString()}</span>
        </div>
      </div>
    )
  }
  
  
  interface CustomTickProps {
    x: number
    y: number
    payload: { value: string }
    index: number
  }
  
  const CustomMonthTick = ({ x, y, payload, index }: CustomTickProps) => {
    const isEven = index % 2 === 0
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={isEven ? 15 : -10}
          dy={8}
          textAnchor="middle"
          fill="#333"
          fontSize="11"
        >
          {payload.value}
        </text>
      </g>
    )
  }
  
  interface RevenueOpportunitiesTrend {
    month: string
    expectedRevenue: number
    opportunitiesDue: number
  }
  
  export default function RevenueOpportunitiesTrendsChart({
    data,
  }: {
    data: RevenueOpportunitiesTrend[]
  }) {
    return (
      <Card className="bg-background">
        <CardHeader>
          <CardTitle className="text-lg">Revenue & Opportunities Trends</CardTitle>
          <CardDescription>
            Monthly expected revenue and opportunities due
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="0 1" />
              <XAxis
                dataKey="month"
                tick={CustomMonthTick}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                yAxisId="left"
                tickFormatter={(v) => `${v / 1000}K`}
                label={{ value: 'Revenue', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                yAxisId="right"
                orientation="right"
                label={{ value: 'Opportunities', angle: -90, position: 'insideRight' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '13px' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="expectedRevenue"
                stroke="#22c55e"
                strokeWidth={1}
                name="Expected Revenue"
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="opportunitiesDue"
                stroke="#d97706"
                strokeWidth={1}
                name="Opportunities Due"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }
  