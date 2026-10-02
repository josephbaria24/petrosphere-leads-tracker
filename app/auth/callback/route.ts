// app/auth/callback/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase-server"
import { graphTokenCookieChunks, MS_GRAPH_COOKIE_PREFIX } from "@/lib/auth-cookies"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", requestUrl.origin))
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Auth callback error:", error)
      return NextResponse.redirect(new URL("/login?error=auth_failed", requestUrl.origin))
    }

    const providerToken = data.session?.provider_token
    if (providerToken) {
      const cookieStore = await cookies()
      const graphCookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/api/me/avatar",
        maxAge: 60 * 60,
      }
      for (let index = 0; index < 8; index += 1) {
        cookieStore.set(`${MS_GRAPH_COOKIE_PREFIX}.${index}`, "", {
          ...graphCookieOptions,
          maxAge: 0,
        })
      }
      for (const chunk of graphTokenCookieChunks(providerToken)) {
        cookieStore.set(chunk.name, chunk.value, graphCookieOptions)
      }
    }

    return NextResponse.redirect(new URL("/auth/confirm", requestUrl.origin))
  } catch (err) {
    console.error("Unexpected error in callback:", err)
    return NextResponse.redirect(new URL("/login?error=unexpected", requestUrl.origin))
  }
}
