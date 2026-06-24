export default function LeadTableLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="-m-4 md:-m-6 flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
      {children}
    </div>
  )
}
