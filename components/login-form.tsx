// components/login-form.tsx
"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Eye, EyeOff } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  const supabase = useMemo(() => createClientComponentClient(), [])
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Handle email/password login (for PDN users)
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setLoading(true)

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
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "openid profile email offline_access User.Read",
        queryParams: { 
          prompt: "select_account" 
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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <div className="relative text-center text-sm mb-4">
            <img src="/petroslogo.png" alt="logo" className="mx-auto"/>
          </div>
          <CardTitle className="text-xl">Welcome back</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sso" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sso">SSO Login</TabsTrigger>
              <TabsTrigger value="email">Email Login</TabsTrigger>
            </TabsList>

            {/* SSO Login Tab */}
            <TabsContent value="sso" className="space-y-4">
              <div className="text-sm text-muted-foreground text-center mb-4">
                For CRM Team members with Microsoft accounts
              </div>
              <Button 
                variant="outline" 
                className="w-full flex items-center gap-2 cursor-pointer" 
                type="button" 
                onClick={handleAzureLogin}
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" width="20" height="20">
                  <path fill="#F25022" d="M1 1h10v10H1z" />
                  <path fill="#7FBA00" d="M12 1h10v10H12z" />
                  <path fill="#00A4EF" d="M1 12h10v10H1z" />
                  <path fill="#FFB900" d="M12 12h10v10H12z" />
                </svg>
                {loading ? "Logging in..." : "Login with Microsoft"}
              </Button>
            </TabsContent>

            {/* Email/Password Login Tab */}
            <TabsContent value="email" className="space-y-4">
              <div className="text-sm text-muted-foreground text-center mb-4">
                For PDN Team members
              </div>
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@petros-global.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a href="/forgot-password" className="text-sm underline-offset-4 hover:underline">
                      Forgot?
                    </a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-sm text-red-500 text-center">{errorMsg}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}