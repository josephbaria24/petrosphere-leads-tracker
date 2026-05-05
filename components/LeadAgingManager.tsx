import { useEffect } from 'react'
import { supabase } from "@/lib/supabase-client"
import { toast } from 'sonner'

/** Supabase/PostgREST errors are plain objects, not always `instanceof Error`. */
function formatUnknownError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err !== null && typeof err === 'object') {
    const o = err as Record<string, unknown>
    const message =
      typeof o.message === 'string'
        ? o.message
        : typeof o.msg === 'string'
          ? o.msg
          : null
    const code = typeof o.code === 'string' ? o.code : ''
    const details = typeof o.details === 'string' ? o.details : ''
    const hint = typeof o.hint === 'string' ? o.hint : ''
    const parts = [message, code && `code=${code}`, details, hint].filter(Boolean)
    if (parts.length) return parts.join(' | ')
  }
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

export function LeadAgingManager() {

  useEffect(() => {
    const processStaleLeads = async () => {
      // Check if we've already run this check today to avoid redundant hits
      const lastCheck = localStorage.getItem('last_lead_aging_check')
      const today = new Date().toISOString().split('T')[0]
      if (lastCheck === today) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // 7 days ago threshold
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const dateStr = sevenDaysAgo.toISOString()

        // 1. Fetch leads that are stale
        // Using 'eq' instead of 'ilike' for better reliability in filters
        const { data: staleLeads, error: fetchError } = await supabase
          .from('crm_leads')
          .select('id, status, updated_at, contact_name')
          .not('status', 'eq', 'Closed Win')
          .not('status', 'eq', 'Closed Lost')
          .not('status', 'eq', 'closed win')
          .not('status', 'eq', 'closed lost')
          .lt('updated_at', dateStr)

        if (fetchError) throw fetchError

        if (!staleLeads || staleLeads.length === 0) {
          localStorage.setItem('last_lead_aging_check', today)
          return
        }

        console.log(`Found ${staleLeads.length} stale leads. Auto-closing...`)

        // 2. Update leads to 'Closed Lost'
        const { error: updateError } = await supabase
          .from('crm_leads')
          .update({ 
            status: 'Closed Lost', 
            updated_at: new Date().toISOString(),
            notes: 'Automatically closed due to 7 days of inactivity.'
          })
          .in('id', staleLeads.map(l => l.id))

        if (updateError) throw updateError

        // 3. Record in lead_history
        const historyEntries = staleLeads.map(lead => ({
          lead_id: lead.id,
          field_changed: 'status',
          old_value: lead.status,
          new_value: 'Closed Lost',
          changed_by: 'CRM Automation',
          changed_at: new Date().toISOString(),
          // DB constraint: action IN ('added','edited','deleted')
          action: 'edited' as const,
        }))

        const { error: historyError } = await supabase
          .from('lead_history')
          .insert(historyEntries)

        if (historyError) {
          console.error('Error inserting auto-close history:', historyError)
        }

        toast.info(`Auto-closed ${staleLeads.length} stale leads`, {
          description: "Leads with no activity for 7+ days were moved to Closed Lost."
        })

        localStorage.setItem('last_lead_aging_check', today)
      } catch (err: unknown) {
        const message = formatUnknownError(err)
        const isFetchFailure =
          message.includes('Failed to fetch') ||
          message.includes('NetworkError') ||
          message.includes('Load failed')
        if (isFetchFailure) {
          console.warn(
            '[LeadAgingManager] Could not reach Supabase (network). Check NEXT_PUBLIC_SUPABASE_URL, anon key, internet, and whether the Supabase project is active:',
            message
          )
          return
        }
        console.error('[LeadAgingManager]', message)
      }
    }

    processStaleLeads()
  }, [])

  return null
}
