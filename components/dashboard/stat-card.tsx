import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

export function StatCard({
  label,
  value,
  change,
  trend,
  subtext,
  className, // ✅ add this
}: {
  label: string
  value: string
  change: string
  trend: "up" | "down"
  subtext: string
  className?: string // ✅ add this
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : ArrowDownRight
  const trendColor = trend === "up" ? "text-green-500" : "text-red-500"

  return (
    <Card className={cn(className)}> {/* ✅ apply className here */}
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("flex items-center text-sm font-medium", trendColor)}>
          <TrendIcon className="mr-1 h-4 w-4" />
          {change}
        </p>
        <p className="text-xs text-muted-foreground">{subtext}</p>
      </CardContent>
    </Card>
  )
}
