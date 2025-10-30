import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
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

interface MonthlyData {
  leads: Lead[];
  webinars: Webinar[];
  socialMedia: SocialMedia | null;
  totalLeads: number;
  closedWonLeads: number;
  closedLostLeads: number;
  inProgressLeads: number;
  potentialIncome: number;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

// Helper function to calculate percentage change
const calculatePercentageChange = (current: number, previous: number): string => {
  if (typeof current !== 'number' || typeof previous !== 'number' || isNaN(current) || isNaN(previous)) {
    return '0%';
  }
  if (previous === 0) {
    return current > 0 ? '+∞%' : '0%';
  }
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};


// Helper function to get trend arrow
const getTrendArrow = (current: number, previous: number): string => {
  if (current > previous) return 'Increase';
  if (current < previous) return 'Decrease';
  return 'No Change';
};

// Helper function to fetch monthly data
const fetchMonthlyData = async (monthStart: Date, monthEnd: Date, reportMonth: string, reportYear: string): Promise<MonthlyData> => {
  // Fetch leads data with pagination
  const pageSize = 1000;
  let from = 0;
  let allLeadsData: Lead[] = [];
  let done = false;

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

  // Calculate metrics
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
  const potentialIncome = allLeadsData.reduce((sum, lead) => sum + (lead.service_price || 0), 0);

  return {
    leads: allLeadsData,
    webinars: webinars || [],
    socialMedia,
    totalLeads,
    closedWonLeads,
    closedLostLeads,
    inProgressLeads,
    potentialIncome
  };
};


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
        size: 7,
        font,
        color: rgb(0.3, 0.3, 0.3)
      });
    }

    // Draw label below bar
    const labelText = item.label.length > 10 ? item.label.substring(0, 10) + '...' : item.label;
    const labelWidth = font.widthOfTextAtSize(labelText, 8);
    page.drawText(labelText, {
      x: barX + (barWidth - labelWidth) / 2,
      y: y + 15,
      size: 7,
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
      size: 7,
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

    // Calculate previous month
    const previousMonth = subMonths(today, 1);
    const previousMonthStart = startOfMonth(previousMonth);
    const previousMonthEnd = endOfMonth(previousMonth);
    const previousReportMonth = format(previousMonth, 'MMMM');
    const previousReportYear = format(previousMonth, 'yyyy');

    // Fetch current month data
    const currentData = await fetchMonthlyData(monthStart, monthEnd, reportMonth, reportYear);

    // Fetch previous month data
    const previousData = await fetchMonthlyData(previousMonthStart, previousMonthEnd, previousReportMonth, previousReportYear);

    if (currentData.totalLeads === 0) {
      return NextResponse.json({ message: 'No new leads found for the month.' });
    }

    // Prepare chart data for current month
    const statusBreakdown = currentData.leads.reduce<Record<string, number>>((acc, lead) => {
      const status = lead.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const capturedByBreakdown = currentData.leads.reduce<Record<string, number>>((acc, lead) => {
      const captured = lead.captured_by || 'Unknown';
      acc[captured] = (acc[captured] || 0) + 1;
      return acc;
    }, {});

    const serviceBreakdown = currentData.leads.reduce<Record<string, number>>((acc, lead) => {
      const service = lead.service_product || 'Unknown';
      acc[service] = (acc[service] || 0) + 1;
      return acc;
    }, {});

    const leadSourceBreakdown = currentData.leads.reduce<Record<string, number>>((acc, lead) => {
      const source = lead.lead_source || 'Unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

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
    page.drawText(`Report Generated: ${format(new Date(), 'MMM dd, yyyy')}`, {
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

    // Enhanced Dashboard Stats Section with Comparisons
    const drawMetricCard = (
      title: string,
      value: number,
      previousValue: number,
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
        y: y + height - 15,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4)
      });

      // Draw current value
      page.drawText(value.toString(), {
        x: x + 10,
        y: y + height - 32,
        size: 14,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2)
      });

      // Draw comparison
      const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
      const safePreviousValue = typeof previousValue === 'number' && !isNaN(previousValue) ? previousValue : 0;
      
      const change = calculatePercentageChange(safeValue, safePreviousValue);
      const arrow = getTrendArrow(safeValue, safePreviousValue);
      const changeColor = safeValue > safePreviousValue ? [0, 0.6, 0] : safeValue < safePreviousValue ? [0.8, 0, 0] : [0.5, 0.5, 0.5];
      
      page.drawText(`${arrow} ${change}`, {
        x: x + 10,
        y: y + height - 48,
        size: 7,
        font,
        color: rgb(...changeColor as [number, number, number])
      });
      // Draw previous month label
      page.drawText(`vs ${previousReportMonth}`, {
        x: x + 10,
        y: y + height - 60,
        size: 7,
        font,
        color: rgb(0.6, 0.6, 0.6)
      });
    };

    // Draw metric cards with comparisons
    const cardWidth = 100;
    const cardHeight = 70;
    const cardSpacing = 20;
    let cardX = 50;

    drawMetricCard('Total Leads', currentData.totalLeads, previousData.totalLeads, cardX, y - cardHeight, cardWidth, cardHeight, [0.9, 0.9, 1]);
    cardX += cardWidth + cardSpacing;
    
    drawMetricCard('In Progress', currentData.inProgressLeads, previousData.inProgressLeads, cardX, y - cardHeight, cardWidth, cardHeight, [0.9, 0.95, 1]);
    cardX += cardWidth + cardSpacing;
    
    drawMetricCard('Won', currentData.closedWonLeads, previousData.closedWonLeads, cardX, y - cardHeight, cardWidth, cardHeight, [0.9, 1, 0.9]);
    cardX += cardWidth + cardSpacing;
    
    drawMetricCard('Lost', currentData.closedLostLeads, previousData.closedLostLeads, cardX, y - cardHeight, cardWidth, cardHeight, [1, 0.9, 0.9]);

    y -= cardHeight + 40;

    // Month-over-Month Comparison Box
    page.drawText('Month-over-Month Comparison', { x: 50, y: y, size: 13, font: fontBold, color: rgb(0, 0, 0.6) });
    y -= 20;

    const comparisonData = [
      ['Total Leads', currentData.totalLeads, previousData.totalLeads],
      ['Revenue Potential', currentData.potentialIncome, previousData.potentialIncome],
      ['Conversion Rate(closed won/total)', 
        currentData.totalLeads > 0 ? ((currentData.closedWonLeads / currentData.totalLeads) * 100) : 0,
        previousData.totalLeads > 0 ? ((previousData.closedWonLeads / previousData.totalLeads) * 100) : 0
      ]
    ];

    comparisonData.forEach(([label, current, previous]) => {
      const currentNum = Number(current);
      const previousNum = Number(previous);
      const change = calculatePercentageChange(currentNum, previousNum);
      const arrow = getTrendArrow(currentNum, previousNum);
      const changeColor = currentNum > previousNum ? [0, 0.6, 0] : currentNum < previousNum ? [0.8, 0, 0] : [0.5, 0.5, 0.5];
      
      page.drawText(String(label), { x: 60, y: y, size: 10, font });
      
      let valueText = '';
      if (label === 'Revenue Potential') {
        valueText = `PHP${currentNum.toLocaleString()}`;
      } else if (label === 'Conversion Rate(closed won/total)') {
        valueText = `${currentNum.toFixed(1)}%`;
      } else {
        valueText = currentNum.toString();
      }
      
      page.drawText(valueText, { x: 250, y: y, size: 10, font });
      page.drawText(`${arrow} ${change}`, { 
        x: 380, 
        y: y, 
        size: 10, 
        font,
        color: rgb(...changeColor as [number, number, number])
      });
      y -= 16;
    });

    y -= 20;

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
        percentage: (value / currentData.totalLeads) * 100
      }));

    drawPieChartLegend(page, capturedByChartData, 320, y - 60, 200, font, fontBold, 'Leads by Personnel');

    y -= 200;


    // Helper function to shorten lead source names
    const shortenLeadSource = (label: string): string => {
      if (label.startsWith("Inbound - ")) {
        return "I-" + label.replace("Inbound - ", "");
      } else if (label.startsWith("Outbound - ")) {
        return "O-" + label.replace("Outbound - ", "");
      }
      return label;
    };
    // Lead Source Analysis
    const leadSourceChartData = Object.entries(leadSourceBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([label, value]) => ({
        label: shortenLeadSource(label),
        value,
        color: [0.8, 0.4, 0.2] as [number, number, number]
      }));

      drawBarChart(page, leadSourceChartData, 50, y - 180, 260, 160, font, fontBold, 'Lead Sources');


    // Enhanced Summary Table with Comparisons
    const drawComparisonTable = (
      rows: Array<[string, string | number, string | number]>,
      startY: number,
      startX = 320  // <-- Add this default parameter
    ) => {
      let tableY = startY;
      
      // Headers
      page.drawText('Metric', { x: startX, y: tableY, size: 10, font: fontBold });
      page.drawText('Current', { x: startX + 100, y: tableY, size: 10, font: fontBold });
      page.drawText('Previous', { x: startX + 170, y: tableY, size: 10, font: fontBold });
      tableY -= 16;
      
      rows.forEach(([label, current, previous]) => {
        page.drawText(String(label), { x: startX, y: tableY, size: 8, font });
        page.drawText(String(current), { x: startX + 100, y: tableY, size: 8, font });
        page.drawText(String(previous), { x: startX + 170, y: tableY, size: 8, font });
        tableY -= 14;
      });
    };
    

    page.drawText('Summary Comparison', { x: 320, y: y - 20, size: 13, font: fontBold, color: rgb(0, 0, 0.6) });
    
    const summaryComparison: [string, string | number, string | number][] = [
      ['Total Leads', currentData.totalLeads, previousData.totalLeads],
      ['Potential Income (PHP)', currentData.potentialIncome.toLocaleString(), previousData.potentialIncome.toLocaleString()],
      ['Conversion Rate', 
        `${currentData.totalLeads > 0 ? ((currentData.closedWonLeads / currentData.totalLeads) * 100).toFixed(1) : 0}%`,
        `${previousData.totalLeads > 0 ? ((previousData.closedWonLeads / previousData.totalLeads) * 100).toFixed(1) : 0}%`
      ],
      ['Win Rate', 
        `${(currentData.closedWonLeads + currentData.closedLostLeads) > 0 ? ((currentData.closedWonLeads / (currentData.closedWonLeads + currentData.closedLostLeads)) * 100).toFixed(1) : 0}%`,
        `${(previousData.closedWonLeads + previousData.closedLostLeads) > 0 ? ((previousData.closedWonLeads / (previousData.closedWonLeads + previousData.closedLostLeads)) * 100).toFixed(1) : 0}%`
      ]
    ];
    
    drawComparisonTable(summaryComparison, y - 45, 320);

    // Footer page 1
    page.drawLine({ start: { x: 50, y: 50 }, end: { x: 545, y: 50 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    page.drawText('Confidential – For Internal Use Only', { x: 50, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    page.drawText('Page 1', { x: 520, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

    // Page 2 - Trends and Analytics with Comparisons
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

    // Performance Metrics Table with Comparisons
    trendsPage.drawText('Key Performance Indicators Comparison', { x: 50, y: ty, size: 13, font: fontBold, color: rgb(0, 0, 0.6) });
    ty -= 25;

    const kpiComparisonData = [
      ['Average Deal Size', 
        `PHP${currentData.totalLeads > 0 ? (currentData.potentialIncome / currentData.totalLeads).toLocaleString() : '0'}`,
        `PHP${previousData.totalLeads > 0 ? (previousData.potentialIncome / previousData.totalLeads).toLocaleString() : '0'}`
      ],
      ['Lead Velocity', `${currentData.totalLeads} leads/month`, `${previousData.totalLeads} leads/month`],
      ['Current Top Performer', Object.entries(capturedByBreakdown).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A', 'N/A'],
      ['Most Popular Service', Object.entries(serviceBreakdown).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A', 'N/A'],
      ['Primary Lead Source', Object.entries(leadSourceBreakdown).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A', 'N/A']
    ];

    // Draw KPI comparison table
    trendsPage.drawText('Current Month', { x: 200, y: ty, size: 10, font: fontBold });
    trendsPage.drawText('Previous Month', { x: 380, y: ty, size: 10, font: fontBold });
    ty -= 16;

    kpiComparisonData.forEach(([label, current, previous]) => {
      trendsPage.drawText(String(label), { x: 60, y: ty, size: 10, font });
      trendsPage.drawText(String(current), { x: 200, y: ty, size: 10, font });
      trendsPage.drawText(String(previous), { x: 380, y: ty, size: 10, font });
      ty -= 16;
    });

    // Month-over-Month Growth Analysis
    ty -= 20;
    trendsPage.drawText('Growth Analysis', { x: 50, y: ty, size: 13, font: fontBold, color: rgb(0, 0, 0.6) });
    ty -= 20;

    const growthMetrics = [
      ['Lead Generation Growth', calculatePercentageChange(currentData.totalLeads, previousData.totalLeads)],
      ['Revenue Potential Growth', calculatePercentageChange(currentData.potentialIncome, previousData.potentialIncome)],
      ['Conversion Rate Change', calculatePercentageChange(
        currentData.totalLeads > 0 ? (currentData.closedWonLeads / currentData.totalLeads) * 100 : 0,
        previousData.totalLeads > 0 ? (previousData.closedWonLeads / previousData.totalLeads) * 100 : 0
      )],
      ['Win Rate Change', calculatePercentageChange(
        (currentData.closedWonLeads + currentData.closedLostLeads) > 0 ? (currentData.closedWonLeads / (currentData.closedWonLeads + currentData.closedLostLeads)) * 100 : 0,
        (previousData.closedWonLeads + previousData.closedLostLeads) > 0 ? (previousData.closedWonLeads / (previousData.closedWonLeads + previousData.closedLostLeads)) * 100 : 0
      )]
    ];

    growthMetrics.forEach(([metric, change]) => {
      const changeNum = parseFloat(String(change).replace(/[+%]/g, ''));
      const changeColor = changeNum > 0 ? [0, 0.6, 0] : changeNum < 0 ? [0.8, 0, 0] : [0.5, 0.5, 0.5];
      
      trendsPage.drawText(String(metric), { x: 60, y: ty, size: 11, font });
      trendsPage.drawText(String(change), { 
        x: 400, 
        y: ty, 
        size: 11, 
        font: fontBold,
        color: rgb(...changeColor as [number, number, number])
      });
      ty -= 18;
    });

    // Footer page 2
    trendsPage.drawLine({ start: { x: 50, y: 50 }, end: { x: 545, y: 50 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    trendsPage.drawText('Confidential – For Internal Use Only', { x: 50, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    trendsPage.drawText('Page 2', { x: 520, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

    // Page 3 - Webinar Summary with Comparisons
    let webinarPage = pdfDoc.addPage([595.28, 841.89]);
    let wy = 800;
    
    webinarPage.drawText(`Webinar Summary Comparison`, {
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

    // Current Month Webinars
    webinarPage.drawText(`${reportMonth} ${reportYear} Webinars:`, { x: 60, y: wy, size: 12, font: fontBold });
    wy -= 20;

    if (!currentData.webinars || currentData.webinars.length === 0) {
      webinarPage.drawText('No webinars recorded for this month.', { x: 60, y: wy, size: 11, font });
      wy -= 16;
    } else {
      currentData.webinars.forEach((wb, index) => {
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

    // Webinar Comparison Summary
    wy -= 20;
    webinarPage.drawText('Webinar Performance Comparison', { x: 60, y: wy, size: 12, font: fontBold, color: rgb(0, 0, 0.6) });
    wy -= 20;

    const currentWebinarStats = {
      count: currentData.webinars.length,
      totalAttended: currentData.webinars.reduce((sum, wb) => sum + (wb.attended_participants || 0), 0),
      totalRegistered: currentData.webinars.reduce((sum, wb) => sum + (wb.registered_participants || 0), 0),
      avgRating: currentData.webinars.length > 0 ? currentData.webinars.reduce((sum, wb) => sum + (wb.event_rating || 0), 0) / currentData.webinars.length : 0
    };

    const previousWebinarStats = {
      count: previousData.webinars.length,
      totalAttended: previousData.webinars.reduce((sum, wb) => sum + (wb.attended_participants || 0), 0),
      totalRegistered: previousData.webinars.reduce((sum, wb) => sum + (wb.registered_participants || 0), 0),
      avgRating: previousData.webinars.length > 0 ? previousData.webinars.reduce((sum, wb) => sum + (wb.event_rating || 0), 0) / previousData.webinars.length : 0
    };

    const webinarComparison = [
      ['Number of Webinars', currentWebinarStats.count, previousWebinarStats.count],
      ['Total Attendees', currentWebinarStats.totalAttended, previousWebinarStats.totalAttended],
      ['Total Registered', currentWebinarStats.totalRegistered, previousWebinarStats.totalRegistered],
      ['Average Rating', currentWebinarStats.avgRating.toFixed(2), previousWebinarStats.avgRating.toFixed(2)]
    ];

    webinarPage.drawText('Current', { x: 200, y: wy, size: 10, font: fontBold });
    webinarPage.drawText('Previous', { x: 280, y: wy, size: 10, font: fontBold });
    webinarPage.drawText('Change', { x: 360, y: wy, size: 10, font: fontBold });
    wy -= 16;

    webinarComparison.forEach(([label, current, previous]) => {
      const currentNum = Number(current);
      const previousNum = Number(previous);
      const change = calculatePercentageChange(currentNum, previousNum);
      const changeColor = currentNum > previousNum ? [0, 0.6, 0] : currentNum < previousNum ? [0.8, 0, 0] : [0.5, 0.5, 0.5];
      
      webinarPage.drawText(String(label), { x: 60, y: wy, size: 10, font });
      webinarPage.drawText(String(current), { x: 200, y: wy, size: 10, font });
      webinarPage.drawText(String(previous), { x: 280, y: wy, size: 10, font });
      webinarPage.drawText(change, { 
        x: 360, 
        y: wy, 
        size: 10, 
        font,
        color: rgb(...changeColor as [number, number, number])
      });
      wy -= 16;
    });

    // Webinar Analytics Chart
// Webinar Attendance Comparison Chart (Current vs Previous)
if ((currentData.webinars?.length || 0) > 0 || (previousData.webinars?.length || 0) > 0) {
  const webinarChartData: { label: string; value: number; color: [number, number, number] }[] = [];
  
  // Add current month webinars
  currentData.webinars.forEach((wb, index) => {
    if (wb.webinar_title && wb.attended_participants != null) {
      const label = wb.webinar_title.length > 15 ? wb.webinar_title.substring(0, 15) + '...' : wb.webinar_title;
      webinarChartData.push({
        label: `${label} (${reportMonth})`,
        value: wb.attended_participants,
        color: [0.2, 0.6, 0.8]
      });
    }
  });

  // Add previous month webinars (only if they don't match current month titles)
  previousData.webinars.forEach((wb, index) => {
    if (wb.webinar_title && wb.attended_participants != null) {
      // Check if this webinar title already exists in current data
      const existsInCurrent = currentData.webinars.some(currentWb => 
        currentWb.webinar_title?.trim() === wb.webinar_title?.trim()
      );
      
      if (!existsInCurrent) {
        const label = wb.webinar_title.length > 15 ? wb.webinar_title.substring(0, 15) + '...' : wb.webinar_title;
        webinarChartData.push({
          label: `${label} (${previousReportMonth})`,
          value: wb.attended_participants,
          color: [0.8, 0.4, 0.2]
        });
      }
    }
  });

  // Sort by value descending and limit to top 8 for readability
  webinarChartData.sort((a, b) => b.value - a.value);
  const limitedWebinarData = webinarChartData.slice(0, 8);

  if (wy < 200) {
    webinarPage = pdfDoc.addPage([595.28, 841.89]);
    wy = 760;
  }

  drawBarChart(
    webinarPage,
    limitedWebinarData,
    50,
    wy - 180,
    495,
    160,
    font,
    fontBold,
    'Webinar Attendance by Event'
  );
}


    webinarPage.drawLine({ start: { x: 50, y: 50 }, end: { x: 545, y: 50 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    webinarPage.drawText('Confidential – For Internal Use Only', { x: 50, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    webinarPage.drawText('Page 3', { x: 520, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

    // Page 4 - Social Media Engagement with Comparisons
    const smPage = pdfDoc.addPage([595.28, 841.89]);
    let sy = 800;

    smPage.drawText(`Social Media Engagement Comparison`, {
      x: 50,
      y: sy,
      size: 13,
      font: fontBold,
      color: rgb(0, 0, 0.6)
    });
    sy -= 8;
    smPage.drawLine({ start: { x: 50, y: sy }, end: { x: 545, y: sy }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    sy -= 30;

    // Social Media Comparison Table
    if (currentData.socialMedia || previousData.socialMedia) {
      const currentSM = currentData.socialMedia;
      const previousSM = previousData.socialMedia;

      smPage.drawText('Social Media Metrics Comparison', { x: 50, y: sy, size: 12, font: fontBold });
      sy -= 25;

      smPage.drawText('Metric', { x: 60, y: sy, size: 10, font: fontBold });
      smPage.drawText('Current', { x: 200, y: sy, size: 10, font: fontBold });
      smPage.drawText('Previous', { x: 280, y: sy, size: 10, font: fontBold });
      smPage.drawText('Change', { x: 360, y: sy, size: 10, font: fontBold });
      sy -= 16;

      const smMetrics = [
        ['Post Reach', currentSM?.post_reach ?? 0, previousSM?.post_reach ?? 0],
        ['Post Engagement', currentSM?.post_engagement ?? 0, previousSM?.post_engagement ?? 0],
        ['New Page Likes', currentSM?.new_page_likes ?? 0, previousSM?.new_page_likes ?? 0],
        ['New Followers', currentSM?.new_page_followers ?? 0, previousSM?.new_page_followers ?? 0],
        ['Reactions', currentSM?.reactions ?? 0, previousSM?.reactions ?? 0],
        ['Comments', currentSM?.comments ?? 0, previousSM?.comments ?? 0],
        ['Shares', currentSM?.shares ?? 0, previousSM?.shares ?? 0],
        ['Photo Views', currentSM?.photo_views ?? 0, previousSM?.photo_views ?? 0],
        ['Link Clicks', currentSM?.link_clicks ?? 0, previousSM?.link_clicks ?? 0]
      ];

      smMetrics.forEach(([label, current, previous]) => {
        const currentNum = Number(current);
        const previousNum = Number(previous);
        const change = calculatePercentageChange(currentNum, previousNum);
        const changeColor = currentNum > previousNum ? [0, 0.6, 0] : currentNum < previousNum ? [0.8, 0, 0] : [0.5, 0.5, 0.5];
        
        smPage.drawText(String(label), { x: 60, y: sy, size: 10, font });
        smPage.drawText(currentNum.toLocaleString(), { x: 200, y: sy, size: 10, font });
        smPage.drawText(previousNum.toLocaleString(), { x: 280, y: sy, size: 10, font });
        smPage.drawText(change, { 
          x: 360, 
          y: sy, 
          size: 10, 
          font,
          color: rgb(...changeColor as [number, number, number])
        });
        sy -= 16;
      });

      // Social Media Chart for current month
      sy -= 20;
      if (currentSM) {
        const smChartData = [
          { label: 'Post Reach', value: currentSM.post_reach || 0, color: [0.2, 0.4, 0.8] as [number, number, number] },
          { label: 'Engagement', value: currentSM.post_engagement || 0, color: [0.8, 0.2, 0.4] as [number, number, number] },
          { label: 'New Likes', value: currentSM.new_page_likes || 0, color: [0.2, 0.8, 0.4] as [number, number, number] },
          { label: 'New Followers', value: currentSM.new_page_followers || 0, color: [0.8, 0.8, 0.2] as [number, number, number] },
          { label: 'Reactions', value: currentSM.reactions || 0, color: [0.8, 0.4, 0.2] as [number, number, number] },
          { label: 'Comments', value: currentSM.comments || 0, color: [0.4, 0.8, 0.8] as [number, number, number] }
        ].filter(item => item.value > 0);

        if (smChartData.length > 0) {
          drawBarChart(smPage, smChartData, 50, sy - 200, 495, 180, font, fontBold, `${reportMonth} Social Media Metrics`);
          sy -= 220;
        }

        // Engagement Rate Calculation and Comparison
        const currentTotalEngagement = (currentSM.reactions || 0) + (currentSM.comments || 0) + (currentSM.shares || 0);
        const currentEngagementRate = currentSM.post_reach ? ((currentTotalEngagement / currentSM.post_reach) * 100) : 0;
        
        const previousTotalEngagement = previousSM ? (previousSM.reactions || 0) + (previousSM.comments || 0) + (previousSM.shares || 0) : 0;
        const previousEngagementRate = previousSM && previousSM.post_reach ? ((previousTotalEngagement / previousSM.post_reach) * 100) : 0;

        smPage.drawText('Social Media Analytics Comparison:', { x: 60, y: sy, size: 12, font: fontBold, color: rgb(0, 0, 0.6) });
        sy -= 20;
        
        const engagementRateChange = calculatePercentageChange(currentEngagementRate, previousEngagementRate);
        const totalEngagementChange = calculatePercentageChange(currentTotalEngagement, previousTotalEngagement);
        
        smPage.drawText(`Current Engagement Rate: ${currentEngagementRate.toFixed(2)}%`, { x: 60, y: sy, size: 11, font });
        smPage.drawText(`Previous: ${previousEngagementRate.toFixed(2)}%`, { x: 250, y: sy, size: 11, font });
        smPage.drawText(`(${engagementRateChange})`, { x: 380, y: sy, size: 11, font });
        sy -= 16;
        
        smPage.drawText(`Total Interactions: ${currentTotalEngagement.toLocaleString()}`, { x: 60, y: sy, size: 11, font });
        smPage.drawText(`Previous: ${previousTotalEngagement.toLocaleString()}`, { x: 250, y: sy, size: 11, font });
        smPage.drawText(`(${totalEngagementChange})`, { x: 380, y: sy, size: 11, font });
      } else {
        smPage.drawText('No social media data recorded for current month.', { x: 60, y: sy, size: 11, font });
      }
    } else {
      smPage.drawText('No social media data available for comparison.', { x: 60, y: sy, size: 11, font });
    }

    smPage.drawLine({ start: { x: 50, y: 50 }, end: { x: 545, y: 50 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    smPage.drawText('Confidential – For Internal Use Only', { x: 50, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    smPage.drawText('Page 4', { x: 520, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

    // Page 5 - Detailed Lead Analysis with Comparisons
    const detailPage = pdfDoc.addPage([595.28, 841.89]);
    let dy = 800;

    detailPage.drawText('Detailed Lead Analysis & Recommendations', {
      x: 50,
      y: dy,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0.6)
    });
    dy -= 8;
    detailPage.drawLine({ start: { x: 50, y: dy }, end: { x: 545, y: dy }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    dy -= 30;

    // Monthly Performance Summary with Comparisons
    detailPage.drawText('Monthly Performance Summary', { x: 50, y: dy, size: 13, font: fontBold, color: rgb(0, 0, 0.6) });
    dy -= 25;

    const currentConversionRate = currentData.totalLeads > 0 ? (currentData.closedWonLeads / currentData.totalLeads) * 100 : 0;
    const previousConversionRate = previousData.totalLeads > 0 ? (previousData.closedWonLeads / previousData.totalLeads) * 100 : 0;
    const currentSuccessRate = (currentData.closedWonLeads + currentData.closedLostLeads) > 0 ? (currentData.closedWonLeads / (currentData.closedWonLeads + currentData.closedLostLeads)) * 100 : 0;
    const previousSuccessRate = (previousData.closedWonLeads + previousData.closedLostLeads) > 0 ? (previousData.closedWonLeads / (previousData.closedWonLeads + previousData.closedLostLeads)) * 100 : 0;

    const performanceMetrics = [
      ['Lead Conversion Rate', `${currentConversionRate.toFixed(1)}%`, `${previousConversionRate.toFixed(1)}%`],
      ['Average Response Time', 'Within 24 hours', 'Within 24 hours'],
      ['Pipeline Value', `PHP${currentData.potentialIncome.toLocaleString()}`, `PHP${previousData.potentialIncome.toLocaleString()}`],
      ['Active Opportunities', currentData.inProgressLeads.toString(), previousData.inProgressLeads.toString()],
      ['Success Rate', `${currentSuccessRate.toFixed(1)}%`, `${previousSuccessRate.toFixed(1)}%`]
    ];

    detailPage.drawText('Current', { x: 200, y: dy, size: 10, font: fontBold });
    detailPage.drawText('Previous', { x: 280, y: dy, size: 10, font: fontBold });
    detailPage.drawText('Change', { x: 360, y: dy, size: 10, font: fontBold });
    dy -= 16;

    performanceMetrics.forEach(([label, current, previous]) => {
      detailPage.drawText(String(label), { x: 60, y: dy, size: 11, font });
      detailPage.drawText(String(current), { x: 200, y: dy, size: 11, font });
      detailPage.drawText(String(previous), { x: 280, y: dy, size: 11, font });
      
      // Calculate change for numeric values
      if (label !== 'Average Response Time') {
        let currentNum = 0;
        let previousNum = 0;
        
        if (label === 'Pipeline Value') {
          currentNum = currentData.potentialIncome;
          previousNum = previousData.potentialIncome;
        } else if (label === 'Active Opportunities') {
          currentNum = currentData.inProgressLeads;
          previousNum = previousData.inProgressLeads;
        } else {
          currentNum = parseFloat(String(current).replace(/[%,]/g, ''));
          previousNum = parseFloat(String(previous).replace(/[%,]/g, ''));
        }
        
        const change = calculatePercentageChange(currentNum, previousNum);
        const changeColor = currentNum > previousNum ? [0, 0.6, 0] : currentNum < previousNum ? [0.8, 0, 0] : [0.5, 0.5, 0.5];
        
        detailPage.drawText(change, { 
          x: 360, 
          y: dy, 
          size: 11, 
          font,
          color: rgb(...changeColor as [number, number, number])
        });
      }
      
      dy -= 18;
    });

    // Enhanced Recommendations section based on comparisons
    dy -= 20;
    detailPage.drawText('Strategic Recommendations', { x: 50, y: dy, size: 13, font: fontBold, color: rgb(0, 0, 0.6) });
    dy -= 20;

    const recommendations = [];
    
    // Generate dynamic recommendations based on month-over-month data
    if (currentData.closedLostLeads > currentData.closedWonLeads) {
      recommendations.push('• Focus on improving lead qualification and follow-up processes');
    }
    
    if (currentData.totalLeads < previousData.totalLeads) {
      recommendations.push('• Lead generation declined - review and enhance marketing strategies');
    } else if (currentData.totalLeads > previousData.totalLeads) {
      recommendations.push('• Lead generation improved - scale successful acquisition channels');
    }
    
    if (currentConversionRate < previousConversionRate) {
      recommendations.push('• Conversion rate decreased - analyze sales process bottlenecks');
    }
    
    const topService = Object.entries(serviceBreakdown).sort(([,a], [,b]) => b - a)[0];
    if (topService) {
      recommendations.push(`• Consider expanding ${topService[0]} offerings based on high demand`);
    }

    const topPerformer = Object.entries(capturedByBreakdown).sort(([,a], [,b]) => b - a)[0];
    if (topPerformer) {
      recommendations.push(`• Leverage ${topPerformer[0]}'s success strategies across the team`);
    }

    if (currentData.inProgressLeads > currentData.closedWonLeads * 2) {
      recommendations.push('• Review pipeline velocity - high number of stalled opportunities');
    }

    if (currentData.potentialIncome < previousData.potentialIncome) {
      recommendations.push('• Pipeline value decreased - focus on higher-value opportunities');
    }

    // Social media recommendations
    if (currentData.socialMedia && previousData.socialMedia) {
      const currentEngagement = (currentData.socialMedia.reactions || 0) + (currentData.socialMedia.comments || 0) + (currentData.socialMedia.shares || 0);
      const previousEngagement = (previousData.socialMedia.reactions || 0) + (previousData.socialMedia.comments || 0) + (previousData.socialMedia.shares || 0);
      
      if (currentEngagement < previousEngagement) {
        recommendations.push('• Social media engagement declined - review content strategy');
      }
    }

    // Webinar recommendations
    if (currentData.webinars.length < previousData.webinars.length) {
      recommendations.push('• Webinar frequency decreased - consider increasing educational content');
    }

    recommendations.forEach(rec => {
      detailPage.drawText(rec, { x: 60, y: dy, size: 10, font });
      dy -= 16;
    });

    // Key Insights Section
    dy -= 20;
    detailPage.drawText('Key Insights', { x: 50, y: dy, size: 13, font: fontBold, color: rgb(0, 0, 0.6) });
    dy -= 20;

    const insights = [];
    
    const leadGrowth = calculatePercentageChange(currentData.totalLeads, previousData.totalLeads);
    const revenueGrowth = calculatePercentageChange(currentData.potentialIncome, previousData.potentialIncome);
    
    insights.push(`• Lead generation ${currentData.totalLeads > previousData.totalLeads ? 'increased' : currentData.totalLeads < previousData.totalLeads ? 'decreased' : 'remained stable'} by ${leadGrowth} month-over-month`);
    insights.push(`• Pipeline value ${currentData.potentialIncome > previousData.potentialIncome ? 'grew' : currentData.potentialIncome < previousData.potentialIncome ? 'declined' : 'remained stable'} by ${revenueGrowth}`);
    
    if (currentConversionRate > previousConversionRate) {
      insights.push(`• Conversion efficiency improved by ${calculatePercentageChange(currentConversionRate, previousConversionRate)}`);
    } else if (currentConversionRate < previousConversionRate) {
      insights.push(`• Conversion efficiency declined by ${calculatePercentageChange(currentConversionRate, previousConversionRate)}`);
    }

    const topLeadSource = Object.entries(leadSourceBreakdown).sort(([,a], [,b]) => b - a)[0];
    if (topLeadSource) {
      insights.push(`• ${topLeadSource[0]} remains the primary lead source (${topLeadSource[1]} leads)`);
    }

    insights.forEach(insight => {
      detailPage.drawText(insight, { x: 60, y: dy, size: 10, font });
      dy -= 16;
    });

    detailPage.drawLine({ start: { x: 50, y: 50 }, end: { x: 545, y: 50 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    detailPage.drawText('Confidential – For Internal Use Only', { x: 50, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    detailPage.drawText('Page 5', { x: 520, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

    // Generate and send PDF
    const pdfBytes = await pdfDoc.save();

    // Enhanced Email with comparison insights
    const leadGrowthText = currentData.totalLeads > previousData.totalLeads ? 'increased' : currentData.totalLeads < previousData.totalLeads ? 'decreased' : 'remained stable';
    const revenueGrowthText = currentData.potentialIncome > previousData.potentialIncome ? 'increased' : currentData.potentialIncome < previousData.potentialIncome ? 'decreased' : 'remained stable';
    
    await sendEmail({
      to: [
        'jlb@petrosphere.com.ph',
        'josephbaria89@gmail.com',
        'rlm@petrosphere.com.ph',
        'dra@petrosphere.com.ph',
        'kbg@petrosphere.com.ph',
        'sales@petrosphere.com.ph',
        'ceo@petrosphere.com.ph',
        'admin@petrosphere.com.ph',
        'ops@petrosphere.com.ph'
      ],
      subject: `Monthly Sales & Marketing Report with Comparisons - ${format(today, 'MMM yyyy')}`,
      text: `Attached is your comprehensive monthly report with visual analytics, performance insights, and month-over-month comparisons for ${reportMonth} ${reportYear}.

CURRENT MONTH HIGHLIGHTS:
• Total Leads: ${currentData.totalLeads}
• Closed Won: ${currentData.closedWonLeads}
• Pipeline Value: PHP${currentData.potentialIncome.toLocaleString()}
• Conversion Rate: ${currentData.totalLeads > 0 ? ((currentData.closedWonLeads / currentData.totalLeads) * 100).toFixed(1) : 0}%

MONTH-OVER-MONTH COMPARISON:
• Lead Generation: ${leadGrowthText} by ${calculatePercentageChange(currentData.totalLeads, previousData.totalLeads)}
• Pipeline Value: ${revenueGrowthText} by ${calculatePercentageChange(currentData.potentialIncome, previousData.potentialIncome)}
• Conversion Rate: ${calculatePercentageChange(currentData.totalLeads > 0 ? ((currentData.closedWonLeads / currentData.totalLeads) * 100) : 0, previousData.totalLeads > 0 ? ((previousData.closedWonLeads / previousData.totalLeads) * 100) : 0)} change

This enhanced report includes:
• Visual charts and performance trends
• Month-over-month comparisons across all metrics
• Social media and webinar performance analysis
• Actionable insights and strategic recommendations
• Historical trend analysis for informed decision-making

Key insights and recommendations are provided to help drive continued business growth.`,
attachments: [
  {
    filename: 'report.pdf',
    content: Buffer.from(pdfBytes).toString('base64'),
    encoding: 'base64',
    type: 'application/pdf',
    disposition: 'attachment'
  }
]



    });

    return NextResponse.json({ 
      message: 'Enhanced Monthly PDF Report with month-over-month comparisons sent successfully',
      summary: {
        currentMonth: {
          totalLeads: currentData.totalLeads,
          closedWon: currentData.closedWonLeads,
          potentialRevenue: currentData.potentialIncome,
          conversionRate: `${currentData.totalLeads > 0 ? ((currentData.closedWonLeads / currentData.totalLeads) * 100).toFixed(1) : 0}%`
        },
        previousMonth: {
          totalLeads: previousData.totalLeads,
          closedWon: previousData.closedWonLeads,
          potentialRevenue: previousData.potentialIncome,
          conversionRate: `${previousData.totalLeads > 0 ? ((previousData.closedWonLeads / previousData.totalLeads) * 100).toFixed(1) : 0}%`
        },
        monthOverMonthChanges: {
          totalLeads: calculatePercentageChange(currentData.totalLeads, previousData.totalLeads),
          closedWon: calculatePercentageChange(currentData.closedWonLeads, previousData.closedWonLeads),
          potentialRevenue: calculatePercentageChange(currentData.potentialIncome, previousData.potentialIncome),
          conversionRate: calculatePercentageChange(
            currentData.totalLeads > 0 ? ((currentData.closedWonLeads / currentData.totalLeads) * 100) : 0,
            previousData.totalLeads > 0 ? ((previousData.closedWonLeads / previousData.totalLeads) * 100) : 0
          )
        }
      }
    });
  } catch (err: any) {
    console.error('PDF Report Generation Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}