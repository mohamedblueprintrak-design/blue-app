/**
 * Generic Report PDF Generator
 * منشئ تقارير PDF العام
 *
 * Generates PDF documents from arbitrary report data (columns + rows).
 * Used by the Custom Report Builder for PDF output.
 */

import type { JsPdfCache } from '@/types/pdf-types';
import { setupArabicPdf, preprocessArabicText } from './arabic-helper';
import { getCompanySettings } from './pdf-generator';

interface GenericReportColumn {
  key: string;
  label: string;
}

interface GenericReportData {
  title: string;
  columns: GenericReportColumn[];
  rows: Record<string, unknown>[];
  language: 'ar' | 'en';
  currency?: string;
}

// Teal accent color matching BluePrint branding
const TEAL = [20, 184, 166] as [number, number, number];

// Cache for loaded modules
let jspdfCache: JsPdfCache | null = null;

async function getJsPDF() {
  if (jspdfCache) return jspdfCache;
  const jspdfModule = await import('jspdf');
  const autotableModule = await import('jspdf-autotable');
  jspdfCache = { jsPDF: jspdfModule.default, autoTable: autotableModule.default };
  return jspdfCache;
}

/**
 * Generate a PDF from generic report data (columns + rows).
 */
export async function generateGenericReportPDF(data: GenericReportData): Promise<Buffer> {
  const { jsPDF, autoTable } = await getJsPDF();
  const doc = new jsPDF('landscape');

  await setupArabicPdf(doc);

  const isRTL = data.language === 'ar';
  const settings = await getCompanySettings();

  // Header
  if (settings.pdfHeader) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(settings.pdfHeader, doc.internal.pageSize.width / 2, 10, { align: 'center' });
  }

  // Title
  doc.setFontSize(20);
  doc.setTextColor(...TEAL);
  doc.text(data.title, isRTL ? 280 : 14, 20, { align: isRTL ? 'right' : 'left' });

  // Date
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  const dateStr = isRTL
    ? `تاريخ: ${new Date().toLocaleDateString('ar-SA')}`
    : `Date: ${new Date().toLocaleDateString('en-US')}`;
  doc.text(dateStr, isRTL ? 280 : 14, 30, { align: isRTL ? 'right' : 'left' });

  // Build table
  const tableHeaders = [data.columns.map((col) => col.label)];
  const tableData = data.rows.map((row) =>
    data.columns.map((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return '-';
      if (typeof val === 'number') {
        // Format numbers with commas
        return val.toLocaleString(isRTL ? 'ar-SA' : 'en-US');
      }
      return String(val);
    })
  );

  autoTable(doc, {
    head: tableHeaders.map((row) => row.map((cell) => preprocessArabicText(cell))),
    body: tableData.map((row) => row.map((cell) => preprocessArabicText(cell))),
    startY: 40,
    theme: 'striped',
    styles: {
      font: 'Cairo',
    },
    headStyles: {
      fillColor: TEAL,
      textColor: [255, 255, 255],
      fontSize: 10,
      halign: isRTL ? 'right' : 'left',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 41, 59],
      halign: isRTL ? 'right' : 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    const footerText = isRTL
      ? `BluePrint - صفحة ${i} من ${pageCount}`
      : `BluePrint - Page ${i} of ${pageCount}`;
    doc.text(footerText, isRTL ? 280 : 14, doc.internal.pageSize.height - 10, {
      align: isRTL ? 'right' : 'left',
    });
    if (settings.pdfFooter) {
      doc.text(settings.pdfFooter, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, {
        align: 'center',
      });
    }
  }

  return Buffer.from(doc.output('arraybuffer'));
}
