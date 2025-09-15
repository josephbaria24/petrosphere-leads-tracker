//app\api\me\avatar\route.ts
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies as getCookies } from "next/headers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const cookieStore = getCookies()

  // 💡 Correct: wrap the already-evaluated cookieStore in a function
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session) {
    return new NextResponse("Session error", { status: 401 })
  }

  const token = session.provider_token
  if (!token) {
    return new NextResponse("No provider token", { status: 401 })
  }

  const res = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    return new NextResponse("No photo", { status: res.status })
  }

  const arrayBuf = await res.arrayBuffer()
  return new NextResponse(arrayBuf, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  })
}
