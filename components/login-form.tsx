"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Eye, EyeOff } from "lucide-react"

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    
    await supabase.auth.signOut();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrorMsg("Invalid credentials")
      return
    }

    const user = data.user
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

      if (profile?.role === "admin" || profile?.role === "super_admin") {
        router.push("/dashboard");
      } else {
        router.push("/unauthorized");
      }
      
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
        <div className="relative text-center text-sm">
                <img src="/petroslogo.png" alt="logo"/>
              </div>
          <CardTitle className="text-xl">Welcome back</CardTitle>
          
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              {/* <div className="flex flex-col gap-4">
                <Button variant="outline" className="w-full" type="button">
                  Login with Google
                </Button>
              </div> */}

              


              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
  <div className="flex items-center justify-between">
    <Label htmlFor="password">Password</Label>
    <a href="#" className="text-sm underline-offset-4 hover:underline">
      Forgot your password?
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
                  <p className="text-sm text-red-500 text-center -mt-2">{errorMsg}</p>
                )}

                <Button type="submit" className="w-full">
                  Login
                </Button>
              </div>

              {/* <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <a href="#" className="underline underline-offset-4">
                  Sign up
                </a>
              </div> */}
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}
