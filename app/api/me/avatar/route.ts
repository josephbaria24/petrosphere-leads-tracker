import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

export const runtime = "nodejs"        // use Node runtime
export const dynamic = "force-dynamic" // don't cache session for this route

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies: () => Promise.resolve(cookies()) })


  const { data, error } = await supabase.auth.getSession()
  if (error) return new NextResponse("Session error", { status: 401 })

  const token = data.session?.provider_token
  if (!token) return new NextResponse("No provider token", { status: 401 })

  const res = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    // 404 is normal if the M365 account has no photo
    return new NextResponse("No photo", { status: res.status })
  }

  const arrayBuf = await res.arrayBuffer()
  return new NextResponse(arrayBuf, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  })
}
