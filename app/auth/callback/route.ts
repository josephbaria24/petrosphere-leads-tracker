// app/auth/callback/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", requestUrl.origin))
  }

  try {
    const cookieStore = await cookies()
    
    const supabase = createRouteHandlerClient({ 
      cookies: (() => cookieStore) as any // Type assertion for Next.js 15 compatibility
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Auth callback error:", error)
      return NextResponse.redirect(new URL("/login?error=auth_failed", requestUrl.origin))
    }

    return NextResponse.redirect(new URL("/auth/confirm", requestUrl.origin))
    
  } catch (err) {
    console.error("Unexpected error in callback:", err)
    return NextResponse.redirect(new URL("/login?error=unexpected", requestUrl.origin))
  }
}