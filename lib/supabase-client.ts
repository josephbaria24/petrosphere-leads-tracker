import { createBrowserClient } from "@supabase/ssr"
import { serialize, parse } from "cookie"
import { slimAuthCookieWrites } from "@/lib/auth-cookies"

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        if (typeof document === "undefined") return []
        const parsed = parse(document.cookie)
        return Object.keys(parsed).map((name) => ({
          name,
          value: parsed[name] ?? "",
        }))
      },
      setAll(cookiesToSet) {
        if (typeof document === "undefined") return
        slimAuthCookieWrites(cookiesToSet).forEach(({ name, value, options }) => {
          document.cookie = serialize(name, value, options)
        })
      },
    },
  }
)
