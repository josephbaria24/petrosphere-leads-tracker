// components/login-form.tsx
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase-client"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import { PetroMark } from "@/components/petro-mark"

const REMEMBER_EMAIL_KEY = "petrosphere-login-email"

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  const [wasCleared, setWasCleared] = useState(false)
  const [method, setMethod] = useState<"sso" | "email">("sso")
  const [remember, setRemember] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setWasCleared(params.get("cleared") === "1")

    const savedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY)
    if (savedEmail) {
      setEmail(savedEmail)
      setRemember(true)
      setMethod("email")
    }
  }, [])

  const persistRememberedEmail = () => {
    if (remember) {
      window.localStorage.setItem(REMEMBER_EMAIL_KEY, email)
    } else {
      window.localStorage.removeItem(REMEMBER_EMAIL_KEY)
    }
  }

  // Handle email/password login (for PDN users)
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setLoading(true)
    persistRememberedEmail()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrorMsg("Invalid credentials")
      setLoading(false)
      return
    }

    const user = data.user
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, team")
      .eq("id", user.id)
      .single()

    if (profile?.role === "admin" || profile?.role === "super_admin") {
      if (profile.team === "PDN") {
        router.push("/dashboard/pdn")
      } else {
        router.push("/dashboard")
      }
    } else {
      router.push("/unauthorized")
    }

    setLoading(false)
  }

  // Handle Microsoft SSO login (for CRM users)
  const handleAzureLogin = async () => {
    setErrorMsg("")
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "openid profile email offline_access User.Read",
        queryParams: {
          prompt: "select_account",
        },
      },
    })

    if (error) {
      console.error("OAuth error:", error)
      setErrorMsg("Failed to initiate login")
      setLoading(false)
    }
    // Note: Don't set loading to false here - user is being redirected to Azure
  }

  return (
    <div className={cn("w-full max-w-[380px]", className)} {...props}>
      {wasCleared && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900">
          Stale login cookies were cleared. Please sign in again.
        </p>
      )}

      <div className="mb-8 flex items-center gap-2.5">
        <PetroMark className="h-9 w-7" />
        <span className="text-[15px] font-semibold tracking-tight text-[#1c1c1e]">Petrosphere</span>
      </div>

      <h1 className="text-[1.75rem] font-semibold tracking-tight text-[#161616]">Sign in</h1>
      <p className="mt-1.5 text-sm text-[#6d6d78]">
        {method === "sso"
          ? "CRM team members with a Microsoft account."
          : "PDN team members with an email and password."}
      </p>

      <div className="mt-6 grid grid-cols-2 rounded-lg bg-[#e7e7ee] p-1">
        <button
          type="button"
          onClick={() => {
            setMethod("sso")
            setErrorMsg("")
          }}
          className={cn(
            "h-9 rounded-md text-sm font-medium transition-colors",
            method === "sso" ? "bg-white text-[#161616] shadow-sm" : "text-[#6d6d78] hover:text-[#161616]"
          )}
        >
          Microsoft
        </button>
        <button
          type="button"
          onClick={() => {
            setMethod("email")
            setErrorMsg("")
          }}
          className={cn(
            "h-9 rounded-md text-sm font-medium transition-colors",
            method === "email" ? "bg-white text-[#161616] shadow-sm" : "text-[#6d6d78] hover:text-[#161616]"
          )}
        >
          Email
        </button>
      </div>

      {method === "sso" ? (
        <div className="mt-6 space-y-4">
          <Button
            className="h-11 w-full cursor-pointer rounded-lg bg-[#161616] text-white hover:bg-[#2a2a2a]"
            type="button"
            onClick={handleAzureLogin}
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" width="18" height="18" aria-hidden="true">
              <path fill="#F25022" d="M1 1h10v10H1z" />
              <path fill="#7FBA00" d="M12 1h10v10H12z" />
              <path fill="#00A4EF" d="M1 12h10v10H1z" />
              <path fill="#FFB900" d="M12 12h10v10H12z" />
            </svg>
            {loading ? "Signing in..." : "Login with Microsoft"}
          </Button>
          {errorMsg && <p className="text-center text-sm text-red-500">{errorMsg}</p>}
        </div>
      ) : (
        <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-[#3a3a42]">
              Email address
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9898a6]" />
              <Input
                id="email"
                type="email"
                placeholder="name@petros-global.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-lg border-[#e4e4ea] bg-white pl-10 text-[#161616] placeholder:text-[#b0b0ba] dark:bg-white dark:text-[#161616]"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password" className="text-[#3a3a42]">
              Password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9898a6]" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-lg border-[#e4e4ea] bg-white pl-10 pr-10 text-[#161616] dark:bg-white dark:text-[#161616]"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9898a6] hover:text-[#161616]"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="remember" className="flex cursor-pointer items-center gap-2 text-sm text-[#3a3a42]">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(checked) => {
                  const next = checked === true
                  setRemember(next)
                  if (!next) window.localStorage.removeItem(REMEMBER_EMAIL_KEY)
                }}
                className="border-[#d0d0d8] data-[state=checked]:bg-[#161616] data-[state=checked]:border-[#161616]"
              />
              Remember me
            </label>
            <a href="/forgot-password" className="text-sm text-[#6d6d78] underline-offset-4 hover:text-[#161616] hover:underline">
              Forgot password
            </a>
          </div>

          {errorMsg && <p className="text-center text-sm text-red-500">{errorMsg}</p>}

          <Button
            type="submit"
            className="h-11 w-full cursor-pointer rounded-lg bg-[#161616] text-white hover:bg-[#2a2a2a]"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-xs leading-relaxed text-[#8d8d98] [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-[#161616]">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </p>
    </div>
  )
}
