import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { sendEmail } from '@/lib/sendEmail';

interface Lead {
  id: string;
  contact_name: string;
  company: string | null;
  email: string | null;
  service_price: number | null;
  lead_source: string | null;
  status: string | null;
  created_at: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

export async function GET() {
  try {
    const today = new Date();
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - 7);

    // Query new leads in the last 7 days
    const { data, error } = await supabase
      .from('crm_leads')
      .select<'*', Lead>()
      .gte('created_at', lastMonday.toISOString())
      .lte('created_at', today.toISOString());

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ message: 'No new leads found for the week.' });
    }

    // Create CSV
    const csvRows = [
      ['ID', 'Contact Name', 'Company', 'Email', 'Service Price', 'Lead Source', 'Status', 'Created At'],
      ...data.map(row => [
        row.id,
        row.contact_name,
        row.company || '',
        row.email || '',
        row.service_price?.toString() || '',
        row.lead_source || '',
        row.status || '',
        row.created_at
      ])
    ];
    const csvContent = csvRows.map(r => r.join(',')).join('\n');

    // Send email
    await sendEmail({
      to: ['jlb@petrosphere.com.ph', 'josephbaria89@gmail.com'],
      subject: `Weekly Sales & Marketing Report - ${format(today, 'MMM dd, yyyy')}`,
      text: 'Attached is your weekly leads report.',
      attachments: [
        {
          filename: `weekly_leads_${format(today, 'yyyyMMdd')}.csv`,
          content: Buffer.from(csvContent).toString('base64'),
          type: 'text/csv',
          disposition: 'attachment'
        }
      ]
    });

    return NextResponse.json({ message: 'Report sent successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
