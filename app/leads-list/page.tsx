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








  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)
const [editValue, setEditValue] = useState('')
const [originalLeads, setOriginalLeads] = useState<Lead[]>([])

const handleStartEdit = (row: number, col: number, currentValue: string) => {
  setEditingCell({ row, col })
  setEditValue(currentValue)
  if (originalLeads.length === 0) {
    setOriginalLeads(JSON.parse(JSON.stringify(leads))) // deep clone
  }
}

const handleSaveEdit = async (rowIndex: number, key: keyof Lead) => {
  const updatedLeads = [...leads]
  const updatedLead = { ...updatedLeads[rowIndex], [key]: editValue }

  // Optimistically update the local state
  updatedLeads[rowIndex] = updatedLead
  setLeads(updatedLeads)
  setEditingCell(null)

  // Update Supabase
  const { error } = await supabase
    .from('crm_leads')
    .update({ [key]: editValue })
    .eq('id', updatedLead.id)

  if (error) {
    console.error('Error updating lead:', error)
    // Optionally rollback UI on failure
    setLeads(originalLeads)
  } else {
    // Clear undo state if update succeeds
    setOriginalLeads([])
  }
}


const handleCancelEdit = () => {
  if (originalLeads.length > 0) {
    setLeads(originalLeads)
    setOriginalLeads([])
  }
  setEditingCell(null)
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
    {/* Horizontal scroll wrapper */}
    <div className="overflow-x-auto">
      {/* Vertical scroll wrapper inside */}
      <div className="max-h-[600px] overflow-y-auto">
        <Table className="min-w-[1400px]">
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead onClick={() => handleSort('contact_name')} className="cursor-pointer px-2">
                Contact Name {sortBy === 'contact_name' && (sortAsc ? '▲' : '▼')}
              </TableHead>
              <TableHead className="px-2">Company</TableHead>
              <TableHead className="px-2">Phone</TableHead>
              <TableHead className="px-2">Mobile</TableHead>
              <TableHead className="px-2">Email</TableHead>
              <TableHead className="px-2">Region</TableHead>
              <TableHead className="px-2">Lead Source</TableHead>
              <TableHead className="px-2">First Contact</TableHead>
              <TableHead className="px-2">Last Contact</TableHead>
              <TableHead className="px-2">Service</TableHead>
              <TableHead className="px-2">Status</TableHead>
              <TableHead className="px-2">Captured By</TableHead>
              <TableHead className="px-2">Notes</TableHead>
              <TableHead onClick={() => handleSort('created_at')} className="cursor-pointer px-2">
                Date {sortBy === 'created_at' && (sortAsc ? '▲' : '▼')}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {leads.map((lead, rowIndex) => (
              <TableRow key={lead.id}>
                {[
                  'contact_name',
                  'company',
                  'phone',
                  'mobile',
                  'email',
                  'region',
                  'lead_source',
                  'first_contact',
                  'last_contact',
                  'service_product',
                  'status',
                  'captured_by',
                  'notes',
                  'created_at',
                ].map((key, colIndex) => {
                  const fieldKey = key as keyof Lead
                  const value = lead[fieldKey]
                  const val = value as string | number | null
                  const cellValue = typeof val === 'string' ? val : (val ?? '').toString()
                  const isEditable = key !== 'created_at'

                  return (
                    <TableCell key={colIndex} className="px-2 text-sm">
                      {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleSaveEdit(rowIndex, fieldKey)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(rowIndex, fieldKey)
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                          className="w-full px-1 text-sm border rounded"
                        />
                      ) : (
                        <span
                          onDoubleClick={() =>
                            isEditable && handleStartEdit(rowIndex, colIndex, cellValue)
                          }
                          className={isEditable ? 'cursor-pointer' : ''}
                        >
                          {cellValue || '—'}
                        </span>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  </CardContent>
</Card>

    </div>
  )
}
