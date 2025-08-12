import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { sendEmail } from '@/lib/sendEmail';
import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

export async function GET() {
  try {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const reportMonth = format(today, 'MMMM');
    const reportYear = format(today, 'yyyy');

    // Fetch webinars for this month/year
    const { data: webinars, error: webinarError } = await supabase
      .from('webinar_tracker')
      .select<'*', Webinar>()
      .eq('month', reportMonth)
      .eq('year', reportYear);
    if (webinarError) throw webinarError;

    // Fetch leads from the current month
    const { data, error } = await supabase
      .from('crm_leads')
      .select<'*', Lead>()
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString());
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ message: 'No new leads found for the month.' });
    }

    // Summaries
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

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Logo
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    const logoImageBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoImageBytes);
    const logoDims = logoImage.scale(0.2);
    page.drawImage(logoImage, { x: 70, y: 740, width: logoDims.width, height: logoDims.height });

    // Title
    page.drawText('Monthly Sales & Marketing Report', {
      x: 50 + logoDims.width + 20,
      y: 800,
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
    page.drawText(`Covers: ${format(monthStart, 'MMM dd, yyyy')} - ${format(monthEnd, 'MMM dd, yyyy')}`, {
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
      page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
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

    // Summary sections
    drawSectionTitle('Summary');
    drawTable([
      ['Total Leads', totalLeads],
      ['Potential Income (PHP)', potentialIncome.toLocaleString()]
    ]);
    drawSectionTitle('Status Breakdown');
    drawTable(Object.entries(statusBreakdown));
    drawSectionTitle('Captured By Breakdown');
    drawTable(Object.entries(capturedByBreakdown));
    drawSectionTitle('Services Breakdown');
    drawTable(Object.entries(serviceBreakdown));

    // Footer page 1
    page.drawLine({ start: { x: 50, y: 50 }, end: { x: 545, y: 50 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    page.drawText('Confidential – For Internal Use Only', { x: 50, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    page.drawText('Page 1', { x: 545, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

    // Page 2 - Webinar Summary
    const webinarPage = pdfDoc.addPage([595.28, 841.89]);
    let wy = 800;
    webinarPage.drawText(`Webinar Summary for ${reportMonth} ${reportYear}`, {
      x: 50,
      y: wy,
      size: 13,
      font: fontBold,
      color: rgb(0, 0, 0.6)
    });
    wy -= 8;
    webinarPage.drawLine({ start: { x: 50, y: wy }, end: { x: 545, y: wy }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    wy -= 15;



    // Helper: Draw wrapped text on webinar page
const drawWrappedText = (
  text: string,
  x: number,
  yStart: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  lineHeight: number
) => {
  const words = text.split(' ');
  let line = '';
  let y = yStart;

  words.forEach((word, index) => {
    const testLine = line + word + ' ';
    const testWidth = font.widthOfTextAtSize(testLine, size);

    if (testWidth > maxWidth && line !== '') {
      webinarPage.drawText(line.trim(), { x, y, size, font });
      line = word + ' ';
      y -= lineHeight;
    } else {
      line = testLine;
    }

    if (index === words.length - 1) {
      webinarPage.drawText(line.trim(), { x, y, size, font });
      y -= lineHeight;
    }
  });

  return y;
};


const drawWrappedTableRow = (
  label: string,
  value: string | number,
  col1X: number,
  col2X: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  yStart: number
) => {
  const lineHeight = tableLineHeight;
  let y = yStart;

  // Draw label (single line)
  webinarPage.drawText(label, { x: col1X, y, size, font });

  // Wrap the value text
  const words = String(value).split(' ');
  let line = '';
  words.forEach((word, index) => {
    const testLine = line + word + ' ';
    const testWidth = font.widthOfTextAtSize(testLine, size);

    if (testWidth > maxWidth && line !== '') {
      webinarPage.drawText(line.trim(), { x: col2X, y, size, font });
      line = word + ' ';
      y -= lineHeight;
    } else {
      line = testLine;
    }

    if (index === words.length - 1) {
      webinarPage.drawText(line.trim(), { x: col2X, y, size, font });
    }
  });

  return y - lineHeight;
};

const drawWebinarTable = (rows: Array<[string, string | number]>) => {
  const col1X = 60;
  const col2X = 350;
  const maxWidth = 180; // wrapping width for value column
  rows.forEach(([label, value]) => {
    wy = drawWrappedTableRow(label, value, col1X, col2X, maxWidth, font, 11, wy);
  });
  wy -= 8;
};


if (!webinars || webinars.length === 0) {
  webinarPage.drawText('No webinars recorded for this month.', { x: 60, y: wy, size: 11, font });
  wy -= tableLineHeight;
} else {
  webinars.forEach((wb, index) => {
    wy = drawWrappedText(
      `${index + 1}. ${wb.webinar_title || 'Untitled Webinar'}`,
      60,
      wy,
      460,
      fontBold,
      11,
      tableLineHeight
    );

    drawWebinarTable([
      ['Presenters', wb.presenters || 'N/A'],
      ['Planned Duration', wb.duration_planned || 'N/A'],
      ['Actual Run Time', wb.actual_run_time || 'N/A'],
      ['Average Attendance Time', wb.average_attendance_time || 'N/A'],
      ['Page Views', wb.registration_page_views ?? 0],
      ['Registered', wb.registered_participants ?? 0],
      ['Attended', wb.attended_participants ?? 0],
      ['Event Rating', wb.event_rating !== null ? wb.event_rating.toFixed(2) : 'N/A']
    ]);
    wy -= 10;
  });
}


    webinarPage.drawLine({ start: { x: 50, y: 50 }, end: { x: 545, y: 50 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    webinarPage.drawText('Confidential – For Internal Use Only', { x: 50, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    webinarPage.drawText('Page 2', { x: 545, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

    const pdfBytes = await pdfDoc.save();

    // Send Email
    await sendEmail({
      to: ['jlb@petrosphere.com.ph'],
      subject: `Automated Monthly Sales & Marketing Report - ${format(today, 'MMM yyyy')}`,
      text: 'Attached is your monthly leads summary report in PDF format.',
      attachments: [
        {
          filename: `monthly_leads_${format(today, 'yyyyMM')}.pdf`,
          content: Buffer.from(pdfBytes).toString('base64'),
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    });

    return NextResponse.json({ message: 'Monthly PDF Report sent successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
