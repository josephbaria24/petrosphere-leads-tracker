'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Card, CardHeader, CardTitle, CardContent
} from '@/components/ui/card'
import {
  Table, TableHead, TableHeader, TableBody, TableRow, TableCell
} from '@/components/ui/table'
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbSeparator, BreadcrumbPage
} from '@/components/ui/breadcrumb'
import { Input } from '@/components/ui/input'

type Lead = {
  id: string
  contact_name: string
  email: string
  phone?: string
  company?: string
  status?: string
  region?: string
  service_product?: string
  lead_source?: string
  first_contact?: string
  last_contact?: string
  captured_by?: string
  created_at?: string
}

export default function LeadsListPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'contact_name' | 'created_at'>('created_at')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    const fetchLeads = async () => {
      const query = supabase
        .from('crm_leads')
        .select('*')
        .order(sortBy, { ascending: sortAsc })

      const { data, error } = await query

      if (error) {
        console.error('Error fetching leads:', error)
      } else {
        const filtered = data.filter((lead) =>
          lead.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
          lead.company?.toLowerCase().includes(search.toLowerCase()) ||
          lead.email?.toLowerCase().includes(search.toLowerCase())
        )
        setLeads(filtered)
      }
    }

    fetchLeads()
  }, [search, sortBy, sortAsc])

  const handleSort = (column: 'contact_name' | 'created_at') => {
    if (sortBy === column) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(column)
      setSortAsc(true)
    }
  }

  return (
    <div>
      {/* Topbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 pl-10">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">CRM</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Leads List</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="pr-10">
          <Input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">All CRM Leads</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
  <div className="max-h-[600px] overflow-y-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead onClick={() => handleSort('contact_name')} className="cursor-pointer">Contact Name</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>Lead Source</TableHead>
          <TableHead>First Contact</TableHead>
          <TableHead>Last Contact</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Captured By</TableHead>
          <TableHead onClick={() => handleSort('created_at')} className="cursor-pointer">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id}>
            <TableCell>{lead.contact_name || '—'}</TableCell>
            <TableCell>{lead.company || '—'}</TableCell>
            <TableCell>{lead.phone || '—'}</TableCell>
            <TableCell>{lead.email || '—'}</TableCell>
            <TableCell>{lead.region || '—'}</TableCell>
            <TableCell>{lead.lead_source || '—'}</TableCell>
            <TableCell>{lead.first_contact || '—'}</TableCell>
            <TableCell>{lead.last_contact || '—'}</TableCell>
            <TableCell>{lead.service_product || '—'}</TableCell>
            <TableCell>{lead.status || '—'}</TableCell>
            <TableCell>{lead.captured_by || '—'}</TableCell>
            <TableCell>{new Date(lead.created_at!).toISOString().split('T')[0]}</TableCell>

          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
</CardContent>

      </Card>
    </div>
  )
}
