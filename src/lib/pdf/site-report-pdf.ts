// @ts-check
// Server-side Site Report (Site Diary) PDF generator
// Fetches site diary data from DB and generates a professional PDF

import { db } from '@/lib/db';
import type { JsPdfCache, JsPdfInternal } from '@/types/pdf-types';
import { setupArabicPdf, preprocessArabicText } from './arabic-helper';

let jspdfCache: JsPdfCache | null = null;

async function getJsPDF() {
  if (jspdfCache) return jspdfCache;
  const jspdfModule = await import('jspdf');
  const autotableModule = await import('jspdf-autotable');
  jspdfCache = { jsPDF: jspdfModule.default, autoTable: autotableModule.default };
  return jspdfCache;
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TEAL = [20, 184, 166] as [number, number, number];
const LIGHT_GRAY = [241, 245, 249] as [number, number, number];
const TEXT = [30, 41, 59] as [number, number, number];
const SECONDARY = [100, 116, 139] as [number, number, number];

function checkPageBreak(doc: import('jspdf').jsPDF, yPos: number, pageHeight: number, needed: number, margin: number): number {
  if (yPos + needed > pageHeight - 30) {
    doc.addPage();
    const h = doc.internal.pageSize.getHeight();
    doc.setFillColor(...TEAL);
    doc.rect(0, h - 15, doc.internal.pageSize.getWidth(), 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('Cairo', 'normal');
    doc.text('BluePrint - Site Diary Report', doc.internal.pageSize.getWidth() / 2, h - 6, { align: 'center' });
    return margin + 10;
  }
  return yPos;
}

function drawSection(
  doc: import('jspdf').jsPDF,
  label: string,
  value: string | null | undefined,
  yPos: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  labelColor: [number, number, number] = SECONDARY,
  valueColor: [number, number, number] = TEXT,
): number {
  if (value === null || value === undefined || value.trim() === '') return yPos;

  doc.setFontSize(10);
  doc.setFont('Cairo', 'bold');
  doc.setTextColor(...labelColor);
  doc.text(label + ':', margin, yPos);

  yPos += 5;
  doc.setFont('Cairo', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...valueColor);

  const lines = doc.splitTextToSize(value, pageWidth - 2 * margin);
  const displayLines = lines.slice(0, 8);
  doc.text(displayLines, margin, yPos);
  yPos += displayLines.length * 4 + 3;

  return yPos;
}

export async function generateSiteReportPDFBuffer(siteDiaryId: string, lang: 'ar' | 'en' = 'en'): Promise<Buffer> {
  // Fetch site diary with project
  const siteDiary = await db.siteDiary.findUnique({
    where: { id: siteDiaryId },
    include: {
      project: true,
    },
  });

  if (!siteDiary) {
    throw new Error('Site diary not found');
  }

  // Fetch company settings — SECURITY: scoped to the site diary's organization
  // (the caller already verified ownership). Unfiltered findFirst() could print
  // ANOTHER tenant's company identity on the report.
  const settings = await db.companySettings.findFirst({
    where: { organizationId: siteDiary.organizationId },
  });
  const orgName = lang === 'ar' ? (settings?.name || 'BluePrint') : (settings?.nameEn || 'BluePrint Engineering');

  const { jsPDF, autoTable } = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // Set up dynamic font and Arabic auto-reshaping/RTL formatting
  await setupArabicPdf(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const isRTL = lang === 'ar';


  const translations = {
    siteDiaryReport: isRTL ? 'تقرير يومية الموقع' : 'Site Diary Report',
    reportDate: isRTL ? 'تاريخ التقرير' : 'Report Date',
    projectName: isRTL ? 'المشروع' : 'Project',
    status: isRTL ? 'الحالة' : 'Status',
    weatherConditions: isRTL ? 'حالة الطقس' : 'Weather Conditions',
    workersCount: isRTL ? 'عدد العمال' : 'Workers Count',
    workDescription: isRTL ? 'وصف العمل' : 'Work Description',
    issues: isRTL ? 'المشاكل' : 'Issues',
    safetyNotes: isRTL ? 'ملاحظات السلامة' : 'Safety Notes',
    equipment: isRTL ? 'المعدات' : 'Equipment',
    materials: isRTL ? 'المواد' : 'Materials',
    page: isRTL ? 'صفحة' : 'Page',
    noIssues: isRTL ? 'لا توجد مشاكل' : 'No issues',
    noSafety: isRTL ? 'لا توجد ملاحظات سلامة' : 'No safety issues',
  };

  const statusLabels: Record<string, string> = {
    DRAFT: isRTL ? 'مسودة' : 'Draft',
    SUBMITTED: isRTL ? 'مقدم' : 'Submitted',
    APPROVED: isRTL ? 'معتمد' : 'Approved',
  };

  // ===== HEADER =====
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(orgName, isRTL ? pageWidth - margin : margin, 18, {
    align: isRTL ? 'right' : 'left',
  });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(translations.siteDiaryReport, isRTL ? pageWidth - margin : margin, 28, {
    align: isRTL ? 'right' : 'left',
  });

  // Org details on opposite side
  doc.setFontSize(9);
  if (settings?.address) {
    doc.text(settings.address, isRTL ? margin : pageWidth - margin, 18, {
      align: isRTL ? 'left' : 'right',
    });
  }
  if (settings?.phone) {
    doc.text(settings.phone, isRTL ? margin : pageWidth - margin, 24, {
      align: isRTL ? 'left' : 'right',
    });
  }

  let yPos = 50;

  // ===== INFO BOX =====
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 30, 3, 3, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEAL);
  doc.text(`${translations.reportDate}: ${formatDate(siteDiary.date)}`, margin + 5, yPos + 3);

  doc.setFontSize(10);
  doc.setTextColor(...SECONDARY);
  doc.setFont('helvetica', 'normal');
  const projName = isRTL ? siteDiary.project?.name : (siteDiary.project?.nameEn || siteDiary.project?.name);
  doc.text(`${translations.projectName}: ${projName || '-'}`, margin + 5, yPos + 10);

  const diary = siteDiary as Record<string, unknown>;
  const statusKey = String(diary.status ?? '');
  doc.text(`${translations.status}: ${statusLabels[statusKey] || statusKey || '-'}`, margin + 5, yPos + 17);

  yPos += 35;

  // ===== QUICK INFO TABLE =====
  const quickInfoData = [
    [
      translations.weatherConditions, siteDiary.weather || '-',
      translations.workersCount, siteDiary.workerCount?.toString() || '-',
    ],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: quickInfoData.map(row => row.map(cell => preprocessArabicText(cell || ''))),
    theme: 'plain',
    styles: {
      font: 'Cairo',
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold', textColor: SECONDARY },
      1: { cellWidth: 55, textColor: TEXT },
      2: { cellWidth: 40, fontStyle: 'bold', textColor: SECONDARY },
      3: { cellWidth: 55, textColor: TEXT },
    },
    margin: { left: margin, right: margin },
  });


  yPos = (doc.lastAutoTable?.finalY ?? yPos) + 10;

  // ===== WORK DESCRIPTION =====
  yPos = checkPageBreak(doc, yPos, pageHeight, 30, margin);
  yPos = drawSection(doc, translations.workDescription, siteDiary.workDescription, yPos, margin, pageWidth, pageHeight);

  // ===== ISSUES =====
  yPos = checkPageBreak(doc, yPos, pageHeight, 25, margin);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 179, 8);
  doc.text(translations.issues + ':', margin, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (siteDiary.issues && siteDiary.issues.trim()) {
    doc.setTextColor(...TEXT);
    const issueLines = doc.splitTextToSize(siteDiary.issues, pageWidth - 2 * margin);
    doc.text(issueLines.slice(0, 6), margin, yPos);
    yPos += issueLines.slice(0, 6).length * 4 + 3;
  } else {
    doc.setTextColor(34, 197, 94);
    doc.text(`No ${translations.noIssues}`, margin, yPos);
    yPos += 6;
  }

  // ===== SAFETY NOTES =====
  yPos = checkPageBreak(doc, yPos, pageHeight, 25, margin);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(239, 68, 68);
  doc.text(translations.safetyNotes + ':', margin, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (siteDiary.safetyNotes && siteDiary.safetyNotes.trim()) {
    doc.setTextColor(...TEXT);
    const safetyLines = doc.splitTextToSize(siteDiary.safetyNotes, pageWidth - 2 * margin);
    doc.text(safetyLines.slice(0, 6), margin, yPos);
    yPos += safetyLines.slice(0, 6).length * 4 + 3;
  } else {
    doc.setTextColor(34, 197, 94);
    doc.text(`No ${translations.noSafety}`, margin, yPos);
    yPos += 6;
  }

  // ===== EQUIPMENT =====
  yPos = checkPageBreak(doc, yPos, pageHeight, 25, margin);
  yPos = drawSection(doc, translations.equipment, siteDiary.equipment, yPos, margin, pageWidth, pageHeight, [59, 130, 246], TEXT);

  // ===== MATERIALS =====
  yPos = checkPageBreak(doc, yPos, pageHeight, 25, margin);
  yPos = drawSection(doc, translations.materials, siteDiary.materials, yPos, margin, pageWidth, pageHeight, [59, 130, 246], TEXT);

  // ===== FOOTER =====
  doc.setFillColor(...TEAL);
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const footerText = `${orgName} - ${translations.siteDiaryReport} | ${translations.page} 1`;
  doc.text(footerText, pageWidth / 2, pageHeight - 6, { align: 'center' });

  // Add footers for all pages
  const totalPages = (doc.internal as unknown as JsPdfInternal).getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFillColor(...TEAL);
    doc.rect(0, h - 15, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(`${orgName} - ${translations.siteDiaryReport} | ${translations.page} ${i} / ${totalPages}`, pageWidth / 2, h - 6, { align: 'center' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}
