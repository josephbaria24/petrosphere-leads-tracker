'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/components/EditLeadModal'
import EditLeadModal from '@/components/EditLeadModal'


export default function EditModalPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const leadId = searchParams.get('leadId')
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLead = async () => {
      if (!leadId) return
      const { data, error } = await supabase.from('crm_leads').select('*').eq('id', leadId).single()

      if (error) {
        console.error('Error fetching lead:', error)
        setLoading(false)
        return
      }

      setLead(data)
      setLoading(false)
    }

    fetchLead()
  }, [leadId])

  const handleClose = () => router.back()

  const handleSave = async (updated: Partial<Lead>) => {
    const { error } = await supabase.from('crm_leads').update(updated).eq('id', leadId)

    if (error) {
      console.error('Error saving lead:', error)
    } else {
      handleClose()
    }
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (!lead) return <div className="p-8 text-red-500">Lead not found</div>

  return (
    <EditLeadModal
      isOpen={true}
      onClose={handleClose}
      onSave={handleSave}
      lead={lead}
    />
  )
}
