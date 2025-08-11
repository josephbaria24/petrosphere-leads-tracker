import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { sendEmail } from '@/lib/sendEmail';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

interface Lead {
  id: string;
  status: string | null;
  captured_by: string | null;
  service_product: string | null;
  service_price: number | null;
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

    // Fetch leads from the past week
    const { data, error } = await supabase
      .from('crm_leads')
      .select<'*', Lead>()
      .gte('created_at', lastMonday.toISOString())
      .lte('created_at', today.toISOString());

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ message: 'No new leads found for the week.' });
    }

    // --- Summaries ---
    const totalLeads = data.length;

    const statusBreakdown = data.reduce<Record<string, number>>((acc, lead) => {
      const status = lead.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const capturedByBreakdown = data.reduce<Record<string, number>>((acc, lead) => {
      const captured = lead.captured_by || 'Unknown';
      acc[captured] = (acc[captured] || 0) + 1;
      return acc;
    }, {});

    const serviceBreakdown = data.reduce<Record<string, number>>((acc, lead) => {
      const service = lead.service_product || 'Unknown';
      acc[service] = (acc[service] || 0) + 1;
      return acc;
    }, {});

    const potentialIncome = data.reduce((sum, lead) => sum + (lead.service_price || 0), 0);

    // --- Create PDF with pdf-lib ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Logo
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    const logoImageBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoImageBytes);
    const logoDims = logoImage.scale(0.2);

    // Lower the logo to avoid overlap
    page.drawImage(logoImage, {
      x: 70,
      y: 740, // previously 780 → moved down slightly
      width: logoDims.width,
      height: logoDims.height
    });

    // Title block aligned with logo
    page.drawText('Weekly Sales & Marketing Report', {
      x: 50 + logoDims.width + 20, // leave space after logo
      y: 800, // align vertically with logo center
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0.6)
    });

    page.drawText(`Report Date: ${format(today, 'MMM dd, yyyy')}`, {
      x: 50 + logoDims.width + 20,
      y: 785,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3)
    });

    page.drawText(`Covers: ${format(lastMonday, 'MMM dd, yyyy')} - ${format(today, 'MMM dd, yyyy')}`, {
      x: 50 + logoDims.width + 20,
      y: 772,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3)
    });

    let y = 730;
    const tableLineHeight = 16;

    const drawSectionTitle = (title: string) => {
      page.drawText(title, { x: 50, y, size: 13, font: fontBold, color: rgb(0, 0, 0.6) });
      y -= 8;
      page.drawLine({ start: { x: 50, y: y }, end: { x: 545, y: y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
      y -= 15;
    };

    const drawTable = (rows: Array<[string, string | number]>) => {
      const col1X = 60;
      const col2X = 350;
      rows.forEach(([label, value]) => {
        page.drawText(label, { x: col1X, y, size: 11, font });
        page.drawText(String(value), { x: col2X, y, size: 11, font });
        y -= tableLineHeight;
      });
      y -= 8;
    };

    // Summary
    drawSectionTitle('Summary');
    drawTable([
      ['Total Leads', totalLeads],
      ['Potential Income (PHP)', potentialIncome.toLocaleString()]
    ]);

    // Status Breakdown
    drawSectionTitle('Status Breakdown');
    drawTable(Object.entries(statusBreakdown));

    // Captured By Breakdown
    drawSectionTitle('Captured By Breakdown');
    drawTable(Object.entries(capturedByBreakdown));

    // Services Breakdown
    drawSectionTitle('Services Breakdown');
    drawTable(Object.entries(serviceBreakdown));

    // Footer
    page.drawLine({ start: { x: 50, y: 50 }, end: { x: 545, y: 50 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    page.drawText('Confidential – For Internal Use Only', {
      x: 50, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5)
    });
    page.drawText('Page 1', {
      x: 545, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5)
    });

    const pdfBytes = await pdfDoc.save();

    // Send Email
    await sendEmail({
      to: ['jlb@petrosphere.com.ph', 'josephbaria89@gmail.com', 'rlm@petrosphere.com.ph', 'dra@petrosphere.com.ph', 'kbg@petrosphere.com.ph'],
      subject: `Automated Weekly Sales & Marketing Report - ${format(today, 'MMM dd, yyyy')}`,
      text: 'Attached is your weekly leads summary report in PDF format.',
      attachments: [
        {
          filename: `weekly_leads_${format(today, 'yyyyMMdd')}.pdf`,
          content: Buffer.from(pdfBytes).toString('base64'),
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    });

    return NextResponse.json({ message: 'PDF Report sent successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
