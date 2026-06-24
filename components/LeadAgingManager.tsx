import { useEffect } from 'react'
import { supabase } from "@/lib/supabase-client"
import { toast } from 'sonner'
import { formatUnknownError, isNetworkFetchError } from '@/lib/format-error'

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

        const BATCH_SIZE = 100
        for (let i = 0; i < staleLeads.length; i += BATCH_SIZE) {
          const batch = staleLeads.slice(i, i + BATCH_SIZE)
          const batchIds = batch.map((l) => l.id)

          const { error: updateError } = await supabase
            .from('crm_leads')
            .update({
              status: 'Closed Lost',
              updated_at: new Date().toISOString(),
              notes: 'Automatically closed due to 7 days of inactivity.',
            })
            .in('id', batchIds)

          if (updateError) throw updateError

          const historyEntries = batch.map((lead) => ({
            lead_id: lead.id,
            field_changed: 'status',
            old_value: lead.status,
            new_value: 'Closed Lost',
            changed_by: 'CRM Automation',
            changed_at: new Date().toISOString(),
            action: 'edited' as const,
          }))

          const { error: historyError } = await supabase
            .from('lead_history')
            .insert(historyEntries)

          if (historyError) {
            console.error('Error inserting auto-close history:', historyError)
          }
        }

        toast.info(`Auto-closed ${staleLeads.length} stale leads`, {
          description: "Leads with no activity for 7+ days were moved to Closed Lost."
        })

        localStorage.setItem('last_lead_aging_check', today)
      } catch (err: unknown) {
        const message = formatUnknownError(err)
        if (isNetworkFetchError(message)) {
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
