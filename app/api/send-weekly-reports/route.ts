//app\api\send-weekly-reports\route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  format,
  parse,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  eachMonthOfInterval,
} from 'date-fns';
import { sanitizePdfText } from '@/lib/sanitizePdfText';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, RGB } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────
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

interface PeriodData {
  leads: Lead[];
  webinars: Webinar[];
  socialMedia: SocialMedia | null;
  totalLeads: number;
  closedWonLeads: number;
  closedLostLeads: number;
  inProgressLeads: number;
  potentialIncome: number;
}

type PeriodType = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface ResolvedPeriod {
  type: PeriodType;
  typeLabel: string;
  title: string;
  prevTitle: string;
  cover: string;
  start: Date;
  end: Date; // exclusive
  prevStart: Date;
  prevEnd: Date; // exclusive
  months: { month: string; year: string }[];
  prevMonths: { month: string; year: string }[];
  years: string[];
  prevYears: string[];
  fileToken: string;
  trendMonths: number;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY! as string
);

// ─── Numeric helpers ─────────────────────────────────────────
const calculatePercentageChange = (current: number, previous: number): string => {
  if (
    typeof current !== 'number' ||
    typeof previous !== 'number' ||
    isNaN(current) ||
    isNaN(previous)
  ) {
    return '0%';
  }
  if (previous === 0) {
    return current > 0 ? 'New' : '0%';
  }
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};

const trendArrow = (current: number, previous: number): string => {
  if (current > previous) return 'Up';
  if (current < previous) return 'Down';
  return 'Flat';
};

// ─── Period resolution ───────────────────────────────────────
const monthsBetween = (start: Date, end: Date): { month: string; year: string }[] => {
  const lastDay = addDays(end, -1);
  return eachMonthOfInterval({ start: startOfMonth(start), end: startOfMonth(lastDay) }).map(
    (d) => ({ month: format(d, 'MMMM'), year: format(d, 'yyyy') })
  );
};

const uniqueYears = (months: { month: string; year: string }[]): string[] =>
  Array.from(new Set(months.map((m) => m.year)));

function resolvePeriod(type: PeriodType, value: string): ResolvedPeriod {
  let start: Date;
  let end: Date;
  let prevStart: Date;
  let prevEnd: Date;
  let title: string;
  let prevTitle: string;
  let typeLabel: string;
  let trendMonths = 6;

  switch (type) {
    case 'weekly': {
      const base = value ? new Date(`${value}T00:00:00`) : new Date();
      start = startOfWeek(base, { weekStartsOn: 1 });
      end = addWeeks(start, 1);
      prevStart = subWeeks(start, 1);
      prevEnd = start;
      title = `Week of ${format(start, 'MMM d')} - ${format(addDays(end, -1), 'MMM d, yyyy')}`;
      prevTitle = `Week of ${format(prevStart, 'MMM d')} - ${format(addDays(prevEnd, -1), 'MMM d, yyyy')}`;
      typeLabel = 'Weekly';
      trendMonths = 6;
      break;
    }
    case 'quarterly': {
      const [ys, qs] = value.split('-Q');
      const yr = parseInt(ys, 10);
      const q = Math.min(4, Math.max(1, parseInt(qs, 10) || 1));
      start = new Date(yr, (q - 1) * 3, 1);
      end = new Date(yr, (q - 1) * 3 + 3, 1);
      prevStart = new Date(yr, (q - 1) * 3 - 3, 1);
      prevEnd = start;
      const pq = q === 1 ? 4 : q - 1;
      const py = q === 1 ? yr - 1 : yr;
      title = `Q${q} ${yr}`;
      prevTitle = `Q${pq} ${py}`;
      typeLabel = 'Quarterly';
      trendMonths = 6;
      break;
    }
    case 'yearly': {
      const yr = parseInt(value, 10) || new Date().getFullYear();
      start = new Date(yr, 0, 1);
      end = new Date(yr + 1, 0, 1);
      prevStart = new Date(yr - 1, 0, 1);
      prevEnd = start;
      title = `Year ${yr}`;
      prevTitle = `Year ${yr - 1}`;
      typeLabel = 'Annual';
      trendMonths = 12;
      break;
    }
    case 'monthly':
    default: {
      const base = value ? parse(value, 'yyyy-MM', new Date()) : new Date();
      start = startOfMonth(base);
      end = addMonths(start, 1);
      prevStart = subMonths(start, 1);
      prevEnd = start;
      title = format(start, 'MMMM yyyy');
      prevTitle = format(prevStart, 'MMMM yyyy');
      typeLabel = 'Monthly';
      trendMonths = 6;
      break;
    }
  }

  const months = monthsBetween(start, end);
  const prevMonths = monthsBetween(prevStart, prevEnd);
  const cover = `${format(start, 'MMM dd, yyyy')} - ${format(addDays(end, -1), 'MMM dd, yyyy')}`;
  const fileToken = (value || format(start, 'yyyy_MM_dd')).replace(/[^a-zA-Z0-9]/g, '_');

  return {
    type,
    typeLabel,
    title,
    prevTitle,
    cover,
    start,
    end,
    prevStart,
    prevEnd,
    months,
    prevMonths,
    years: uniqueYears(months),
    prevYears: uniqueYears(prevMonths),
    fileToken,
    trendMonths,
  };
}

// ─── Data fetching ───────────────────────────────────────────
const fetchLeadsInRange = async (start: Date, end: Date): Promise<Lead[]> => {
  const pageSize = 1000;
  let from = 0;
  let all: Lead[] = [];
  let done = false;

  while (!done) {
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*')
      .gte('first_contact', start.toISOString())
      .lt('first_contact', end.toISOString())
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    all = all.concat(data as Lead[]);
    if (data.length < pageSize) done = true;
    else from += pageSize;
  }
  return all;
};

const fetchWebinarsForMonths = async (
  monthKeys: Set<string>,
  years: string[]
): Promise<Webinar[]> => {
  if (years.length === 0) return [];
  const { data, error } = await supabase
    .from('webinar_tracker')
    .select('*')
    .in('year', years);
  if (error) throw error;
  return ((data as Webinar[]) || []).filter((w) => monthKeys.has(`${w.month}|${w.year}`));
};

const fetchSocialForMonths = async (
  monthKeys: Set<string>,
  years: string[]
): Promise<SocialMedia | null> => {
  if (years.length === 0) return null;
  const { data, error } = await supabase
    .from('social_media_tracker')
    .select('*')
    .in('year', years);
  if (error) throw error;

  const rows = ((data as SocialMedia[]) || []).filter((s) =>
    monthKeys.has(`${s.month}|${s.year}`)
  );
  if (rows.length === 0) return null;

  const sum = (key: keyof SocialMedia) =>
    rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);

  return {
    id: rows[0].id,
    month: rows[0].month,
    year: rows[0].year,
    post_reach: sum('post_reach'),
    post_engagement: sum('post_engagement'),
    new_page_likes: sum('new_page_likes'),
    new_page_followers: sum('new_page_followers'),
    reactions: sum('reactions'),
    comments: sum('comments'),
    shares: sum('shares'),
    photo_views: sum('photo_views'),
    link_clicks: sum('link_clicks'),
    created_at: rows[0].created_at,
  };
};

const buildPeriodData = async (
  start: Date,
  end: Date,
  months: { month: string; year: string }[],
  years: string[]
): Promise<PeriodData> => {
  const leads = await fetchLeadsInRange(start, end);
  const monthKeys = new Set(months.map((m) => `${m.month}|${m.year}`));
  const webinars = await fetchWebinarsForMonths(monthKeys, years);
  const socialMedia = await fetchSocialForMonths(monthKeys, years);

  const totalLeads = leads.length;
  const closedWonLeads = leads.filter((l) => l.status?.toLowerCase() === 'closed win').length;
  const closedLostLeads = leads.filter((l) => l.status?.toLowerCase() === 'closed lost').length;
  const inProgressLeads = leads.filter(
    (l) =>
      l.status?.toLowerCase().includes('in progress') ||
      l.status?.toLowerCase().includes('lead in')
  ).length;
  const potentialIncome = leads.reduce((sum, l) => sum + (l.service_price || 0), 0);

  return {
    leads,
    webinars,
    socialMedia,
    totalLeads,
    closedWonLeads,
    closedLostLeads,
    inProgressLeads,
    potentialIncome,
  };
};

const fetchTrend = async (
  endRef: Date,
  monthsBack: number
): Promise<{ won: { label: string; value: number }[]; revenue: { label: string; value: number }[] }> => {
  const from = startOfMonth(subMonths(endRef, monthsBack - 1));
  const to = endOfMonth(endRef);

  const { data, error } = await supabase
    .from('crm_leads')
    .select('first_contact, status, service_price')
    .gte('first_contact', from.toISOString())
    .lte('first_contact', to.toISOString());
  if (error) throw error;

  // Pre-seed all buckets so the trend line is continuous.
  const buckets: Record<string, { won: number; revenue: number }> = {};
  for (let i = 0; i < monthsBack; i++) {
    const label = format(subMonths(to, monthsBack - 1 - i), 'MMM yyyy');
    buckets[label] = { won: 0, revenue: 0 };
  }

  (data || []).forEach((lead: any) => {
    if (!lead.first_contact) return;
    const label = format(new Date(lead.first_contact), 'MMM yyyy');
    if (!buckets[label]) buckets[label] = { won: 0, revenue: 0 };
    if (lead.status?.toLowerCase() === 'closed win') {
      buckets[label].won += 1;
      buckets[label].revenue += lead.service_price || 0;
    }
  });

  const ordered = Object.keys(buckets).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return {
    won: ordered.map((label) => ({ label, value: buckets[label].won })),
    revenue: ordered.map((label) => ({ label, value: buckets[label].revenue })),
  };
};

// ─── PDF layout constants & palette ──────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_L = MARGIN;
const CONTENT_R = PAGE_W - MARGIN;
const CONTENT_W = CONTENT_R - CONTENT_L;
const HEADER_H = 66;
const FOOTER_Y = 40;
const CONTENT_BOTTOM = 62;
const CONTENT_TOP = PAGE_H - HEADER_H - 22;

const col = (r: number, g: number, b: number): RGB => rgb(r / 255, g / 255, b / 255);
const NAVY = col(0, 4, 74);
const NAVY_SOFT = col(233, 236, 247);
const GOLD = col(255, 184, 0);
const INK = col(33, 37, 41);
const MUTED = col(107, 114, 128);
const LINE = col(216, 220, 226);
const GREEN = col(21, 128, 61);
const RED = col(190, 40, 40);
const GRAYBG = col(246, 247, 249);
const WHITE = rgb(1, 1, 1);

const PALETTE: RGB[] = [
  col(37, 99, 235),
  col(234, 88, 12),
  col(22, 163, 74),
  col(147, 51, 234),
  col(202, 138, 4),
  col(219, 39, 119),
  col(13, 148, 136),
  col(220, 38, 38),
];

function changeColor(cur: number, prev: number): RGB {
  if (cur > prev) return GREEN;
  if (cur < prev) return RED;
  return MUTED;
}

// ─── GET handler ─────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Backwards compatible: `month` (yyyy-MM) → monthly report.
    const legacyMonth = searchParams.get('month');
    const type = (searchParams.get('type') as PeriodType | null) || (legacyMonth ? 'monthly' : 'monthly');
    const value = searchParams.get('value') || legacyMonth || format(new Date(), 'yyyy-MM');

    const validTypes: PeriodType[] = ['weekly', 'monthly', 'quarterly', 'yearly'];
    const period = resolvePeriod(validTypes.includes(type) ? type : 'monthly', value);

    // ── Fetch data ──
    const currentData = await buildPeriodData(
      period.start,
      period.end,
      period.months,
      period.years
    );
    const previousData = await buildPeriodData(
      period.prevStart,
      period.prevEnd,
      period.prevMonths,
      period.prevYears
    );
    const trend = await fetchTrend(addDays(period.end, -1), period.trendMonths);

    // ── Breakdowns ──
    const tally = (getKey: (l: Lead) => string) =>
      currentData.leads.reduce<Record<string, number>>((acc, l) => {
        const k = getKey(l) || 'Unknown';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});

    const statusBreakdown = tally((l) => l.status || 'Unknown');
    const capturedByBreakdown = tally((l) => l.captured_by || 'Unknown');
    const serviceBreakdown = tally((l) => l.service_product || 'Unknown');
    const leadSourceBreakdown = tally((l) => l.lead_source || 'Unknown');

    const shortenLeadSource = (label: string): string =>
      label.startsWith('Inbound - ')
        ? 'In: ' + label.replace('Inbound - ', '')
        : label.startsWith('Outbound - ')
        ? 'Out: ' + label.replace('Outbound - ', '')
        : label;

    // ── PDF setup ──
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let logoImage: any = null;
    let logoDims = { width: 0, height: 0 };
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        const bytes = fs.readFileSync(logoPath);
        logoImage = await pdfDoc.embedPng(bytes);
        const targetH = 26;
        const scale = targetH / logoImage.height;
        logoDims = { width: logoImage.width * scale, height: targetH };
      }
    } catch (e) {
      console.warn('Logo could not be loaded:', e);
    }

    // ── Layout engine (mutable cursor) ──
    let page: PDFPage = null as unknown as PDFPage;
    let y = 0;
    const pages: PDFPage[] = [];
    const generatedOn = format(new Date(), 'MMM dd, yyyy');

    const clean = (s: string | number | null | undefined) => sanitizePdfText(s);

    const fit = (s: string, f: PDFFont, size: number, maxW: number): string => {
      let str = clean(s);
      if (f.widthOfTextAtSize(str, size) <= maxW) return str;
      while (str.length > 1 && f.widthOfTextAtSize(str + '...', size) > maxW) {
        str = str.slice(0, -1);
      }
      return str + '...';
    };

    const wrap = (s: string, f: PDFFont, size: number, maxW: number): string[] => {
      const words = clean(s).split(' ').filter(Boolean);
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (f.widthOfTextAtSize(test, size) > maxW && line) {
          lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines.length ? lines : [''];
    };

    const T = (
      str: string | number,
      x: number,
      yy: number,
      opt: { size?: number; bold?: boolean; color?: RGB } = {}
    ) => {
      page.drawText(clean(str), {
        x,
        y: yy,
        size: opt.size ?? 10,
        font: opt.bold ? fontBold : font,
        color: opt.color ?? INK,
      });
    };

    const drawHeaderBand = (p: PDFPage) => {
      p.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: NAVY });
      p.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 3, width: PAGE_W, height: 3, color: GOLD });

      p.drawText('Sales & Marketing Report', {
        x: CONTENT_L,
        y: PAGE_H - 32,
        size: 16,
        font: fontBold,
        color: WHITE,
      });
      p.drawText(clean(`${period.typeLabel} Report  |  ${period.title}`), {
        x: CONTENT_L,
        y: PAGE_H - 50,
        size: 9.5,
        font,
        color: col(196, 205, 234),
      });

      if (logoImage) {
        const chipW = logoDims.width + 20;
        const chipH = logoDims.height + 12;
        const chipX = CONTENT_R - chipW;
        const chipY = PAGE_H - HEADER_H + (HEADER_H - chipH) / 2;
        p.drawRectangle({ x: chipX, y: chipY, width: chipW, height: chipH, color: WHITE });
        p.drawImage(logoImage, {
          x: chipX + 10,
          y: chipY + 6,
          width: logoDims.width,
          height: logoDims.height,
        });
      }
    };

    const drawFooter = (p: PDFPage, n: number) => {
      p.drawLine({
        start: { x: CONTENT_L, y: FOOTER_Y + 14 },
        end: { x: CONTENT_R, y: FOOTER_Y + 14 },
        thickness: 0.75,
        color: LINE,
      });
      p.drawText('Petrosphere Inc.  -  Confidential: For Internal Use Only', {
        x: CONTENT_L,
        y: FOOTER_Y,
        size: 8,
        font,
        color: MUTED,
      });
      const pn = `Page ${n}`;
      p.drawText(pn, {
        x: CONTENT_R - font.widthOfTextAtSize(pn, 8),
        y: FOOTER_Y,
        size: 8,
        font,
        color: MUTED,
      });
    };

    const drawInfoStrip = () => {
      const stripH = 30;
      const top = CONTENT_TOP + 6;
      page.drawRectangle({
        x: CONTENT_L,
        y: top - stripH,
        width: CONTENT_W,
        height: stripH,
        color: NAVY_SOFT,
      });
      const parts = [
        `Reporting Period: ${period.cover}`,
        `Compared To: ${period.prevTitle}`,
        `Generated: ${generatedOn}`,
      ];
      T(parts.join('     |     '), CONTENT_L + 10, top - stripH + 11, {
        size: 8.5,
        color: NAVY,
        bold: true,
      });
      y = top - stripH - 18;
    };

    const newPage = (withInfoStrip = false) => {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      drawHeaderBand(page);
      drawFooter(page, pages.length);
      y = CONTENT_TOP;
      if (withInfoStrip) drawInfoStrip();
    };

    const ensure = (needed: number) => {
      if (y - needed < CONTENT_BOTTOM) newPage();
    };

    const sectionTitle = (text: string) => {
      ensure(46);
      y -= 4;
      page.drawRectangle({ x: CONTENT_L, y: y - 12, width: 4, height: 15, color: GOLD });
      T(text, CONTENT_L + 12, y - 10, { size: 13, bold: true, color: NAVY });
      y -= 20;
      page.drawLine({
        start: { x: CONTENT_L, y },
        end: { x: CONTENT_R, y },
        thickness: 0.75,
        color: LINE,
      });
      y -= 16;
    };

    const metricCards = (
      cards: { label: string; value: string; cur: number; prev: number }[]
    ) => {
      const gap = 12;
      const per = cards.length || 1;
      const cw = (CONTENT_W - gap * (per - 1)) / per;
      const ch = 62;
      ensure(ch + 10);
      const top = y;
      cards.forEach((c, i) => {
        const x = CONTENT_L + i * (cw + gap);
        page.drawRectangle({
          x,
          y: top - ch,
          width: cw,
          height: ch,
          color: GRAYBG,
          borderColor: LINE,
          borderWidth: 1,
        });
        page.drawRectangle({ x, y: top - ch, width: 3, height: ch, color: NAVY });
        T(c.label, x + 10, top - 16, { size: 8.5, color: MUTED });
        T(fit(c.value, fontBold, 16, cw - 18), x + 10, top - 37, {
          size: 16,
          bold: true,
          color: NAVY,
        });
        const chg = calculatePercentageChange(c.cur, c.prev);
        T(`${trendArrow(c.cur, c.prev)} ${chg}  vs prev`, x + 10, top - 52, {
          size: 7.5,
          color: changeColor(c.cur, c.prev),
        });
      });
      y = top - ch - 18;
    };

    const comparisonTable = (
      rows: { label: string; cur: string; prev: string; change: string; color: RGB }[]
    ) => {
      const rh = 20;
      const wLabel = CONTENT_W * 0.4;
      const wCol = (CONTENT_W - wLabel) / 3;
      const headers = ['Metric', 'Current', 'Previous', 'Change'];
      const colX = [
        CONTENT_L,
        CONTENT_L + wLabel,
        CONTENT_L + wLabel + wCol,
        CONTENT_L + wLabel + 2 * wCol,
      ];

      const drawHead = () => {
        ensure(rh);
        page.drawRectangle({ x: CONTENT_L, y: y - rh, width: CONTENT_W, height: rh, color: NAVY });
        headers.forEach((h, i) => {
          T(h, colX[i] + 8, y - rh + 6, { size: 9, bold: true, color: WHITE });
        });
        y -= rh;
      };

      drawHead();
      rows.forEach((r, ri) => {
        if (y - rh < CONTENT_BOTTOM) {
          newPage();
          drawHead();
        }
        if (ri % 2 === 1) {
          page.drawRectangle({ x: CONTENT_L, y: y - rh, width: CONTENT_W, height: rh, color: GRAYBG });
        }
        T(fit(r.label, font, 9, wLabel - 12), colX[0] + 8, y - rh + 6, { size: 9 });
        T(fit(r.cur, font, 9, wCol - 12), colX[1] + 8, y - rh + 6, { size: 9 });
        T(fit(r.prev, font, 9, wCol - 12), colX[2] + 8, y - rh + 6, { size: 9, color: MUTED });
        T(fit(r.change, fontBold, 9, wCol - 12), colX[3] + 8, y - rh + 6, {
          size: 9,
          bold: true,
          color: r.color,
        });
        y -= rh;
      });
      y -= 16;
    };

    const barChart = (
      title: string,
      data: { label: string; value: number; color?: RGB }[],
      height = 155
    ) => {
      ensure(height + 60);
      T(title, CONTENT_L, y - 4, { size: 11, bold: true, color: NAVY });
      y -= 18;
      const boxTop = y;
      const boxBottom = y - height;
      const plotLeft = CONTENT_L + 42;
      const plotRight = CONTENT_R - 8;
      const plotTop = boxTop - 10;
      const plotBottom = boxBottom + 34;
      const plotH = plotTop - plotBottom;
      const plotW = plotRight - plotLeft;

      if (data.length === 0) {
        T('No data available for this period.', plotLeft, plotBottom + plotH / 2, {
          size: 9,
          color: MUTED,
        });
        y = boxBottom - 16;
        return;
      }

      const maxV = Math.max(1, ...data.map((d) => d.value));
      for (let i = 0; i <= 4; i++) {
        const gy = plotBottom + (plotH * i) / 4;
        page.drawLine({
          start: { x: plotLeft, y: gy },
          end: { x: plotRight, y: gy },
          thickness: 0.5,
          color: i === 0 ? LINE : col(238, 240, 243),
        });
        const lbl = Math.round((maxV * i) / 4).toString();
        T(lbl, plotLeft - 6 - font.widthOfTextAtSize(lbl, 7), gy - 3, { size: 7, color: MUTED });
      }
      page.drawLine({
        start: { x: plotLeft, y: plotBottom },
        end: { x: plotLeft, y: plotTop },
        thickness: 0.5,
        color: LINE,
      });

      const slot = plotW / data.length;
      const bw = Math.min(48, slot * 0.62);
      data.forEach((d, i) => {
        const cx = plotLeft + slot * i + slot / 2;
        const bh = maxV > 0 ? (d.value / maxV) * plotH : 0;
        page.drawRectangle({
          x: cx - bw / 2,
          y: plotBottom,
          width: bw,
          height: bh,
          color: d.color ?? PALETTE[i % PALETTE.length],
        });
        if (d.value > 0) {
          const v = d.value.toLocaleString();
          T(v, cx - font.widthOfTextAtSize(v, 7) / 2, plotBottom + bh + 3, {
            size: 7,
            color: MUTED,
          });
        }
        const lines = wrap(d.label, font, 7, slot - 2).slice(0, 2);
        lines.forEach((ln, li) => {
          const w = font.widthOfTextAtSize(ln, 7);
          T(ln, cx - w / 2, plotBottom - 11 - li * 8, { size: 7, color: MUTED });
        });
      });
      y = boxBottom - 16;
    };

    const lineChart = (
      title: string,
      data: { label: string; value: number }[],
      color: RGB,
      height = 150,
      valuePrefix = ''
    ) => {
      ensure(height + 60);
      T(title, CONTENT_L, y - 4, { size: 11, bold: true, color: NAVY });
      y -= 18;
      const boxTop = y;
      const boxBottom = y - height;
      const plotLeft = CONTENT_L + 48;
      const plotRight = CONTENT_R - 10;
      const plotTop = boxTop - 10;
      const plotBottom = boxBottom + 26;
      const plotH = plotTop - plotBottom;
      const plotW = plotRight - plotLeft;

      if (data.length === 0) {
        T('No data available for this period.', plotLeft, plotBottom + plotH / 2, {
          size: 9,
          color: MUTED,
        });
        y = boxBottom - 16;
        return;
      }

      const maxV = Math.max(1, ...data.map((d) => d.value));
      for (let i = 0; i <= 4; i++) {
        const gy = plotBottom + (plotH * i) / 4;
        page.drawLine({
          start: { x: plotLeft, y: gy },
          end: { x: plotRight, y: gy },
          thickness: 0.5,
          color: i === 0 ? LINE : col(238, 240, 243),
        });
        const raw = Math.round((maxV * i) / 4);
        const lbl = valuePrefix + raw.toLocaleString();
        T(lbl, plotLeft - 6 - font.widthOfTextAtSize(lbl, 7), gy - 3, { size: 7, color: MUTED });
      }

      const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
      const pointX = (i: number) => plotLeft + (data.length > 1 ? i * stepX : plotW / 2);
      const pointY = (v: number) => plotBottom + (maxV > 0 ? (v / maxV) * plotH : 0);

      for (let i = 0; i < data.length - 1; i++) {
        page.drawLine({
          start: { x: pointX(i), y: pointY(data[i].value) },
          end: { x: pointX(i + 1), y: pointY(data[i + 1].value) },
          thickness: 2,
          color,
        });
      }
      data.forEach((d, i) => {
        page.drawCircle({ x: pointX(i), y: pointY(d.value), size: 2.6, color });
      });

      const labelEvery = Math.ceil(data.length / 8);
      data.forEach((d, i) => {
        if (i % labelEvery !== 0 && i !== data.length - 1) return;
        const lbl = fit(d.label, font, 7, stepX > 0 ? stepX * labelEvery : plotW);
        const w = font.widthOfTextAtSize(lbl, 7);
        let lx = pointX(i) - w / 2;
        lx = Math.max(plotLeft, Math.min(lx, plotRight - w));
        T(lbl, lx, plotBottom - 12, { size: 7, color: MUTED });
      });
      y = boxBottom - 16;
    };

    const distributionList = (
      title: string,
      items: { name: string; value: number; pct: number }[]
    ) => {
      T(title, CONTENT_L, y - 4, { size: 11, bold: true, color: NAVY });
      y -= 20;
      if (items.length === 0) {
        T('No data available for this period.', CONTENT_L, y, { size: 9, color: MUTED });
        y -= 18;
        return;
      }
      const rh = 20;
      const nameW = 150;
      const valW = 78;
      const trackX = CONTENT_L + nameW + 8;
      const trackW = CONTENT_R - valW - trackX - 8;
      items.forEach((it, i) => {
        ensure(rh);
        T(fit(it.name, font, 9, nameW), CONTENT_L, y - 12, { size: 9 });
        page.drawRectangle({
          x: trackX,
          y: y - 13,
          width: trackW,
          height: 9,
          color: col(235, 238, 242),
        });
        page.drawRectangle({
          x: trackX,
          y: y - 13,
          width: Math.max(1, (trackW * Math.min(100, it.pct)) / 100),
          height: 9,
          color: PALETTE[i % PALETTE.length],
        });
        const valStr = `${it.value} (${it.pct.toFixed(1)}%)`;
        T(valStr, CONTENT_R - font.widthOfTextAtSize(valStr, 9), y - 12, {
          size: 9,
          color: MUTED,
        });
        y -= rh;
      });
      y -= 6;
    };

    const bullets = (items: string[]) => {
      if (items.length === 0) {
        T('No specific items to highlight for this period.', CONTENT_L + 4, y, {
          size: 10,
          color: MUTED,
        });
        y -= 18;
        return;
      }
      items.forEach((item) => {
        const lines = wrap(item, font, 10, CONTENT_W - 18);
        ensure(lines.length * 14 + 4);
        page.drawCircle({ x: CONTENT_L + 4, y: y - 4, size: 1.6, color: GOLD });
        lines.forEach((ln, li) => {
          T(ln, CONTENT_L + 14, y - li * 13, { size: 10 });
        });
        y -= lines.length * 13 + 6;
      });
    };

    // ── Build report ──
    newPage(true);

    // Derived metrics
    const curConv = currentData.totalLeads > 0 ? (currentData.closedWonLeads / currentData.totalLeads) * 100 : 0;
    const prevConv = previousData.totalLeads > 0 ? (previousData.closedWonLeads / previousData.totalLeads) * 100 : 0;
    const curDecided = currentData.closedWonLeads + currentData.closedLostLeads;
    const prevDecided = previousData.closedWonLeads + previousData.closedLostLeads;
    const curWin = curDecided > 0 ? (currentData.closedWonLeads / curDecided) * 100 : 0;
    const prevWin = prevDecided > 0 ? (previousData.closedWonLeads / prevDecided) * 100 : 0;
    const curAvgDeal = currentData.totalLeads > 0 ? currentData.potentialIncome / currentData.totalLeads : 0;
    const prevAvgDeal = previousData.totalLeads > 0 ? previousData.potentialIncome / previousData.totalLeads : 0;

    // 1. Overview
    sectionTitle('Overview');
    metricCards([
      { label: 'Total Leads', value: currentData.totalLeads.toLocaleString(), cur: currentData.totalLeads, prev: previousData.totalLeads },
      { label: 'In Progress', value: currentData.inProgressLeads.toLocaleString(), cur: currentData.inProgressLeads, prev: previousData.inProgressLeads },
      { label: 'Closed Won', value: currentData.closedWonLeads.toLocaleString(), cur: currentData.closedWonLeads, prev: previousData.closedWonLeads },
      { label: 'Closed Lost', value: currentData.closedLostLeads.toLocaleString(), cur: currentData.closedLostLeads, prev: previousData.closedLostLeads },
    ]);

    // 2. Performance comparison
    sectionTitle(`Performance vs ${period.prevTitle}`);
    comparisonTable([
      {
        label: 'Total Leads',
        cur: currentData.totalLeads.toLocaleString(),
        prev: previousData.totalLeads.toLocaleString(),
        change: calculatePercentageChange(currentData.totalLeads, previousData.totalLeads),
        color: changeColor(currentData.totalLeads, previousData.totalLeads),
      },
      {
        label: 'Revenue Potential',
        cur: `PHP ${currentData.potentialIncome.toLocaleString()}`,
        prev: `PHP ${previousData.potentialIncome.toLocaleString()}`,
        change: calculatePercentageChange(currentData.potentialIncome, previousData.potentialIncome),
        color: changeColor(currentData.potentialIncome, previousData.potentialIncome),
      },
      {
        label: 'Avg. Deal Size',
        cur: `PHP ${Math.round(curAvgDeal).toLocaleString()}`,
        prev: `PHP ${Math.round(prevAvgDeal).toLocaleString()}`,
        change: calculatePercentageChange(curAvgDeal, prevAvgDeal),
        color: changeColor(curAvgDeal, prevAvgDeal),
      },
      {
        label: 'Conversion Rate (Won / Total)',
        cur: `${curConv.toFixed(1)}%`,
        prev: `${prevConv.toFixed(1)}%`,
        change: calculatePercentageChange(curConv, prevConv),
        color: changeColor(curConv, prevConv),
      },
      {
        label: 'Win Rate (Won / Decided)',
        cur: `${curWin.toFixed(1)}%`,
        prev: `${prevWin.toFixed(1)}%`,
        change: calculatePercentageChange(curWin, prevWin),
        color: changeColor(curWin, prevWin),
      },
      {
        label: 'Active Opportunities',
        cur: currentData.inProgressLeads.toLocaleString(),
        prev: previousData.inProgressLeads.toLocaleString(),
        change: calculatePercentageChange(currentData.inProgressLeads, previousData.inProgressLeads),
        color: changeColor(currentData.inProgressLeads, previousData.inProgressLeads),
      },
    ]);

    // 3. Lead status distribution
    sectionTitle('Lead Status Distribution');
    barChart(
      'Leads by Status',
      Object.entries(statusBreakdown)
        .sort(([, a], [, b]) => b - a)
        .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))
    );

    // 4. Services & sources
    sectionTitle('Services & Lead Sources');
    barChart(
      'Top Services / Products',
      Object.entries(serviceBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([label, value]) => ({ label, value, color: PALETTE[0] }))
    );
    barChart(
      'Top Lead Sources',
      Object.entries(leadSourceBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([label, value]) => ({ label: shortenLeadSource(label), value, color: PALETTE[1] }))
    );

    // 5. Personnel
    sectionTitle('Leads Captured by Personnel');
    distributionList(
      'Personnel Contribution',
      Object.entries(capturedByBreakdown)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({
          name,
          value,
          pct: currentData.totalLeads > 0 ? (value / currentData.totalLeads) * 100 : 0,
        }))
    );

    // 6. Trends
    sectionTitle(`Trends (Last ${period.trendMonths} Months)`);
    lineChart('Closed Won Deals', trend.won, PALETTE[2]);
    lineChart('Closed Won Revenue', trend.revenue, PALETTE[3], 150, 'PHP ');

    // 7. Webinars
    sectionTitle('Webinar Performance');
    if (period.type === 'weekly') {
      T(
        'Note: Webinar and social figures reflect the month(s) this week falls within.',
        CONTENT_L,
        y,
        { size: 8.5, color: MUTED }
      );
      y -= 16;
    }
    if (currentData.webinars.length === 0) {
      T('No webinars recorded for this period.', CONTENT_L, y, { size: 10, color: MUTED });
      y -= 18;
    } else {
      currentData.webinars.forEach((wb, idx) => {
        ensure(24);
        T(fit(`${idx + 1}. ${wb.webinar_title || 'Untitled Webinar'}`, fontBold, 10.5, CONTENT_W), CONTENT_L, y - 12, {
          size: 10.5,
          bold: true,
          color: INK,
        });
        y -= 22;
        const info: [string, string][] = [
          ['Presenters', wb.presenters || 'N/A'],
          ['Planned Duration', wb.duration_planned || 'N/A'],
          ['Actual Run Time', wb.actual_run_time || 'N/A'],
          ['Avg. Attendance Time', wb.average_attendance_time || 'N/A'],
          ['Page Views', String(wb.registration_page_views ?? 0)],
          ['Registered', String(wb.registered_participants ?? 0)],
          ['Attended', String(wb.attended_participants ?? 0)],
          ['Event Rating', wb.event_rating != null ? wb.event_rating.toFixed(2) : 'N/A'],
        ];
        const colW = CONTENT_W / 2;
        for (let i = 0; i < info.length; i += 2) {
          ensure(16);
          const drawCell = (pair: [string, string], cx: number) => {
            T(pair[0] + ':', cx, y - 10, { size: 9, bold: true, color: MUTED });
            T(fit(pair[1], font, 9, colW - 110), cx + 100, y - 10, { size: 9 });
          };
          drawCell(info[i], CONTENT_L);
          if (info[i + 1]) drawCell(info[i + 1], CONTENT_L + colW);
          y -= 15;
        }
        y -= 8;
      });

      // Webinar comparison
      const curW = {
        count: currentData.webinars.length,
        attended: currentData.webinars.reduce((s, w) => s + (w.attended_participants || 0), 0),
        registered: currentData.webinars.reduce((s, w) => s + (w.registered_participants || 0), 0),
        rating:
          currentData.webinars.length > 0
            ? currentData.webinars.reduce((s, w) => s + (w.event_rating || 0), 0) /
              currentData.webinars.length
            : 0,
      };
      const prevW = {
        count: previousData.webinars.length,
        attended: previousData.webinars.reduce((s, w) => s + (w.attended_participants || 0), 0),
        registered: previousData.webinars.reduce((s, w) => s + (w.registered_participants || 0), 0),
        rating:
          previousData.webinars.length > 0
            ? previousData.webinars.reduce((s, w) => s + (w.event_rating || 0), 0) /
              previousData.webinars.length
            : 0,
      };
      ensure(30);
      T('Webinar Comparison', CONTENT_L, y - 4, { size: 11, bold: true, color: NAVY });
      y -= 18;
      comparisonTable([
        { label: 'Number of Webinars', cur: String(curW.count), prev: String(prevW.count), change: calculatePercentageChange(curW.count, prevW.count), color: changeColor(curW.count, prevW.count) },
        { label: 'Total Attendees', cur: curW.attended.toLocaleString(), prev: prevW.attended.toLocaleString(), change: calculatePercentageChange(curW.attended, prevW.attended), color: changeColor(curW.attended, prevW.attended) },
        { label: 'Total Registered', cur: curW.registered.toLocaleString(), prev: prevW.registered.toLocaleString(), change: calculatePercentageChange(curW.registered, prevW.registered), color: changeColor(curW.registered, prevW.registered) },
        { label: 'Average Rating', cur: curW.rating.toFixed(2), prev: prevW.rating.toFixed(2), change: calculatePercentageChange(curW.rating, prevW.rating), color: changeColor(curW.rating, prevW.rating) },
      ]);

      const attendanceData = currentData.webinars
        .filter((w) => w.webinar_title && w.attended_participants != null)
        .map((w) => ({ label: w.webinar_title as string, value: w.attended_participants as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
      if (attendanceData.length > 0) {
        barChart('Attendance by Webinar', attendanceData);
      }
    }

    // 8. Social media
    sectionTitle('Social Media Engagement');
    const cSM = currentData.socialMedia;
    const pSM = previousData.socialMedia;
    if (!cSM && !pSM) {
      T('No social media data available for this period.', CONTENT_L, y, { size: 10, color: MUTED });
      y -= 18;
    } else {
      const smMetrics: [string, number, number][] = [
        ['Post Reach', cSM?.post_reach ?? 0, pSM?.post_reach ?? 0],
        ['Post Engagement', cSM?.post_engagement ?? 0, pSM?.post_engagement ?? 0],
        ['New Page Likes', cSM?.new_page_likes ?? 0, pSM?.new_page_likes ?? 0],
        ['New Followers', cSM?.new_page_followers ?? 0, pSM?.new_page_followers ?? 0],
        ['Reactions', cSM?.reactions ?? 0, pSM?.reactions ?? 0],
        ['Comments', cSM?.comments ?? 0, pSM?.comments ?? 0],
        ['Shares', cSM?.shares ?? 0, pSM?.shares ?? 0],
        ['Photo Views', cSM?.photo_views ?? 0, pSM?.photo_views ?? 0],
        ['Link Clicks', cSM?.link_clicks ?? 0, pSM?.link_clicks ?? 0],
      ];
      comparisonTable(
        smMetrics.map(([label, cur, prev]) => ({
          label,
          cur: cur.toLocaleString(),
          prev: prev.toLocaleString(),
          change: calculatePercentageChange(cur, prev),
          color: changeColor(cur, prev),
        }))
      );

      if (cSM) {
        const smChart = [
          { label: 'Reach', value: cSM.post_reach || 0 },
          { label: 'Engagement', value: cSM.post_engagement || 0 },
          { label: 'New Likes', value: cSM.new_page_likes || 0 },
          { label: 'Followers', value: cSM.new_page_followers || 0 },
          { label: 'Reactions', value: cSM.reactions || 0 },
          { label: 'Comments', value: cSM.comments || 0 },
          { label: 'Shares', value: cSM.shares || 0 },
        ].filter((i) => i.value > 0);
        if (smChart.length > 0) {
          barChart('Current Period Social Metrics', smChart);
        }

        const curInteractions = (cSM.reactions || 0) + (cSM.comments || 0) + (cSM.shares || 0);
        const curRate = cSM.post_reach ? (curInteractions / cSM.post_reach) * 100 : 0;
        const prevInteractions = pSM ? (pSM.reactions || 0) + (pSM.comments || 0) + (pSM.shares || 0) : 0;
        const prevRate = pSM && pSM.post_reach ? (prevInteractions / pSM.post_reach) * 100 : 0;
        ensure(40);
        T(`Engagement Rate: ${curRate.toFixed(2)}%  (prev ${prevRate.toFixed(2)}%, ${calculatePercentageChange(curRate, prevRate)})`, CONTENT_L, y, { size: 9.5 });
        y -= 15;
        T(`Total Interactions: ${curInteractions.toLocaleString()}  (prev ${prevInteractions.toLocaleString()}, ${calculatePercentageChange(curInteractions, prevInteractions)})`, CONTENT_L, y, { size: 9.5 });
        y -= 18;
      }
    }

    // 9. Insights & recommendations
    sectionTitle('Key Insights & Recommendations');
    const leadGrowth = calculatePercentageChange(currentData.totalLeads, previousData.totalLeads);
    const revenueGrowth = calculatePercentageChange(currentData.potentialIncome, previousData.potentialIncome);
    const insights: string[] = [];
    insights.push(
      `Lead generation ${
        currentData.totalLeads > previousData.totalLeads
          ? 'increased'
          : currentData.totalLeads < previousData.totalLeads
          ? 'decreased'
          : 'held steady'
      } (${leadGrowth}) vs ${period.prevTitle}.`
    );
    insights.push(
      `Pipeline value ${
        currentData.potentialIncome > previousData.potentialIncome
          ? 'grew'
          : currentData.potentialIncome < previousData.potentialIncome
          ? 'declined'
          : 'held steady'
      } (${revenueGrowth}).`
    );
    const topSource = Object.entries(leadSourceBreakdown).sort(([, a], [, b]) => b - a)[0];
    if (topSource) insights.push(`${topSource[0]} was the top lead source with ${topSource[1]} lead(s).`);
    const topPerf = Object.entries(capturedByBreakdown).sort(([, a], [, b]) => b - a)[0];
    if (topPerf) insights.push(`${topPerf[0]} captured the most leads (${topPerf[1]}).`);

    T('Insights', CONTENT_L, y - 4, { size: 11, bold: true, color: NAVY });
    y -= 20;
    bullets(insights);

    const recs: string[] = [];
    if (currentData.closedLostLeads > currentData.closedWonLeads)
      recs.push('Strengthen lead qualification and follow-up: losses currently outpace wins.');
    if (currentData.totalLeads < previousData.totalLeads)
      recs.push('Lead volume dropped - review and reinforce top-of-funnel marketing channels.');
    else if (currentData.totalLeads > previousData.totalLeads)
      recs.push('Lead volume grew - invest further in the channels driving the increase.');
    if (curConv < prevConv)
      recs.push('Conversion rate slipped - audit the sales process for bottlenecks.');
    const topService = Object.entries(serviceBreakdown).sort(([, a], [, b]) => b - a)[0];
    if (topService) recs.push(`Expand promotion of ${topService[0]} given its strong demand.`);
    if (currentData.inProgressLeads > currentData.closedWonLeads * 2)
      recs.push('Many opportunities are stalled in progress - prioritize pipeline velocity.');

    ensure(30);
    T('Recommendations', CONTENT_L, y - 4, { size: 11, bold: true, color: NAVY });
    y -= 20;
    bullets(recs);

    // ── Output ──
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);
    const filename = `Petrosphere_${period.typeLabel}_Report_${period.fileToken}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error('PDF Report Generation Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to generate report' }, { status: 500 });
  }
}
