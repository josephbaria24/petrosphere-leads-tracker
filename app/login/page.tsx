import { LoginForm } from "../../components/login-form"
import { PetroHeroMark } from "../../components/petro-mark"
import { FileText, MapPinned, Users, Video } from "lucide-react"

const modules = [
  { label: "Leads", icon: Users },
  { label: "Proposals", icon: FileText },
  { label: "Webinars", icon: Video },
  { label: "Regions", icon: MapPinned },
]

export default function LoginPage() {
  return (
    <div className="flex h-full min-h-screen w-full bg-[#f3f4f6]">
      <section className="flex w-full items-center justify-center overflow-y-auto px-6 py-10 sm:px-10 lg:w-[44%] xl:w-[40%]">
        <LoginForm />
      </section>

      <section className="hidden p-4 pl-0 lg:flex lg:w-[56%] xl:w-[60%] lg:p-5 lg:pl-0">
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[28px] bg-[#0c0c0e] text-white">
          <div className="pointer-events-none absolute -right-10 top-[-8%] h-[130%] w-24 rotate-[24deg] bg-gradient-to-b from-white/15 via-white/5 to-transparent" />
          <div className="pointer-events-none absolute right-10 top-[-12%] h-[140%] w-10 rotate-[24deg] bg-gradient-to-b from-[#F5C400]/50 via-white/10 to-transparent" />
          <div className="pointer-events-none absolute right-24 top-[-6%] h-[120%] w-px rotate-[24deg] bg-white/20" />

          <div className="relative flex min-h-0 flex-1 items-end justify-center overflow-hidden px-8 pt-6">
            <PetroHeroMark className="h-full max-h-[420px] w-auto drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)]" />
          </div>

          <div className="relative z-10 px-10 pb-4 xl:px-12">
            <p className="text-sm font-medium text-white/70">Petrosphere Inc.</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white xl:text-4xl">
              Welcome to Petrosphere
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/60">
              The leads tracker for the CRM and Palawan Daily News teams. Follow inquiries,
              proposals, webinars, and regional coverage from one workspace.
            </p>
          </div>

          <div className="relative z-10 px-8 pb-8 xl:px-10">
            <div className="rounded-[22px] bg-[#1a1a1e]/90 p-6 ring-1 ring-white/10 backdrop-blur-sm">
              <h3 className="text-lg font-semibold tracking-tight text-white">
                Keep every lead moving
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">
                See new inquiries, open proposals, and closed work without leaving the tracker.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {modules.map(({ label, icon: Icon }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/10"
                  >
                    <Icon className="size-3.5 text-[#F5C400]" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
