import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { preprocessArabicText, loadArabicFont } from "./pdf/arabic-helper";


// ===== Invoice Data Types =====
interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoicePDFData {
  number: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  clientName: string;
  clientCompany?: string;
  projectName: string;
  items: InvoiceItem[];
  status: string;
}

// ===== Helpers =====
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatAED(amount: number): string {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`;
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "Draft",
    SENT: "Sent",
    PARTIALLY_PAID: "Partially Paid",
    PAID: "Paid",
    OVERDUE: "Overdue",
    CANCELLED: "Cancelled",
  };
  return map[status] || status;
}

// ===== Main PDF Generator =====
export async function generateInvoicePDF(invoice: InvoicePDFData, lang: 'ar' | 'en' = 'en') {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Load Cairo font for Arabic rendering
  await loadArabicFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const _contentWidth = pageWidth - margin * 2;

  const isAr = lang === 'ar';

  // ---- Company Header ----
  // Teal header bar
  doc.setFillColor(20, 184, 166);
  doc.rect(0, 0, pageWidth, 32, "F");

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("Cairo", "bold");
  doc.text(preprocessArabicText(isAr ? "مخطط" : "BluePrint"), margin, 15);

  // Arabic subtitle
  doc.setFontSize(9);
  doc.setFont("Cairo", "normal");
  doc.text(preprocessArabicText(isAr ? "مكتب الاستشارات الهندسية" : "Engineering Consultancy Office"), margin, 22);
  doc.setFontSize(8);
  doc.setTextColor(200, 240, 235);
  doc.text(preprocessArabicText(isAr ? "دولة الإمارات العربية المتحدة" : "United Arab Emirates"), margin, 27);

  // Invoice number on right
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("Cairo", "normal");
  doc.text(preprocessArabicText(isAr ? "فاتورة ضريبية" : "Tax Invoice"), pageWidth - margin, 15, { align: "right" });
  doc.setFontSize(16);
  doc.setFont("Cairo", "bold");
  doc.text(preprocessArabicText(invoice.number), pageWidth - margin, 24, { align: "right" });

  // ---- Invoice Details Section ----
  let y = 42;

  // Client info (left side)
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("Cairo", "bold");
  doc.text(preprocessArabicText(isAr ? "معلومات العميل" : "CLIENT INFORMATION"), margin, y);

  y += 6;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont("Cairo", "bold");
  doc.text(preprocessArabicText(invoice.clientName), margin, y);

  if (invoice.clientCompany) {
    y += 5;
    doc.setFontSize(9);
    doc.setFont("Cairo", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(preprocessArabicText(invoice.clientCompany), margin, y);
  }

  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(preprocessArabicText(isAr ? `المشروع: ${invoice.projectName}` : `Project: ${invoice.projectName}`), margin, y);

  // Invoice details (right side)
  let rightY = 42;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("Cairo", "bold");
  doc.text(preprocessArabicText(isAr ? "تفاصيل الفاتورة" : "INVOICE DETAILS"), pageWidth - margin, rightY, { align: "right" });

  rightY += 7;
  doc.setFontSize(9);
  doc.setFont("Cairo", "normal");

  doc.setTextColor(100, 116, 139);
  doc.text(preprocessArabicText(isAr ? "تاريخ الإصدار:" : "Issue Date:"), pageWidth - margin - 40, rightY, { align: "right" });
  doc.setTextColor(30, 41, 59);
  doc.setFont("Cairo", "bold");
  doc.text(preprocessArabicText(formatDate(invoice.issueDate)), pageWidth - margin, rightY, { align: "right" });

  rightY += 6;
  doc.setFont("Cairo", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(preprocessArabicText(isAr ? "تاريخ الاستحقاق:" : "Due Date:"), pageWidth - margin - 40, rightY, { align: "right" });
  doc.setTextColor(30, 41, 59);
  doc.setFont("Cairo", "bold");
  doc.text(preprocessArabicText(formatDate(invoice.dueDate)), pageWidth - margin, rightY, { align: "right" });

  rightY += 6;
  doc.setFont("Cairo", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(preprocessArabicText(isAr ? "الحالة:" : "Status:"), pageWidth - margin - 40, rightY, { align: "right" });
  doc.setTextColor(30, 41, 59);
  doc.setFont("Cairo", "bold");
  doc.text(preprocessArabicText(isAr ? getStatusLabel(invoice.status) : getStatusLabel(invoice.status)), pageWidth - margin, rightY, { align: "right" });

  // ---- Divider ----
  y = Math.max(y, rightY) + 8;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // ---- Line Items Table ----
  y += 8;

  const tableBody = invoice.items.map((item, idx) => [
    (idx + 1).toString(),
    preprocessArabicText(item.description || "—"),
    item.quantity.toString(),
    formatAED(item.unitPrice),
    formatAED(item.total),
  ]);

  const headers = isAr
    ? [["#", "الوصف", "الكمية", "سعر الوحدة", "الإجمالي"]]
    : [["#", "Description", "Qty", "Unit Price", "Total"]];

  autoTable(doc, {
    startY: y,
    head: headers,
    body: tableBody,
    margin: { left: margin, right: margin },
    theme: "striped",
    styles: {
      font: "Cairo",
    },
    headStyles: {
      fillColor: [20, 184, 166],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right", fontStyle: "bold" },
    },
  });

  // ---- Totals Section ----
  const finalY = doc.lastAutoTable?.finalY || y + 50;
  let totalsY = finalY + 8;

  // Draw a light background box for totals
  const totalsBoxWidth = 90;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsBoxX, totalsY - 4, totalsBoxWidth, 32, 2, 2, "F");

  // Subtotal
  doc.setFontSize(9);
  doc.setFont("Cairo", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(preprocessArabicText(isAr ? "المجموع الفرعي" : "Subtotal"), pageWidth - margin - 30, totalsY + 2, { align: "right" });
  doc.setTextColor(30, 41, 59);
  doc.setFont("Cairo", "bold");
  doc.text(preprocessArabicText(formatAED(invoice.subtotal)), pageWidth - margin, totalsY + 2, { align: "right" });

  // VAT
  totalsY += 7;
  doc.setFont("Cairo", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(preprocessArabicText(isAr ? "ضريبة القيمة المضافة (5%)" : "VAT (5%)"), pageWidth - margin - 30, totalsY + 2, { align: "right" });
  doc.setTextColor(30, 41, 59);
  doc.setFont("Cairo", "bold");
  doc.text(preprocessArabicText(formatAED(invoice.tax)), pageWidth - margin, totalsY + 2, { align: "right" });

  // Grand Total with teal accent
  totalsY += 9;
  doc.setDrawColor(20, 184, 166);
  doc.setLineWidth(0.8);
  doc.line(pageWidth - margin - totalsBoxWidth + 5, totalsY - 3, pageWidth - margin, totalsY - 3);

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(preprocessArabicText(isAr ? "المجموع الإجمالي" : "Grand Total"), pageWidth - margin - 30, totalsY + 2, { align: "right" });
  doc.setTextColor(20, 184, 166);
  doc.setFont("Cairo", "bold");
  doc.text(preprocessArabicText(formatAED(invoice.total)), pageWidth - margin, totalsY + 2, { align: "right" });

  // ---- Footer ----
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

  doc.setFontSize(8);
  doc.setFont("Cairo", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(preprocessArabicText(isAr ? "شكراً لتعاملكم معنا" : "Thank you for your business"), pageWidth / 2, pageHeight - 18, { align: "center" });
  doc.text(preprocessArabicText(isAr ? "مكتب مخطط للاستشارات الهندسية - الإمارات" : "BluePrint Engineering Consultancy - UAE"), pageWidth / 2, pageHeight - 12, { align: "center" });

  // Save
  doc.save(`invoice-${invoice.number}.pdf`);
}

