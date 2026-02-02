'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClearAuth() {
  const router = useRouter()

  useEffect(() => {
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    })
    
    // Clear localStorage
    localStorage.clear()
    
    // Clear sessionStorage
    sessionStorage.clear()
    
    setTimeout(() => {
      router.push('/login')
    }, 1000)
  }, [router])

  return (
    <div className="p-10 text-center">
      <p>Clearing authentication data...</p>
    </div>
  )
}