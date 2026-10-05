import { cn } from "@/lib/utils"

/**
 * public/petroslogo.png is a 1200×628 canvas with the artwork inset.
 * These offsets crop to that artwork so the transparent margin does not shrink it.
 */
export function PetroLogo({ className }: { className?: string }) {
  return (
    <div className={cn("relative aspect-[534/360] overflow-hidden", className)}>
      <img
        src="/petroslogo.png"
        alt="Petrosphere"
        className="pointer-events-none absolute max-w-none select-none"
        style={{
          width: "224.7%",
          height: "174.4%",
          left: "-63.3%",
          top: "-37.2%",
        }}
      />
    </div>
  )
}
