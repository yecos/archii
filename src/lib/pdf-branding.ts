/**
 * pdf-branding.ts
 * Professional PDF branding system for ArchiFlow.
 * Provides company header, footer, cover page, and theme-aware colors.
 */

import type jsPDF from 'jspdf';
import type { Company } from './types';
import { COLOR_THEMES, DEFAULT_THEME, type ColorThemeId } from './themes';

/* ===== Theme-Aware Color Helpers ===== */

/** Hex string like '#c8a96e' → RGB tuple [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** Get the current color theme from localStorage (client-side only) */
function getCurrentThemeId(): ColorThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  return (localStorage.getItem('archiflow-color-theme') as ColorThemeId) || DEFAULT_THEME;
}

/** Resolve brand colors based on current active theme */
export function getThemeColors(): {
  primary: [number, number, number];
  primaryLight: [number, number, number];
  dark: [number, number, number];
  text: [number, number, number];
  muted: [number, number, number];
  white: [number, number, number];
  green: [number, number, number];
  red: [number, number, number];
  bg: [number, number, number];
} {
  const themeId = getCurrentThemeId();
  const theme = COLOR_THEMES.find(t => t.id === themeId);
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  const vars = theme ? (isDark ? theme.dark : theme.light) : {};

  const primaryHex = vars['--af-accent'] || '#9e7c3e';
  const primaryLightHex = vars['--af-accent2'] || '#c8a96e';

  return {
    primary: hexToRgb(primaryHex),
    primaryLight: hexToRgb(primaryLightHex),
    dark: [26, 26, 32] as [number, number, number],
    text: [51, 51, 51] as [number, number, number],
    muted: [130, 130, 130] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    green: [16, 185, 129] as [number, number, number],
    red: [239, 68, 68] as [number, number, number],
    bg: [247, 247, 248] as [number, number, number],
  };
}

/* ===== Company Data Interface ===== */

export interface CompanyBranding {
  name: string;
  nit: string;
  address: string;
  phone: string;
  email: string;
  legalName: string;
}

/** Extract branding from a Company document (or defaults) */
export function getCompanyBranding(company?: Company): CompanyBranding {
  return {
    name: company?.data?.name || 'Mi Empresa',
    nit: company?.data?.nit || 'NIT: Pendiente',
    address: company?.data?.address || 'Dirección no registrada',
    phone: company?.data?.phone || 'Teléfono no registrado',
    email: company?.data?.email || 'Email no registrado',
    legalName: company?.data?.legalName || company?.data?.name || 'Mi Empresa S.A.S.',
  };
}

/* ===== PDF Header with Company Branding ===== */

/**
 * Add branded company header to every page of the PDF.
 * Shows company name, NIT, logo area, report title, and generation date.
 */
export function addBrandedHeader(
  doc: jsPDF,
  title: string,
  subtitle?: string,
  branding?: CompanyBranding,
  colors?: ReturnType<typeof getThemeColors>,
) {
  const C = colors || getThemeColors();
  const pageW = doc.internal.pageSize.getWidth();
  const B = branding;

  // Top accent bar
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageW, 5, 'F');

  // Company logo area (text-based)
  const logoY = 16;
  if (B) {
    // Company name bold
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...C.dark);
    doc.text(B.name, 14, logoY);

    // Legal name (smaller)
    if (B.legalName && B.legalName !== B.name) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.muted);
      doc.text(B.legalName, 14, logoY + 5);
    }

    // NIT
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    const nitY = B.legalName && B.legalName !== B.name ? logoY + 9 : logoY + 5;
    doc.text(B.nit, 14, nitY);
  }

  // Report title (right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.primary);
  doc.text(title, pageW - 14, logoY, { align: 'right' });

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text(subtitle, pageW - 14, logoY + 5, { align: 'right' });
  }

  // Generation date
  const dateStr = new Date().toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text(`Generado: ${dateStr}`, pageW - 14, logoY + 10, { align: 'right' });

  // Separator line
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.5);
  doc.line(14, 30, pageW - 14, 30);

  // ArchiFlow brand mark
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.primary);
  doc.text('ArchiFlow', 14, 28);
}

/* ===== PDF Footer ===== */

/**
 * Add branded footer to every page.
 * Shows "Generado por Archiflow", generation date, page number.
 */
export function addBrandedFooter(doc: jsPDF, colors?: ReturnType<typeof getThemeColors>) {
  const C = colors || getThemeColors();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();

  // Top line
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.3);
  doc.line(14, pageH - 14, pageW - 14, pageH - 14);

  // "Generado por Archiflow"
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text('Generado por ArchiFlow — Plataforma de Gestión de Proyectos', pageW / 2, pageH - 10, { align: 'center' });

  // Date
  const dateStr = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(dateStr, 14, pageH - 10);

  // Page number
  const pageInfo = doc.getCurrentPageInfo();
  doc.text(`Página ${pageInfo.pageNumber}`, pageW - 14, pageH - 10, { align: 'right' });
}

/* ===== Cover Page ===== */

/**
 * Generate a professional cover page with project summary.
 */
export function addCoverPage(
  doc: jsPDF,
  opts: {
    reportTitle: string;
    reportType: string;
    projectName?: string;
    clientName?: string;
    dateRange?: string;
    branding?: CompanyBranding;
    colors?: ReturnType<typeof getThemeColors>;
    summaryItems?: { label: string; value: string }[];
  },
) {
  const C = opts.colors || getThemeColors();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const B = opts.branding;

  // Full-height dark background
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Primary accent bar at top
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageW, 8, 'F');

  // Company branding (top left)
  if (B) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...C.primary);
    doc.text(B.name, 14, 28);

    if (B.legalName && B.legalName !== B.name) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      doc.text(B.legalName, 14, 35);
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    let infoY = 35;
    if (B.nit) { infoY += 6; doc.text(B.nit, 14, infoY); }
    if (B.address) { infoY += 5; doc.text(B.address, 14, infoY); }
    if (B.phone) { infoY += 5; doc.text(`Tel: ${B.phone}`, 14, infoY); }
    if (B.email) { infoY += 5; doc.text(`Email: ${B.email}`, 14, infoY); }
  }

  // Report type label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.primaryLight);
  doc.text(opts.reportType.toUpperCase(), 14, pageH - 80);

  // Report title (large)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...C.white);
  doc.text(opts.reportTitle, 14, pageH - 65);

  // Accent underline
  doc.setFillColor(...C.primary);
  doc.rect(14, pageH - 60, 50, 2, 'F');

  // Project name
  if (opts.projectName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(180, 180, 180);
    doc.text(`Proyecto: ${opts.projectName}`, 14, pageH - 48);
  }

  // Client
  if (opts.clientName) {
    doc.setFontSize(11);
    doc.setTextColor(160, 160, 160);
    doc.text(`Cliente: ${opts.clientName}`, 14, pageH - 40);
  }

  // Date range
  if (opts.dateRange) {
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Período: ${opts.dateRange}`, 14, pageH - 32);
  }

  // Summary KPI boxes (bottom row)
  if (opts.summaryItems && opts.summaryItems.length > 0) {
    const boxCount = Math.min(opts.summaryItems.length, 4);
    const boxW = (pageW - 28 - (boxCount - 1) * 5) / boxCount;
    const boxY = pageH - 22;

    opts.summaryItems.slice(0, 4).forEach((item, i) => {
      const x = 14 + i * (boxW + 5);

      // Box background
      doc.setFillColor(40, 40, 48);
      doc.roundedRect(x, boxY - 10, boxW, 16, 1.5, 1.5, 'F');

      // Accent bar left
      doc.setFillColor(...C.primary);
      doc.rect(x, boxY - 10, 1.5, 16, 'F');

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...C.primary);
      doc.text(item.value, x + 5, boxY - 2);

      // Label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text(item.label, x + 5, boxY + 3);
    });
  }

  // ArchiFlow mark (bottom right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 90);
  doc.text('ArchiFlow', pageW - 14, pageH - 10, { align: 'right' });
}

/* ===== Table of Contents ===== */

/**
 * Add a table of contents page.
 */
export function addTableOfContents(
  doc: jsPDF,
  sections: { title: string; page: number }[],
  colors?: ReturnType<typeof getThemeColors>,
) {
  const C = colors || getThemeColors();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.dark);
  doc.text('Contenido', 14, 20);

  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.5);
  doc.line(14, 24, 80, 24);

  let y = 34;
  sections.forEach((section, i) => {
    // Number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.primary);
    doc.text(`${i + 1}.`, 14, y);

    // Title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...C.dark);
    doc.text(section.title, 24, y);

    // Dots + page number
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...C.muted);
    doc.text(String(section.page), pageW - 14, y, { align: 'right' });

    // Dotted line between title and page
    const titleWidth = doc.getTextWidth(section.title);
    const dotsStart = 24 + titleWidth + 3;
    const dotsEnd = pageW - 14 - doc.getTextWidth(String(section.page)) - 3;
    const dotsCount = Math.floor((dotsEnd - dotsStart) / 2);
    if (dotsCount > 0) {
      doc.text('.'.repeat(dotsCount), dotsStart, y);
    }

    y += 8;
  });
}

/* ===== Utility: Page Break ===== */

export function checkAddPage(doc: jsPDF, y: number, needed: number = 40): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 20) {
    doc.addPage();
    addBrandedFooter(doc);
    return 36;
  }
  return y;
}

/* ===== Section Title Helper ===== */

export function addSectionTitle(
  doc: jsPDF,
  y: number,
  title: string,
  colors?: ReturnType<typeof getThemeColors>,
): number {
  const C = colors || getThemeColors();
  const pageW = doc.internal.pageSize.getWidth();
  y = checkAddPage(doc, y, 25);

  // Section number accent bar
  doc.setFillColor(...C.primary);
  doc.rect(14, y, 3, 12, 'F');

  // Title text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.dark);
  doc.text(title, 22, y + 9);

  // Underline
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.3);
  doc.line(22, y + 12, pageW - 14, y + 12);

  return y + 18;
}

/* ===== KPI Box Helper ===== */

export function addKPIBoxes(
  doc: jsPDF,
  y: number,
  kpis: { label: string; value: string; color?: [number, number, number] }[],
  colors?: ReturnType<typeof getThemeColors>,
): number {
  const C = colors || getThemeColors();
  const pageW = doc.internal.pageSize.getWidth();
  y = checkAddPage(doc, y, 30);

  const count = kpis.length;
  const cols = count <= 3 ? count : 3;
  const rows = Math.ceil(count / cols);
  const boxW = (pageW - 28 - (cols - 1) * 5) / cols;

  kpis.forEach((kpi, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 14 + col * (boxW + 5);
    const yPos = y + row * 18;

    doc.setFillColor(...C.bg);
    doc.roundedRect(x, yPos, boxW, 15, 1.5, 1.5, 'F');

    // Accent bar
    const color = kpi.color || C.primary;
    doc.setFillColor(...color);
    doc.rect(x, yPos, 1.5, 15, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...color);
    doc.text(kpi.value, x + 5, yPos + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text(kpi.label, x + 5, yPos + 12);
  });

  return y + rows * 18 + 6;
}
