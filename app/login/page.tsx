import { Droplet } from "lucide-react"
import { LoginForm } from "../../components/login-form"

export default function LoginPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Droplet className="size-4" />
          </div>
          Petrosphere Inc.
        </a>
        <LoginForm />
      </div>
    </div>
  )
}
