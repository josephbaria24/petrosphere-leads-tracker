import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import {
  clearSupabaseAuthCookiesOnResponse,
  getSupabaseAuthCookies,
  supabaseAuthCookieBytes,
} from "@/lib/auth-cookies"

const MAX_AUTH_COOKIE_BYTES = 12_000

export async function middleware(request: NextRequest) {
  const authCookies = getSupabaseAuthCookies(request.cookies.getAll())
  const authBytes = supabaseAuthCookieBytes(request.cookies.getAll())

  // Recover from bloated cookies left by mixed auth-helpers / SSR cookie formats.
  if (authCookies.length > 8 || authBytes > MAX_AUTH_COOKIE_BYTES) {
    const response = NextResponse.redirect(
      new URL("/login?cleared=1", request.url)
    )
    clearSupabaseAuthCookiesOnResponse(response, authCookies)
    return response
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
