'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

function clearBrowserAuthData() {
  document.cookie.split(';').forEach((c) => {
    const name = c.replace(/^ +/, '').split('=')[0]
    if (!name) return
    document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/`
  })
  localStorage.clear()
  sessionStorage.clear()
}

export default function ClearAuth() {
  const router = useRouter()

  useEffect(() => {
    clearBrowserAuthData()
    setTimeout(() => {
      router.push('/login')
    }, 500)
  }, [router])

  return (
    <div className="p-10 text-center">
      <p>Clearing authentication data...</p>
      <p className="mt-2 text-sm text-muted-foreground">
        If login still fails, clear cookies for this site in your browser settings.
      </p>
    </div>
  )
}
