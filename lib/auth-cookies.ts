import { createChunks } from "@supabase/ssr/dist/module/utils/chunker.js"
import {
  stringFromBase64URL,
  stringToBase64URL,
} from "@supabase/ssr/dist/module/utils/base64url.js"

const SUPABASE_COOKIE_PREFIX = "sb-"
const BASE64_PREFIX = "base64-"
const CHUNK_NAME = /^(.*)\.(\d+)$/

/** Microsoft Graph token, stored off the main session so it is not sent on every request. */
export const MS_GRAPH_COOKIE_PREFIX = "ms-graph-token"
const GRAPH_CHUNK_SIZE = 3000

type CookieOptions = {
  domain?: string
  expires?: Date
  httpOnly?: boolean
  maxAge?: number
  path?: string
  sameSite?: boolean | "lax" | "strict" | "none"
  secure?: boolean
  partitioned?: boolean
}

type WritableCookie<TOptions = CookieOptions> = {
  name: string
  value: string
  options?: TOptions
}

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

/**
 * Azure SSO sessions include the Graph access token, refresh token, and a large
 * user profile. Stored in the Supabase auth cookie, that payload is chunked past
 * the size guard and the middleware wipes the session on the next request.
 * Keep the fields this app reads, and drop the rest before the cookie is written.
 */
function slimSessionJson(json: string): string | null {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  if (!data || typeof data !== "object") return null

  const session = data as Record<string, unknown>
  if (typeof session.access_token !== "string" || typeof session.refresh_token !== "string") {
    return null
  }

  delete session.provider_token
  delete session.provider_refresh_token

  const user = session.user
  if (user && typeof user === "object") {
    const record = user as Record<string, unknown>
    const meta =
      record.user_metadata && typeof record.user_metadata === "object"
        ? (record.user_metadata as Record<string, unknown>)
        : {}
    const identities = Array.isArray(record.identities) ? record.identities : []

    session.user = {
      id: record.id,
      aud: record.aud,
      role: record.role,
      email: record.email,
      phone: record.phone,
      app_metadata: record.app_metadata,
      user_metadata: {
        full_name: meta.full_name ?? meta.name,
        name: meta.name,
        email: meta.email,
        avatar_url: meta.avatar_url ?? meta.picture,
      },
      identities: identities.map((identity) => {
        if (!identity || typeof identity !== "object") return identity
        const id = identity as Record<string, unknown>
        const identityData =
          id.identity_data && typeof id.identity_data === "object"
            ? (id.identity_data as Record<string, unknown>)
            : null
        return {
          identity_id: id.identity_id,
          id: id.id,
          user_id: id.user_id,
          provider: id.provider,
          identity_data: identityData
            ? {
                email: identityData.email,
                sub: identityData.sub,
                name: identityData.name ?? identityData.full_name,
              }
            : undefined,
        }
      }),
    }
  }

  return JSON.stringify(session)
}

function decodeAuthCookieValue(encoded: string): { json: string; base64: boolean } | null {
  if (!encoded.startsWith(BASE64_PREFIX)) {
    if (!encoded.startsWith("{")) return null
    return { json: encoded, base64: false }
  }
  try {
    return {
      json: stringFromBase64URL(encoded.slice(BASE64_PREFIX.length)),
      base64: true,
    }
  } catch {
    return null
  }
}

function encodeAuthCookieValue(json: string, base64: boolean) {
  return base64 ? BASE64_PREFIX + stringToBase64URL(json) : json
}

/**
 * Rewrite Supabase auth cookie chunks so a Microsoft session stays small enough
 * to survive the request-size guard. Non-session cookies (such as the PKCE
 * verifier) are left unchanged.
 */
export function slimAuthCookieWrites<T extends WritableCookie>(cookies: T[]): T[] {
  try {
    const passthrough: T[] = []
    const groups = new Map<string, { index: number; cookie: T }[]>()

    for (const cookie of cookies) {
      if (!cookie.value || !cookie.name.startsWith(SUPABASE_COOKIE_PREFIX)) {
        passthrough.push(cookie)
        continue
      }

      const match = cookie.name.match(CHUNK_NAME)
      const base = match?.[1] ?? cookie.name
      const index = match ? Number(match[2]) : -1
      const group = groups.get(base) ?? []
      group.push({ index, cookie })
      groups.set(base, group)
    }

    const rewritten: T[] = []

    for (const [base, parts] of groups) {
      parts.sort((a, b) => a.index - b.index)
      const encoded = parts.map((part) => part.cookie.value).join("")
      const decoded = decodeAuthCookieValue(encoded)
      const slimJson = decoded ? slimSessionJson(decoded.json) : null

      if (!decoded || !slimJson || slimJson.length >= decoded.json.length) {
        rewritten.push(...parts.map((part) => part.cookie))
        continue
      }

      const options = parts[0]?.cookie.options
      const chunks = createChunks(base, encodeAuthCookieValue(slimJson, decoded.base64))
      const kept = new Set(chunks.map((chunk) => chunk.name))

      for (const part of parts) {
        if (!kept.has(part.cookie.name)) {
          rewritten.push({
            ...part.cookie,
            value: "",
            options: { ...part.cookie.options, maxAge: 0 },
          })
        }
      }

      for (const chunk of chunks) {
        rewritten.push({
          ...parts[0].cookie,
          name: chunk.name,
          value: chunk.value,
          options,
        })
      }
    }

    return [...passthrough, ...rewritten]
  } catch (error) {
    console.error("Failed to slim auth cookies:", error)
    return cookies
  }
}

export function graphTokenCookieChunks(token: string) {
  const chunks: { name: string; value: string }[] = []
  for (let offset = 0; offset < token.length; offset += GRAPH_CHUNK_SIZE) {
    chunks.push({
      name: `${MS_GRAPH_COOKIE_PREFIX}.${chunks.length}`,
      value: token.slice(offset, offset + GRAPH_CHUNK_SIZE),
    })
  }
  return chunks
}

export function readGraphToken(
  cookies: { name: string; value: string }[]
): string | null {
  const chunks = cookies
    .map((cookie) => {
      const match = cookie.name.match(new RegExp(`^${MS_GRAPH_COOKIE_PREFIX}\\.(\\d+)$`))
      if (!match) return null
      return { index: Number(match[1]), value: cookie.value }
    })
    .filter((chunk): chunk is { index: number; value: string } => chunk !== null)
    .sort((a, b) => a.index - b.index)

  if (chunks.length === 0) return null
  return chunks.map((chunk) => chunk.value).join("")
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
