'use client'

import { useEffect, useState, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import EditLeadModal from '@/components/EditLeadModal'


type Lead = {
  id: string
  contact_name: string
  email: string
  phone?: string
  mobile?: string
  company?: string
  address? : string
  status?: string
  region?: string
  service_product?: string
  service_price?: Float32Array
  lead_source?: string
  first_contact?: string
  last_contact?: string
  captured_by?: string
  notes?: string
  created_at?: string
}

export default function LeadsListPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'contact_name' | 'created_at'>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [editingCell, setEditingCell] = useState<{ row: string; col: keyof Lead } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [originalLeads, setOriginalLeads] = useState<Lead[]>([])
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [, setForceUpdate] = useState(0) // Force re-render trigger
  const [editMode, setEditMode] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 50
  const [totalCount, setTotalCount] = useState(0)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  
  const toggleRowSelection = (id: string) => {
    console.log('Toggling row:', id) // Debug log
    setSelectedRowIds(prev => {
      const updated = new Set(prev)
      if (updated.has(id)) {
        updated.delete(id)
        console.log('Removed:', id) // Debug log
      } else {
        updated.add(id)
        console.log('Added:', id) // Debug log
      }
      console.log('Updated set:', Array.from(updated)) // Debug log
      return updated
    })
    setForceUpdate(prev => prev + 1) // Force re-render
  }

  const selectAll = () => {
    setSelectedRowIds(new Set(leads.map(lead => lead.id)))
  }

  const clearSelection = () => {
    setSelectedRowIds(new Set())
  }

  const handleDeleteSelected = async () => {
    const idsToDelete = Array.from(selectedRowIds)
    const { error } = await supabase.from('crm_leads').delete().in('id', idsToDelete)

    if (error) {
      console.error('Error deleting leads:', error)
    } else {
      setLeads(leads.filter(lead => !selectedRowIds.has(lead.id)))
      clearSelection()
    }
  }

  const handleStartEdit = (rowId: string, col: keyof Lead, value: string) => {
    setEditingCell({ row: rowId, col })
    setEditValue(value)
    if (!originalLeads.length) setOriginalLeads([...leads])
  }

  const handleSaveEdit = async (rowId: string, key: keyof Lead) => {
    const updated = leads.map(lead =>
      lead.id === rowId ? { ...lead, [key]: editValue } : lead
    )
    setLeads(updated)
    setEditingCell(null)

    const { error } = await supabase.from('crm_leads').update({ [key]: editValue }).eq('id', rowId)
    if (error) {
      setLeads(originalLeads)
      console.error(error)
    } else {
      setOriginalLeads([])
    }
  }

  const handleCancelEdit = () => {
    setLeads(originalLeads)
    setEditingCell(null)
    setOriginalLeads([])
  }

  const [sorting, setSorting] = useState<SortingState>([])

  useEffect(() => {
    const fetchLeads = async () => {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
  
      const query = supabase
        .from('crm_leads')
        .select('*', { count: 'exact' }) // 👈 get total count too
        .order(sortBy, { ascending: sortAsc })
        .range(from, to)
  
      const { data, count, error } = await query
  
      if (error) {
        console.error('Error fetching leads:', error)
      } else {
        const filtered = data.filter((lead) =>
          lead.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
          lead.address?.toLowerCase().includes(search.toLowerCase()) ||
          lead.region?.toLowerCase().includes(search.toLowerCase()) ||
          lead.lead_source?.toLowerCase().includes(search.toLowerCase()) ||
          lead.company?.toLowerCase().includes(search.toLowerCase()) ||
          lead.service_product?.toLowerCase().includes(search.toLowerCase()) ||
          lead.email?.toLowerCase().includes(search.toLowerCase())
        )
  
        setLeads(filtered)
        setTotalCount(count || 0)
  
        const validIds = new Set(filtered.map(lead => lead.id))
        setSelectedRowIds(prev => {
          const updated = new Set<string>()
          prev.forEach(id => {
            if (validIds.has(id)) {
              updated.add(id)
            }
          })
          return updated
        })
      }
    }
  
    fetchLeads()
  }, [search, sortBy, sortAsc, page])
  

  // Check if all rows are selected
  const isAllSelected = leads.length > 0 && selectedRowIds.size === leads.length

  // Debug: Log the state to see what's happening
  useEffect(() => {
    console.log('Selected IDs:', Array.from(selectedRowIds))
    console.log('Leads count:', leads.length)
    console.log('Is all selected:', isAllSelected)
  }, [selectedRowIds, leads, isAllSelected])

  const columns = useRef<ColumnDef<Lead>[]>([
    {
      accessorKey: 'contact_name',
      header: 'Contact Name',
      enableSorting: true,
    },
    {
      accessorKey: 'company',
      header: 'Company',
    },
    {
    accessorKey: 'address',
    header: 'Address',
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
    },
    {
      accessorKey: 'mobile',
      header: 'Mobile',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'region',
      header: 'Region',
    },
    {
      accessorKey: 'lead_source',
      header: 'Lead Source',
    },
    {
      accessorKey: 'first_contact',
      header: 'First Contact',
    },
    {
      accessorKey: 'last_contact',
      header: 'Last Contact',
    },
    {
      accessorKey: 'service_product',
      header: 'Service',
    },
    {
      accessorKey: 'service_price',
      header: 'Service Price',
      },
    {
      accessorKey: 'status',
      header: 'Status',
    },
    {
      accessorKey: 'captured_by',
      header: 'Captured By',
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
    },


    
  ])

  const table = useReactTable({
    data: leads,
    columns: columns.current,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
    columnResizeMode: 'onChange',
  })

  return (
    <div>
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
      
      <div className="flex items-center justify-between px-0 mb-4">
      <Button
        onClick={() => {
          setEditMode(prev => {
            const newMode = !prev
            if (newMode) {
              // Just entered edit mode — clear previous selection
              setSelectedRowIds(new Set())
            }
            return newMode
          })
        }}
        className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {editMode ? 'Exit Edit Mode' : 'Edit'}
      </Button>


        {editMode && (
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-600">
      {selectedRowIds.size} selected
    </span>

    <button
      onClick={selectAll}
      className="px-3 py-1 text-sm bg-gray-300 rounded hover:bg-gray-400"
    >
      Select All
    </button>

    <button
      onClick={clearSelection}
      className="px-3 py-1 text-sm bg-gray-300 rounded hover:bg-gray-400"
      disabled={selectedRowIds.size === 0}
    >
      Clear
    </button>

    <button
      onClick={() => {
        const confirmed = window.confirm('Are you sure you want to delete selected leads?')
        if (confirmed) {
          const doubleConfirm = window.confirm('This action is irreversible. Confirm again?')
          if (doubleConfirm) {
            handleDeleteSelected()
          }
        }
      }}
      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
      disabled={selectedRowIds.size === 0}
    >
      Delete Selected
    </button>
  </div>
)}



      </div>


      <Card>
        <CardHeader>
          <CardTitle className="text-xl">All CRM Leads</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            
            <div style={{ maxHeight: '500px' }} className="overflow-y-auto">
              <table className="min-w-[1400px] border-separate border-spacing-0">
                <thead className="sticky top-0 bg-white z-10">
                  
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          style={{ width: header.getSize() }}
                          className="relative px-2 text-left border-b whitespace-nowrap cursor-pointer"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: ' ▲',
                            desc: ' ▼',
                          }[header.column.getIsSorted() as string] ?? null}

                          {header.column.getCanResize() && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none bg-gray-200"
                            />
                          )}
                        </th>
                      ))}
                    </tr>
                    
                  ))}
                </thead>
                <tbody>
                  
                {table.getRowModel().rows.map(row => (
                  
                  <tr
                      key={row.id}
                      className={`cursor-pointer hover:bg-gray-100 ${
                        editMode && selectedRowIds.has(row.original.id) ? 'bg-red-200' : ''
                      }`}
                      
                      onClick={() => {
                        if (editMode) {
                          toggleRowSelection(row.original.id)
                        } else {
                          setSelectedLead(row.original)
                          setEditModalOpen(true)
                        }
                      }}
                    >

                      {row.getVisibleCells().map(cell => {
                        // Directly compare column.id, not colKey
                        if (cell.column.id === 'select') {
                          return (
                            <td key={cell.id} className="px-2 text-sm border-b">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        }

                        const colKey = cell.column.id as keyof Lead;
                        const rawValue = cell.getValue() as string | number | null;
                        const display = rawValue == null ? '' : String(rawValue);
                        const isEditing =
                          editingCell?.row === row.original.id &&
                          editingCell.col === colKey;

                        return (
                          <td
                            key={cell.id}
                            className="px-2 text-sm border-b cursor-pointer"
                            onDoubleClick={() => {
                              if (!isEditing) {
                                handleStartEdit(row.original.id, colKey, display);
                              }
                            }}
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => handleSaveEdit(row.original.id, colKey)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEdit(row.original.id, colKey);
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                                className="w-full px-1 text-sm border rounded"
                              />
                            ) : (
                              <span
                              className="block w-full overflow-hidden text-ellipsis line-clamp-2 max-h-[3em]"
                              title={display || '—'}
                            >
                              {display || '—'}
                            </span>

                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-between items-center px-10 mt-4 text-sm">
  <span>
    Showing {(page - 1) * pageSize + 1}–
    {Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} leads
  </span>
  <div className="flex gap-2">
    <button
      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
      disabled={page === 1}
      className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
    >
      Previous
    </button>
    <button
      onClick={() => setPage(prev => (page * pageSize < totalCount ? prev + 1 : prev))}
      disabled={page * pageSize >= totalCount}
      className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
    >
      Next
    </button>
  </div>
</div>

      <div className="flex justify-end px-10 mt-2 text-sm text-muted-foreground">
  Showing {leads.length.toLocaleString()} {leads.length === 1 ? 'lead' : 'leads'}
</div>
    {selectedLead && (
      <EditLeadModal
      isOpen={editModalOpen}
      onClose={() => setEditModalOpen(false)}
      lead={selectedLead}
      onSave={async (updated: Partial<Lead>) => {
        const { error } = await supabase
          .from('crm_leads')
          .update(updated)
          .eq('id', updated.id)
      
        if (!error) {
          setLeads(prev =>
            prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
          )
          setEditModalOpen(false)
          setSelectedLead(null)
        } else {
          console.error(error)
        }
      }}
    />)}

    </div>
    
  )
}