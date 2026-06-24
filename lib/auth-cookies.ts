const SUPABASE_COOKIE_PREFIX = "sb-"

/** Approximate byte size of all Supabase auth cookies on a request. */
export function supabaseAuthCookieBytes(
  cookies: { name: string; value: string }[]
): number {
  return cookies
    .filter((c) => c.name.startsWith(SUPABASE_COOKIE_PREFIX))
    .reduce((sum, c) => sum + c.name.length + c.value.length + 4, 0)
}

export function getSupabaseAuthCookies(
  cookies: { name: string; value: string }[]
) {
  return cookies.filter((c) => c.name.startsWith(SUPABASE_COOKIE_PREFIX))
}

/** Clear bloated or duplicated Supabase auth cookies (prevents HTTP 431). */
export function clearSupabaseAuthCookiesOnResponse(
  response: { cookies: { set: (name: string, value: string, options?: { maxAge?: number; path?: string }) => void } },
  authCookies: { name: string }[]
) {
  for (const cookie of authCookies) {
    response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" })
  }
}
