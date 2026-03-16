'use client'

import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Upload, FileSpreadsheet, Info, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const COLUMN_MAPPING = {
    'Contact Name': 'contact_name',
    'Email': 'email',
    'Phone': 'phone',
    'Mobile': 'mobile',
    'Company': 'company',
    'Address': 'address',
    'Region': 'region',
    'Lead Source': 'lead_source',
    'First Contact': 'first_contact',
    'Last Contact': 'last_contact',
    'Status': 'status',
    'Captured By': 'captured_by',
    'Notes': 'notes',
    'Service Product': 'service_product',
    'Service Price': 'service_price',
    'Mode of Service': 'mode_of_service'
}

const REQUIRED_COLUMNS = ['Contact Name', 'Email', 'Company', 'Status']

export function ExcelActions({ onImportSuccess }: { onImportSuccess?: () => void }) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isImporting, setIsImporting] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [previewData, setPreviewData] = useState<any[] | null>(null)

    const downloadTemplate = async () => {
        try {
            const ExcelJS = (await import('exceljs')).default;
            const saveAs = (await import('file-saver')).saveAs;

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Leads');
            const listSheet = workbook.addWorksheet('Lists', { state: 'hidden' });

            // Setup Lists Sheet
            const regionList = [
                'N/A', 'Region I - Ilocos Region', 'Region II - Cagayan Valley',
                'Region III - Central Luzon', 'Region IV-A - CALABARZON',
                'Region IV-B - MIMAROPA Region', 'Region V - Bicol Region',
                'Region VI - Western Visayas', 'Region VII - Central Visayas',
                'Region VIII - Eastern Visayas', 'Region IX - Zamboanga Peninsula',
                'Region X - Northern Mindanao', 'Region XI - Davao Region',
                'Region XII - SOCCSKSARGEN', 'Region XIII - Caraga',
                'NCR - National Capital Region', 'CAR - Cordillera Administrative Region',
                'BARMM - Bangsamoro Autonomous Region in Muslim Mindanao',
                'NIR - Negros Island Region'
            ];

            const statusList = [
                'Lead In', 'Contact Made', 'Needs Defined', 'Proposal Sent',
                'Negotiation Started', 'For Follow up', 'Closed Win', 'Closed Lost'
            ];

            const capturedByList = [
                'Ross', 'Randy', 'Michelle', 'Harthwell', 'Sergs', 'Krezel',
                'Carmela', 'Cherrylene', 'Kim', 'Clowie', 'Jacob', 'Mary'
            ];

            const modeList = ['Online', 'Face to Face', 'Hybrid'];

            // Fetch dynamic lists
            const { data: sources } = await supabase.from('lead_sources').select('name');
            const { data: services } = await supabase.from('services').select('name');
            const sourceList = sources?.map(s => s.name) || ['Website', 'Facebook', 'Referral'];
            const serviceList = services?.map(s => s.name) || ['Osh Technical', 'First Aid', 'HSE'];

            // Populate listSheet
            const populateList = (colIndex: number, list: string[]) => {
                list.forEach((item, i) => {
                    listSheet.getCell(i + 1, colIndex).value = item;
                });
                return `Lists!$${listSheet.getColumn(colIndex).letter}$1:$${listSheet.getColumn(colIndex).letter}$${list.length}`;
            };

            const regionRange = populateList(1, regionList);
            const sourceRange = populateList(2, sourceList);
            const statusRange = populateList(3, statusList);
            const personRange = populateList(4, capturedByList);
            const serviceRange = populateList(5, serviceList);
            const modeRange = populateList(6, modeList);

            // Setup Leads Sheet
            worksheet.columns = [
                { header: 'Contact Name', key: 'contact_name', width: 25 },
                { header: 'Email', key: 'email', width: 25 },
                { header: 'Phone', key: 'phone', width: 15 },
                { header: 'Mobile', key: 'mobile', width: 15 },
                { header: 'Company', key: 'company', width: 25 },
                { header: 'Address', key: 'address', width: 30 },
                { header: 'Region', key: 'region', width: 25 },
                { header: 'Lead Source', key: 'lead_source', width: 20 },
                { header: 'First Contact', key: 'first_contact', width: 15 },
                { header: 'Last Contact', key: 'last_contact', width: 15 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Captured By', key: 'captured_by', width: 15 },
                { header: 'Notes', key: 'notes', width: 30 },
                { header: 'Service Product', key: 'service_product', width: 25 },
                { header: 'Service Price', key: 'service_price', width: 15 },
                { header: 'Mode of Service', key: 'mode_of_service', width: 15 }
            ];

            // Sample Data
            worksheet.addRow({
                'contact_name': 'John Doe',
                'email': 'john@example.com',
                'phone': '1234567890',
                'mobile': '09123456789',
                'company': 'Example Corp',
                'address': '123 Street, City',
                'region': 'NCR - National Capital Region',
                'lead_source': 'Website',
                'first_contact': '2024-01-01',
                'last_contact': '2024-01-02',
                'status': 'Lead In',
                'captured_by': 'Ross',
                'notes': 'Sample note',
                'service_product': 'Osh Technical',
                'service_price': 5000,
                'mode_of_service': 'Online'
            });

            // Data Validation Configuration
            const validations = [
                { col: 'G', formula: regionRange },
                { col: 'H', formula: sourceRange },
                { col: 'K', formula: statusRange },
                { col: 'L', formula: personRange },
                { col: 'N', formula: serviceRange },
                { col: 'P', formula: modeRange }
            ];

            // Apply validation to rows 2 through 100
            for (let i = 2; i <= 100; i++) {
                validations.forEach(v => {
                    const cell = worksheet.getCell(`${v.col}${i}`);
                    cell.dataValidation = {
                        type: 'list',
                        allowBlank: true,
                        formulae: [v.formula]
                    };
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), 'Leads_Template.xlsx');
            toast.success('Template downloaded with dropdowns');
        } catch (err: any) {
            console.error('Template download error:', err);
            toast.error('Failed to generate template');
        }
    }

    const exportLeads = async () => {
        try {
            const { data, error } = await supabase
                .from('crm_leads')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            if (!data || data.length === 0) {
                toast.error('No leads found to export')
                return
            }

            // Map DB columns back to user-friendly names
            const exportData = data.map(lead => ({
                'Contact Name': lead.contact_name,
                'Email': lead.email,
                'Phone': lead.phone,
                'Mobile': lead.mobile,
                'Company': lead.company,
                'Address': lead.address,
                'Region': lead.region,
                'Lead Source': lead.lead_source,
                'First Contact': lead.first_contact,
                'Last Contact': lead.last_contact,
                'Status': lead.status,
                'Captured By': lead.captured_by,
                'Notes': lead.notes,
                'Service Product': lead.service_product,
                'Service Price': lead.service_price,
                'Mode of Service': lead.mode_of_service
            }))

            const ws = XLSX.utils.json_to_sheet(exportData)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Leads')
            XLSX.writeFile(wb, `Leads_Export_${new Date().toISOString().split('T')[0]}.xlsx`)
            toast.success('Leads exported successfully')
        } catch (err: any) {
            toast.error('Export failed', { description: err.message })
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        const reader = new FileReader()

        reader.onload = async (event) => {
            try {
                const bstr = event.target?.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const data = XLSX.utils.sheet_to_json(ws)

                if (data.length === 0) {
                    toast.error('The Excel file is empty')
                    setIsImporting(false)
                    return
                }

                // Validate headers
                const headers = Object.keys(data[0] as object)
                const missingRequired = REQUIRED_COLUMNS.filter(col => !headers.includes(col))

                if (missingRequired.length > 0) {
                    toast.error(`Missing required columns: ${missingRequired.join(', ')}`)
                    setIsImporting(false)
                    return
                }

                const { data: { user } } = await supabase.auth.getUser()
                if (!user) throw new Error('User not authenticated')

                // Map data to DB schema for preview and final insert
                const leadsToInsert = data.map((row: any) => {
                    const lead: any = { user_id: user.id }
                    Object.entries(COLUMN_MAPPING).forEach(([excelHeader, dbField]) => {
                        if (row[excelHeader] !== undefined) {
                            lead[dbField] = row[excelHeader]
                        }
                    })
                    return lead
                })

                setPreviewData(leadsToInsert)
            } catch (err: any) {
                console.error('Import error:', err)
                toast.error('Import failed', { description: err.message })
            } finally {
                setIsImporting(false)
                if (fileInputRef.current) fileInputRef.current.value = ''
            }
        }

        reader.readAsBinaryString(file)
    }

    const confirmImport = async () => {
        if (!previewData) return

        setIsImporting(true)
        try {
            const { error } = await supabase.from('crm_leads').insert(previewData)

            if (error) throw error

            toast.success(`Successfully imported ${previewData.length} leads`)
            setIsDialogOpen(false)
            setPreviewData(null)
            if (onImportSuccess) onImportSuccess()
        } catch (err: any) {
            toast.error('Import failed', { description: err.message })
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <div className="flex flex-wrap gap-3">
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) setPreviewData(null)
            }}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                        <Upload className="w-4 h-4 mr-2 text-green-600" />
                        Import from Excel
                    </Button>
                </DialogTrigger>
                <DialogContent className={`${previewData ? 'sm:max-w-[900px]' : 'sm:max-w-[500px]'} bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]`}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                            {previewData ? 'Preview Import Data' : 'Import Leads from Excel'}
                        </DialogTitle>
                        <DialogDescription>
                            {previewData
                                ? `Verify the ${previewData.length} leads below before confirming.`
                                : 'Upload an Excel file (.xlsx or .xls) to bulk import leads.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden">
                        {!previewData ? (
                            <div className="space-y-6 py-4">
                                <Alert variant="default" className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                                    <Info className="h-4 w-4 text-blue-600" />
                                    <AlertTitle className="text-blue-900 dark:text-blue-100">Template Instructions</AlertTitle>
                                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                                        Download the template below to ensure your data is formatted correctly.
                                        Required columns: <strong>{REQUIRED_COLUMNS.join(', ')}</strong>.
                                    </AlertDescription>
                                </Alert>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-semibold flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            Allowed Columns
                                        </h4>
                                        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                                            {Object.keys(COLUMN_MAPPING).map(col => (
                                                <li key={col} className="flex items-center gap-1">
                                                    {REQUIRED_COLUMNS.includes(col) && <span className="text-red-500 font-bold">*</span>}
                                                    {col}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="flex flex-col justify-center items-center p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 hover:bg-green-50/50 dark:hover:bg-green-900/5 transition-colors group cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="w-8 h-8 text-zinc-400 group-hover:text-green-600 mb-2 transition-colors" />
                                        <p className="text-xs font-medium text-center text-zinc-600 dark:text-zinc-400 group-hover:text-green-700">
                                            {isImporting ? 'Processing...' : 'Click to upload Excel'}
                                        </p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx, .xls"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-4 h-full flex flex-col">
                                <div className="border rounded-lg overflow-auto max-h-[50vh]">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                                            <tr>
                                                <th className="p-2 border-b">Name</th>
                                                <th className="p-2 border-b">Email</th>
                                                <th className="p-2 border-b">Company</th>
                                                <th className="p-2 border-b">Status</th>
                                                <th className="p-2 border-b">Region</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.map((lead, idx) => (
                                                <tr key={idx} className="border-b hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                                                    <td className="p-2">{lead.contact_name}</td>
                                                    <td className="p-2 font-mono">{lead.email}</td>
                                                    <td className="p-2">{lead.company}</td>
                                                    <td className="p-2">{lead.status}</td>
                                                    <td className="p-2">{lead.region}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <Alert variant="default" className="mt-4 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                                    <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-xs">
                                        Review the data carefully. Clicking "Confirm Import" will add all {previewData.length} records to the database.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-auto">
                        {!previewData ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={downloadTemplate}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download Template
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewData(null)}
                            >
                                Back to Upload
                            </Button>
                        )}
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            {previewData && (
                                <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={confirmImport}
                                    disabled={isImporting}
                                >
                                    {isImporting ? 'Importing...' : 'Confirm Import'}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Button
                variant="outline"
                onClick={exportLeads}
                className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300"
            >
                <Download className="w-4 h-4 mr-2 text-blue-600" />
                Export to Excel
            </Button>
        </div>
    )
}
