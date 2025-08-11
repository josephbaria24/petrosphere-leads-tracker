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
      {/* ✅ Format with commas */}
      <span>{Number(entry.value).toLocaleString()}</span>
    </div>
  ))

  // ✅ Only sum amounts (exclude "Won Opportunities")
  const total = payload
    .filter(entry => entry.name !== "Won Opportunities")
    .reduce((sum, entry) => sum + Number(entry.value || 0), 0)

  return (
    <div className="bg-black bg-opacity-90 text-white text-xs rounded shadow-md p-3 min-w-[140px]">
      <div className="text-sm font-semibold mb-2">{label}</div>
      <div className="space-y-1">{items}</div>
      <div className="border-t border-white/20 mt-2 pt-1 flex justify-between text-white font-semibold text-sm">
        <span>Total</span>
        {/* ✅ Format total with commas */}
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
  

  interface ClosedWonTrend {
    month: string
    closed_amount: number
    won_opportunities: number
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
  
  
  export default function ClosedWonTrendsChart({ data }: { data: ClosedWonTrend[] }) {
    return (
      <Card className="bg-background">
        <CardHeader>
          <CardTitle className="text-lg">Closed Won Trends</CardTitle>
          <CardDescription>Monthly trend of closed amounts and win count</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px]"> {/* was minHeight: 200px */}
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="0 1" />
              <XAxis
                dataKey="month"
                tick={CustomMonthTick}
                interval={0}  // show all ticks
                />
              <YAxis
                allowDecimals={false}
                yAxisId="left"
                tickFormatter={(v) => `${v / 1000}K`}
                label={{ value: 'Amount', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }} // 👈 reduce font size
              />
              <YAxis
              allowDecimals={false}
                yAxisId="right"
                orientation="right"
                label={{ value: 'Wins', angle: -90, position: 'insideRight' }}
                tick={{ fontSize: 12 }} // 👈 reduce font size
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                    fontSize: '13px', // or '10px', '0.75rem', etc.
                }}
                />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="closed_amount"
                stroke="#007BFF"
                strokeWidth={1}
                name="Closed Amount"
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="won_opportunities"
                stroke="#e91e63"
                strokeWidth={1}
                name="Won Opportunities"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }
  