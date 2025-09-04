// File: /lib/generateMonthlyReportPDF.ts

import { PDFDocument, StandardFonts } from 'pdf-lib';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Add your Lead, Webinar, SocialMedia interfaces here
interface Lead {
  id: string;
  status: string | null;
  contact_name: string | null;
  captured_by: string | null;
  service_product: string | null;
  service_price: number | null;
  lead_source: string | null;
  first_contact: string;
  created_at: string;
}

interface SocialMedia {
  id: number;
  month: string;
  year: string | null;
  post_reach: number | null;
  post_engagement: number | null;
  new_page_likes: number | null;
  new_page_followers: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  photo_views: number | null;
  link_clicks: number | null;
  created_at: string;
}

interface Webinar {
  id: number;
  month: string;
  year: string | null;
  registration_page_views: number | null;
  registered_participants: number | null;
  attended_participants: number | null;
  webinar_title: string | null;
  presenters: string | null;
  duration_planned: string | null;
  actual_run_time: string | null;
  average_attendance_time: string | null;
  event_rating: number | null;
  created_at: string;
}

export async function generateMonthlyReportPDF(monthParam: string | null): Promise<Uint8Array> {
  const today = monthParam ? new Date(`${monthParam}-01`) : new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const reportMonth = format(today, 'MMMM');
  const reportYear = format(today, 'yyyy');

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595.28, 841.89]);

  // Simple Header
  page.drawText('Monthly Sales & Marketing Report', {
    x: 50,
    y: 800,
    size: 18,
    font: fontBold
  });
  page.drawText(`Report Date: ${format(today, 'MMM dd, yyyy')}` , {
    x: 50,
    y: 780,
    size: 10,
    font: font
  });

  // Load leads data (for demonstration, fetch 1 page only)
  const { data: leads, error: leadsError } = await supabase
    .from('crm_leads')
    .select('*')
    .gte('first_contact', monthStart.toISOString())
    .lte('first_contact', monthEnd.toISOString());

  if (leadsError) throw leadsError;

  page.drawText(`Total Leads This Month: ${leads?.length || 0}`, {
    x: 50,
    y: 750,
    size: 12,
    font: font
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
