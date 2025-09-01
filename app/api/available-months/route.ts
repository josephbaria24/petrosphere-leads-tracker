import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { format, subMonths } from "date-fns"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Fetch created_at dates from leads
    const { data, error } = await supabase
      .from("crm_leads")
      .select("created_at")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Extract real data months
    const monthsWithData = new Set(
      (data || []).map((lead) =>
        new Date(lead.created_at).toISOString().slice(0, 7) // "yyyy-MM"
      )
    )

    // Generate past 12 months
    const now = new Date()
    const last12Months = Array.from({ length: 12 }, (_, i) =>
      format(subMonths(now, i), "yyyy-MM")
    )

    // Final list (sorted, unique)
    const mergedMonths = Array.from(new Set([...last12Months])).sort((a, b) =>
      b.localeCompare(a)
    )

    return NextResponse.json({ months: mergedMonths })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
