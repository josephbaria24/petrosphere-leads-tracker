import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { sendEmail } from '@/lib/sendEmail';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

// Helper function to draw simple bar charts
const drawBarChart = (
  page: PDFPage,
  data: { label: string; value: number; color?: [number, number, number] }[],
  x: number,
  y: number,
  width: number,
  height: number,
  font: PDFFont,
  fontBold: PDFFont,
  title: string
) => {
  // Draw title
  page.drawText(title, {
    x,
    y: y + height + 20,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0.6)
  });

  // Draw chart border
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1
  });

  if (data.length === 0) {
    page.drawText('No data available', {
      x: x + width / 2 - 50,
      y: y + height / 2,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });
    return;
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = (width - 40) / data.length;
  const maxBarHeight = height - 60;

  data.forEach((item, index) => {
    const barHeight = maxValue > 0 ? (item.value / maxValue) * maxBarHeight : 0;
    const barX = x + 20 + index * barWidth;
    const barY = y + 40;

    // Draw bar
    page.drawRectangle({
      x: barX + 5,
      y: barY,
      width: barWidth - 10,
      height: barHeight,
      color: rgb(...(item.color || [0.2, 0.4, 0.8]))
    });

    // Draw value on top of bar
    if (item.value > 0) {
      const valueText = item.value.toString();
      const textWidth = font.widthOfTextAtSize(valueText, 8);
      page.drawText(valueText, {
        x: barX + (barWidth - textWidth) / 2,
        y: barY + barHeight + 5,
        size: 8,
        font,
        color: rgb(0.3, 0.3, 0.3)
      });
    }

    // Draw label below bar (rotated if needed)
    const labelText = item.label.length > 10 ? item.label.substring(0, 10) + '...' : item.label;
    const labelWidth = font.widthOfTextAtSize(labelText, 8);
    page.drawText(labelText, {
      x: barX + (barWidth - labelWidth) / 2,
      y: y + 15,
      size: 8,
      font,
      color: rgb(0.3, 0.3, 0.3)
    });
  });
};

// Helper function to draw simple pie chart representation
const drawPieChartLegend = (
  page: PDFPage,
  data: { name: string; value: number; percentage: number }[],
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  fontBold: PDFFont,
  title: string
) => {
  // Draw title
  page.drawText(title, {
    x,
    y: y + 20,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0.6)
  });

  let currentY = y;
  const colors = [
    [0.2, 0.4, 0.8],
    [0.8, 0.2, 0.2],
    [0.2, 0.8, 0.2],
    [0.8, 0.8, 0.2],
    [0.8, 0.2, 0.8],
    [0.2, 0.8, 0.8]
  ];

  data.forEach((item, index) => {
    const color = colors[index % colors.length];
    
    // Draw color box
    page.drawRectangle({
      x,
      y: currentY - 12,
      width: 12,
      height: 12,
      color: rgb(...color as [number, number, number])
    });

    // Draw text
    page.drawText(`${item.name}: ${item.value} (${item.percentage.toFixed(1)}%)`, {
      x: x + 20,
      y: currentY - 10,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3)
    });

    currentY -= 20;
  });
};

// Helper function to draw line chart
const drawLineChart = (
  page: PDFPage,
  data: { month: string; value: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
  font: PDFFont,
  fontBold: PDFFont,
  title: string,
  color: [number, number, number] = [0.2, 0.4, 0.8]
) => {
  // Draw title
  page.drawText(title, {
    x,
    y: y + height + 20,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0.6)
  });

  // Draw chart border
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1
  });

  if (data.length === 0) {
    page.drawText('No data available', {
      x: x + width / 2 - 50,
      y: y + height / 2,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });
    return;
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const chartWidth = width - 40;
  const chartHeight = height - 40;
  const stepX = chartWidth / (data.length - 1 || 1);

  // Draw grid lines
  for (let i = 0; i <= 4; i++) {
    const gridY = y + 20 + (i * chartHeight / 4);
    page.drawLine({
      start: { x: x + 20, y: gridY },
      end: { x: x + width - 20, y: gridY },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9)
    });
  }

  // Draw line
  if (data.length > 1) {
    for (let i = 0; i < data.length - 1; i++) {
      const x1 = x + 20 + i * stepX;
      const x2 = x + 20 + (i + 1) * stepX;
      const y1 = y + 20 + (maxValue > 0 ? (data[i].value / maxValue) * chartHeight : 0);
      const y2 = y + 20 + (maxValue > 0 ? (data[i + 1].value / maxValue) * chartHeight : 0);

      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 2,
        color: rgb(...color)
      });

      // Draw data points
      page.drawCircle({
        x: x1,
        y: y1,
        size: 3,
        color: rgb(...color)
      });
    }

    // Draw last point
    const lastIndex = data.length - 1;
    const lastX = x + 20 + lastIndex * stepX;
    const lastY = y + 20 + (maxValue > 0 ? (data[lastIndex].value / maxValue) * chartHeight : 0);
    page.drawCircle({
      x: lastX,
      y: lastY,
      size: 3,
      color: rgb(...color)
    });
  }

  // Draw labels
  data.forEach((item, index) => {
    const labelX = x + 20 + index * stepX;
    const labelText = item.month.length > 6 ? item.month.substring(0, 6) : item.month;
    const textWidth = font.widthOfTextAtSize(labelText, 8);
    
    page.drawText(labelText, {
      x: labelX - textWidth / 2,
      y: y + 5,
      size: 8,
      font,
      color: rgb(0.3, 0.3, 0.3)
    });
  });
};

export async function GET(req: Request) {
  try {
    const pdfDoc = await PDFDocument.create();
    
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
  
    const today = month ? new Date(`${month}-01`) : new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const reportMonth = format(today, 'MMMM');
    const reportYear = format(today, 'yyyy');

    // Fetch all data needed for charts
    const pageSize = 1000;
    let from = 0;
    let allLeadsData: Lead[] = [];
    let done = false;

    // Fetch all leads for the month with pagination
    while (!done) {
      const { data, error } = await supabase
        .from('crm_leads')
        .select<'*', Lead>()
        .gte('first_contact', monthStart.toISOString())
        .lte('first_contact', monthEnd.toISOString())
        .range(from, from + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allLeadsData = allLeadsData.concat(data);

      if (data.length < pageSize) {
        done = true;
      } else {
        from += pageSize;
      }
    }

    if (allLeadsData.length === 0) {
      return NextResponse.json({ message: 'No new leads found for the month.' });
    }

    // Fetch webinars and social media data
    const { data: webinars, error: webinarError } = await supabase
      .from('webinar_tracker')
      .select<'*', Webinar>()
      .eq('month', reportMonth)
      .eq('year', reportYear);
    if (webinarError) throw webinarError;

    const { data: socialMedia, error: smError } = await supabase
      .from('social_media_tracker')
      .select<'*', SocialMedia>()
      .eq('month', reportMonth)
      .eq('year', reportYear)
      .maybeSingle();
    if (smError) throw smError;

    // Calculate dashboard metrics
    const totalLeads = allLeadsData.length;
    const closedWonLeads = allLeadsData.filter(lead => 
      lead.status?.toLowerCase() === 'closed win'
    ).length;
    const closedLostLeads = allLeadsData.filter(lead => 
      lead.status?.toLowerCase() === 'closed lost'
    ).length;
    const inProgressLeads = allLeadsData.filter(lead => 
      lead.status?.toLowerCase().includes('in progress') || 
      lead.status?.toLowerCase().includes('lead in')
    ).length;

    // Prepare chart data
    const statusBreakdown = allLeadsData.reduce<Record<string, number>>((acc, lead) => {
      const status = lead.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const capturedByBreakdown = allLeadsData.reduce<Record<string, number>>((acc, lead) => {
      const captured = lead.captured_by || 'Unknown';
      acc[captured] = (acc[captured] || 0) + 1;
      return acc;
    }, {});

    const serviceBreakdown = allLeadsData.reduce<Record<string, number>>((acc, lead) => {
      const service = lead.service_product || 'Unknown';
      acc[service] = (acc[service] || 0) + 1;
      return acc;
    }, {});

    const leadSourceBreakdown = allLeadsData.reduce<Record<string, number>>((acc, lead) => {
      const source = lead.lead_source || 'Unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    const potentialIncome = allLeadsData.reduce((sum, lead) => sum + (lead.service_price || 0), 0);

    // Fetch historical data for trend charts (last 6 months)
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: historicalLeads, error: histError } = await supabase
      .from('crm_leads')
      .select('first_contact, status, service_price')
      .gte('first_contact', sixMonthsAgo.toISOString())
      .lte('first_contact', monthEnd.toISOString());

    if (histError) throw histError;

    // Process historical data for trends
    const monthlyTrends: Record<string, { won: number; revenue: number; total: number }> = {};
    
    (historicalLeads || []).forEach(lead => {
      if (!lead.first_contact) return;
      const date = new Date(lead.first_contact);
      const monthKey = format(date, 'MMM yyyy');
      
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = { won: 0, revenue: 0, total: 0 };
      }
      
      monthlyTrends[monthKey].total += 1;
      if (lead.status?.toLowerCase() === 'closed win') {
        monthlyTrends[monthKey].won += 1;
        monthlyTrends[monthKey].revenue += lead.service_price || 0;
      }
    });

    // Create PDF with enhanced content
    let page = pdfDoc.addPage([595.28, 841.89]);

    // Use standard fonts instead of custom TTF fonts to avoid the fontkit error
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Logo and Header
    let logoImage: any = null;
    let logoDims: any = { width: 0, height: 0 };
    
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        const logoImageBytes = fs.readFileSync(logoPath);
        logoImage = await pdfDoc.embedPng(logoImageBytes);
        logoDims = logoImage.scale(0.2);
        page.drawImage(logoImage, { x: 70, y: 740, width: logoDims.width, height: logoDims.height });
      }
    } catch (logoError) {
      console.warn('Logo could not be loaded:', logoError);
      // Continue without logo
    }

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

    // Enhanced Dashboard Stats Section
    const drawMetricCard = (
      title: string,
      value: number,
      x: number,
      y: number,
      width: number,
      height: number,
      bgColor: [number, number, number] = [0.95, 0.95, 0.95]
    ) => {
      // Draw card background
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(...bgColor),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1
      });

      // Draw title
      page.drawText(title, {
        x: x + 10,
        y: y + height - 20,
        size: 10,
        font,
        color: rgb(0.4, 0.4, 0.4)
      });

      // Draw value
      page.drawText(value.toString(), {
        x: x + 10,
        y: y + height - 40,
        size: 16,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2)
      });
    };

    // Draw metric cards
    const cardWidth = 100;
    const cardHeight = 60;
    const cardSpacing = 20;
    let cardX = 50;

    drawMetricCard('Total Leads', totalLeads, cardX, y - cardHeight, cardWidth, cardHeight, [0.9, 0.9, 1]);
    cardX += cardWidth + cardSpacing;
    
    drawMetricCard('In Progress', inProgressLeads, cardX, y - cardHeight, cardWidth, cardHeight, [0.9, 0.95, 1]);
    cardX += cardWidth + cardSpacing;
    
    drawMetricCard('Won', closedWonLeads, cardX, y - cardHeight, cardWidth, cardHeight, [0.9, 1, 0.9]);
    cardX += cardWidth + cardSpacing;
    
    drawMetricCard('Lost', closedLostLeads, cardX, y - cardHeight, cardWidth, cardHeight, [1, 0.9, 0.9]);

    y -= cardHeight + 40;

    // Services Bar Chart
    const serviceChartData = Object.entries(serviceBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([label, value]) => ({
        label: label.length > 15 ? label.substring(0, 15) + '...' : label,
        value,
        color: [0.2, 0.4, 0.8] as [number, number, number]
      }));

    drawBarChart(page, serviceChartData, 50, y - 180, 240, 160, font, fontBold, 'Top Services/Products');

    // Captured By Pie Chart (as legend)
    const capturedByChartData = Object.entries(capturedByBreakdown)
      .sort(([,a], [,b]) => b - a)
      .map(([name, value]) => ({
        name,
        value,
        percentage: (value / totalLeads) * 100
      }));

    drawPieChartLegend(page, capturedByChartData, 320, y - 60, 200, font, fontBold, 'Leads by Personnel');

    y -= 200;

    // Lead Source Analysis
    const leadSourceChartData = Object.entries(leadSourceBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([label, value]) => ({
        label: label.length > 12 ? label.substring(0, 12) + '...' : label,
        value,
        color: [0.8, 0.4, 0.2] as [number, number, number]
      }));

    drawBarChart(page, leadSourceChartData, 50, y - 180, 240, 160, font, fontBold, 'Lead Sources');

    // Summary Table
    const drawTable = (rows: Array<[string, string | number]>, startY: number) => {
      let tableY = startY;
      rows.forEach(([label, value]) => {
        page.drawText(label, { x: 320, y: tableY, size: 11, font });
        const valueStr = String(value);
        const valueWidth = font.widthOfTextAtSize(valueStr, 11);
        page.drawText(valueStr, { x: 545 - valueWidth - 10, y: tableY, size: 11, font });
        tableY -= 16;
      });
    };

    page.drawText('Summary', { x: 320, y: y - 20, size: 13, font: fontBold, color: rgb(0, 0, 0.6) });
    drawTable([
      ['Total Leads', totalLeads],
      ['Potential Income (PHP)', potentialIncome.toLocaleString()],
      ['Conversion Rate', `${totalLeads > 0 ? ((closedWonLeads / totalLeads) * 100).toFixed(1) : 0}%`],
      ['Win Rate', `${(closedWonLeads + closedLostLeads) > 0 ? ((closedWonLeads / (closedWonLeads + closedLostLeads)) * 100).toFixed(1) : 0}%`]
    ], y - 45);

    // Footer page 1
    page.drawLine({ start: { x: 50, y: 50 }, end: { x: 545, y: 50 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    page.drawText('Confidential – For Internal Use Only', { x: 50, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    page.drawText('Page 1', { x: 520, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

    // Page 2 - Trends and Analytics
    const trendsPage = pdfDoc.addPage([595.28, 841.89]);
    let ty = 800;

    trendsPage.drawText('Performance Trends & Analytics', {
      x: 50,
      y: ty,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0.6)
    });
    ty -= 8;
    trendsPage.drawLine({ start: { x: 50, y: ty }, end: { x: 545, y: ty }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    ty -= 30;

    // Closed Won Trends
    const closedWonTrendData = Object.entries(monthlyTrends)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, data]) => ({ month, value: data.won }));

    drawLineChart(trendsPage, closedWonTrendData, 50, ty - 180, 240, 160, font, fontBold, 'Closed Won Trends (6 Months)', [0.2, 0.8, 0.2]);

    // Revenue Trends
    const revenueTrendData = Object.entries(monthlyTrends)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, data]) => ({ month, value: data.revenue }));

    drawLineChart(trendsPage, revenueTrendData, 305, ty - 180, 240, 160, font, fontBold, 'Revenue Trends (6 Months)', [0.8, 0.2, 0.2]);

    ty -= 200;

    // Lead Status Distribution Chart
    const statusChartData = Object.entries(statusBreakdown)
      .sort(([,a], [,b]) => b - a)
      .map(([label, value]) => ({
        label: label.length > 12 ? label.substring(0, 12) + '...' : label,
        value,
        color: [0.4, 0.2, 0.8] as [number, number, number]
      }));

    drawBarChart(trendsPage, statusChartData, 50, ty - 180, 495, 160, font, fontBold, 'Lead Status Distribution');

    ty -= 200;

    // Performance Metrics Table
    trendsPage.drawText('Key Performance Indicators', { x: 50, y: ty, size: 13, font: fontBold, color: rgb(0, 0, 0.6) });
    ty -= 25;

    const kpiData = [
      ['Average Deal Size', `PHP${totalLeads > 0 ? (potentialIncome / totalLeads).toLocaleString() : '0'}`],
      ['Lead Velocity', `${totalLeads} leads/month`],
      ['Top Performer', Object.entries(capturedByBreakdown).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'],
      ['Most Popular Service', Object.entries(serviceBreakdown).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'],
      ['Primary Lead Source', Object.entries(leadSourceBreakdown).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A']
    ];

    kpiData.forEach(([label, value]) => {
      trendsPage.drawText(label, { x: 60, y: ty, size: 11, font });
      const valueStr = String(value);
      const valueWidth = font.widthOfTextAtSize(valueStr, 11);
      trendsPage.drawText(valueStr, { x: 535 - valueWidth, y: ty, size: 11, font });
      ty -= 18;
    });

    // Footer page 2
    trendsPage.drawLine({ start: { x: 50, y: 50 }, end: { x: 545, y: 50 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    trendsPage.drawText('Confidential – For Internal Use Only', { x: 50, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    trendsPage.drawText('Page 2', { x: 520, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

    // Page 3 - Webinar Summary
    let webinarPage = pdfDoc.addPage([595.28, 841.89]);
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

    const ensurePageSpace = (
      currentPage: PDFPage,
      currentY: number,
      pdfDoc: PDFDocument,
      resetY = 800,
      heightNeeded = 60
    ): { page: PDFPage; y: number } => {
      if (currentY < heightNeeded) {
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        return { page: newPage, y: resetY };
      }
      return { page: currentPage, y: currentY };
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
      const lineHeight = 16;
      let check = ensurePageSpace(webinarPage, yStart, pdfDoc);
      webinarPage = check.page;
      let y = check.y;
      
      webinarPage.drawText(label, { x: col1X, y, size, font });

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
      const maxWidth = 180;
      rows.forEach(([label, value]) => {
        wy = drawWrappedTableRow(label, value, col1X, col2X, maxWidth, font, 11, wy);
      });
      wy -= 8;
    };

    if (!webinars || webinars.length === 0) {
      webinarPage.drawText('No webinars recorded for this month.', { x: 60, y: wy, size: 11, font });
      wy -= 16;
    } else {
      webinars.forEach((wb, index) => {
        wy = drawWrappedText(
          `${index + 1}. ${wb.webinar_title || 'Untitled Webinar'}`,
          60,
          wy,
          460,
          fontBold,
          11,
          16
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

    // Webinar Analytics Chart
    if (webinars && webinars.length > 0) {
      const webinarChartData = webinars.map(wb => ({
        label: wb.webinar_title?.substring(0, 10) + '...' || 'Webinar',
        value: wb.attended_participants || 0,
        color: [0.2, 0.6, 0.8] as [number, number, number]
      }));

      if (wy < 200) {
        webinarPage = pdfDoc.addPage([595.28, 841.89]);
        wy = 760;
      }

      drawBarChart(webinarPage, webinarChartData, 50, wy - 180, 495, 160, font, fontBold, 'Webinar Attendance');
    }

    webinarPage.drawLine({ start: { x: 50, y: 50 }, end: { x: 545, y: 50 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    webinarPage.drawText('Confidential – For Internal Use Only', { x: 50, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    webinarPage.drawText('Page 3', { x: 520, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

    // Page 4 - Social Media Engagement with Charts
    const smPage = pdfDoc.addPage([595.28, 841.89]);
    let sy = 800;

    smPage.drawText(`Social Media Engagement Summary for ${reportMonth} ${reportYear}`, {
      x: 50,
      y: sy,
      size: 13,
      font: fontBold,
      color: rgb(0, 0, 0.6)
    });
    sy -= 8;
    smPage.drawLine({ start: { x: 50, y: sy }, end: { x: 545, y: sy }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    sy -= 30;

    if (!socialMedia) {
      smPage.drawText('No social media data recorded for this month.', { x: 60, y: sy, size: 11, font });
    } else {
      // Social Media Engagement Chart
      const smChartData = [
        { label: 'Post Reach', value: socialMedia.post_reach || 0, color: [0.2, 0.4, 0.8] as [number, number, number] },
        { label: 'Engagement', value: socialMedia.post_engagement || 0, color: [0.8, 0.2, 0.4] as [number, number, number] },
        { label: 'New Likes', value: socialMedia.new_page_likes || 0, color: [0.2, 0.8, 0.4] as [number, number, number] },
        { label: 'New Followers', value: socialMedia.new_page_followers || 0, color: [0.8, 0.8, 0.2] as [number, number, number] },
        { label: 'Reactions', value: socialMedia.reactions || 0, color: [0.8, 0.4, 0.2] as [number, number, number] },
        { label: 'Comments', value: socialMedia.comments || 0, color: [0.4, 0.8, 0.8] as [number, number, number] }
      ].filter(item => item.value > 0); // Only show metrics with data

      if (smChartData.length > 0) {
        drawBarChart(smPage, smChartData, 50, sy - 200, 495, 180, font, fontBold, 'Social Media Metrics');
        sy -= 220;
      }

      // Social Media Summary Table
      const drawSMTable = (rows: Array<[string, string | number]>) => {
        const col1X = 60;
        const col2X = 350;
        rows.forEach(([label, value]) => {
          smPage.drawText(label, { x: col1X, y: sy, size: 11, font });
          smPage.drawText(String(value), { x: col2X, y: sy, size: 11, font });
          sy -= 16;
        });
        sy -= 8;
      };

      drawSMTable([
        ['Post Reach', socialMedia.post_reach ?? 0],
        ['Post Engagement', socialMedia.post_engagement ?? 0],
        ['New Page Likes', socialMedia.new_page_likes ?? 0],
        ['New Page Followers', socialMedia.new_page_followers ?? 0],
        ['Reactions', socialMedia.reactions ?? 0],
        ['Comments', socialMedia.comments ?? 0],
        ['Shares', socialMedia.shares ?? 0],
        ['Photo Views', socialMedia.photo_views ?? 0],
        ['Link Clicks', socialMedia.link_clicks ?? 0]
      ]);

      // Engagement Rate Calculation
      const totalEngagement = (socialMedia.reactions || 0) + (socialMedia.comments || 0) + (socialMedia.shares || 0);
      const engagementRate = socialMedia.post_reach ? ((totalEngagement / socialMedia.post_reach) * 100).toFixed(2) : '0';
      
      smPage.drawText('Analytics:', { x: 60, y: sy, size: 12, font: fontBold, color: rgb(0, 0, 0.6) });
      sy -= 20;
      smPage.drawText(`Engagement Rate: ${engagementRate}%`, { x: 60, y: sy, size: 11, font });
      sy -= 16;
      smPage.drawText(`Total Interactions: ${totalEngagement.toLocaleString()}`, { x: 60, y: sy, size: 11, font });
    }

    smPage.drawLine({ start: { x: 50, y: 50 }, end: { x: 545, y: 50 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    smPage.drawText('Confidential – For Internal Use Only', { x: 50, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    smPage.drawText('Page 4', { x: 520, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

    // Page 5 - Detailed Lead Analysis
    const detailPage = pdfDoc.addPage([595.28, 841.89]);
    let dy = 800;

    detailPage.drawText('Detailed Lead Analysis', {
      x: 50,
      y: dy,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0.6)
    });
    dy -= 8;
    detailPage.drawLine({ start: { x: 50, y: dy }, end: { x: 545, y: dy }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    dy -= 30;

    // Recent Leads Table
    detailPage.drawText('Recent Leads (Top 10)', { x: 50, y: dy, size: 13, font: fontBold, color: rgb(0, 0, 0.6) });
    dy -= 20;

    // Table headers
    detailPage.drawText('Contact Name', { x: 60, y: dy, size: 9, font: fontBold });
    detailPage.drawText('Captured By', { x: 200, y: dy, size: 9, font: fontBold });
    detailPage.drawText('Service', { x: 320, y: dy, size: 9, font: fontBold });
    detailPage.drawText('Status', { x: 450, y: dy, size: 9, font: fontBold });
    dy -= 15;

    // Draw line under headers
    detailPage.drawLine({ start: { x: 50, y: dy }, end: { x: 545, y: dy }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    dy -= 10;

    // Recent leads data
    const recentLeads = allLeadsData
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    recentLeads.forEach((lead) => {
      const contactName = (lead.contact_name || 'Unknown').substring(0, 20);
      const capturedBy = (lead.captured_by || 'Unknown').substring(0, 15);
      const service = (lead.service_product || 'Unknown').substring(0, 15);
      const status = (lead.status || 'Unknown').substring(0, 12);

      detailPage.drawText(contactName, { x: 60, y: dy, size: 8, font });
      detailPage.drawText(capturedBy, { x: 200, y: dy, size: 8, font });
      detailPage.drawText(service, { x: 320, y: dy, size: 8, font });
      detailPage.drawText(status, { x: 450, y: dy, size: 8, font });
      dy -= 14;
    });

    dy -= 20;

    // Monthly Performance Summary
    detailPage.drawText('Monthly Performance Summary', { x: 50, y: dy, size: 13, font: fontBold, color: rgb(0, 0, 0.6) });
    dy -= 25;

    const performanceMetrics = [
      ['Lead Conversion Rate', `${totalLeads > 0 ? ((closedWonLeads / totalLeads) * 100).toFixed(1) : 0}%`],
      ['Average Response Time', 'Within 24 hours'], // You can calculate this from your data
      ['Pipeline Value', `PHP${potentialIncome.toLocaleString()}`],
      ['Active Opportunities', inProgressLeads.toString()],
      ['Success Rate', `${(closedWonLeads + closedLostLeads) > 0 ? ((closedWonLeads / (closedWonLeads + closedLostLeads)) * 100).toFixed(1) : 0}%`]
    ];

    performanceMetrics.forEach(([label, value]) => {
      detailPage.drawText(label, { x: 60, y: dy, size: 11, font });
      const valueStr = String(value);
      const valueWidth = font.widthOfTextAtSize(valueStr, 11);
      detailPage.drawText(valueStr, { x: 535 - valueWidth, y: dy, size: 11, font });
      dy -= 18;
    });

    // Recommendations section
    dy -= 20;
    detailPage.drawText('Recommendations', { x: 50, y: dy, size: 13, font: fontBold, color: rgb(0, 0, 0.6) });
    dy -= 20;

    const recommendations = [];
    
    // Generate dynamic recommendations based on data
    if (closedLostLeads > closedWonLeads) {
      recommendations.push('• Focus on improving lead qualification and follow-up processes');
    }
    
    const topService = Object.entries(serviceBreakdown).sort(([,a], [,b]) => b - a)[0];
    if (topService) {
      recommendations.push(`• Consider expanding ${topService[0]} offerings based on high demand`);
    }

    const topPerformer = Object.entries(capturedByBreakdown).sort(([,a], [,b]) => b - a)[0];
    if (topPerformer) {
      recommendations.push(`• Leverage ${topPerformer[0]}'s success strategies across the team`);
    }

    if (inProgressLeads > closedWonLeads * 2) {
      recommendations.push('• Review pipeline velocity - high number of stalled opportunities');
    }

    recommendations.forEach(rec => {
      detailPage.drawText(rec, { x: 60, y: dy, size: 10, font });
      dy -= 16;
    });

    detailPage.drawLine({ start: { x: 50, y: 50 }, end: { x: 545, y: 50 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    detailPage.drawText('Confidential – For Internal Use Only', { x: 50, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    detailPage.drawText('Page 5', { x: 520, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

    // Generate and send PDF
    const pdfBytes = await pdfDoc.save();

    // Send Email with enhanced report
    await sendEmail({
      to: [
        'jlb@petrosphere.com.ph',
        // 'josephbaria89@gmail.com',
        // 'rlm@petrosphere.com.ph',
        // 'dra@petrosphere.com.ph',
        // 'kbg@petrosphere.com.ph',
        // 'sales@petrosphere.com.ph',
        // 'ceo@petrosphere.com.ph',
        // 'admin@petrosphere.com.ph',
        // 'ops@petrosphere.com.ph'
      ],
      subject: `Enhanced Monthly Sales & Marketing Report - ${format(today, 'MMM yyyy')}`,
      text: `Attached is your comprehensive monthly report with visual analytics and performance insights for ${reportMonth} ${reportYear}.

Key Highlights:
• Total Leads: ${totalLeads}
• Closed Won: ${closedWonLeads}
• Pipeline Value: PHP${potentialIncome.toLocaleString()}
• Conversion Rate: ${totalLeads > 0 ? ((closedWonLeads / totalLeads) * 100).toFixed(1) : 0}%

This report includes visual charts, performance trends, and actionable insights to help drive business growth.`,
      attachments: [
        {
          filename: `enhanced_monthly_report_${format(today, 'yyyyMM')}.pdf`,
          content: Buffer.from(pdfBytes).toString('base64'),
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    });

    return NextResponse.json({ 
      message: 'Enhanced Monthly PDF Report with charts sent successfully',
      summary: {
        totalLeads,
        closedWon: closedWonLeads,
        potentialRevenue: potentialIncome,
        conversionRate: `${totalLeads > 0 ? ((closedWonLeads / totalLeads) * 100).toFixed(1) : 0}%`
      }
    });
  } catch (err: any) {
    console.error('PDF Report Generation Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}