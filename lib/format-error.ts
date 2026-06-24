/** Supabase/PostgREST errors are plain objects, not always `instanceof Error`. */
export function formatUnknownError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err !== null && typeof err === 'object') {
    const o = err as Record<string, unknown>
    const message =
      typeof o.message === 'string'
        ? o.message
        : typeof o.msg === 'string'
          ? o.msg
          : null
    const code = typeof o.code === 'string' ? o.code : ''
    const details = typeof o.details === 'string' ? o.details : ''
    const hint = typeof o.hint === 'string' ? o.hint : ''
    const parts = [message, code && `code=${code}`, details, hint].filter(Boolean)
    if (parts.length) return parts.join(' | ')
  }
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

export function isNetworkFetchError(message: string): boolean {
  return (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Load failed')
  )
}

export function logSupabaseError(context: string, err: unknown): void {
  const message = formatUnknownError(err)
  if (isNetworkFetchError(message)) {
    console.warn(
      `[${context}] Could not reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL, anon key, and network:`,
      message
    )
    return
  }
  console.error(`[${context}]`, message)
}
