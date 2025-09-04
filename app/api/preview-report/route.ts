// File: /app/api/preview-report/route.ts

import { NextRequest } from 'next/server';
import { generateMonthlyReportPDF } from '@/lib/generateMonthlyReportPDF';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');

  try {
    const pdfBytes = await generateMonthlyReportPDF(month);

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename=preview_monthly_report.pdf`
      }
    });
  } catch (err: any) {
    console.error('Error generating PDF preview:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
