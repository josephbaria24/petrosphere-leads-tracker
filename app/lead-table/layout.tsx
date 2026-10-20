export default function LeadTableLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="-m-3 flex h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] max-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] flex-col overflow-hidden sm:-m-4 md:-m-6">
      {children}
    </div>
  )
}
