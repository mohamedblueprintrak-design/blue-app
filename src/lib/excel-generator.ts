import ExcelJS from 'exceljs';
import { db } from '@/lib/db';

// Monkey-patch ExcelJS Worksheet prototype to prevent Excel Formula Injection (CWE-1236)
// We dynamically resolve the Worksheet prototype via a dummy workbook instance to avoid TS build issues.
const dummyWorkbook = new ExcelJS.Workbook();
const dummyWorksheet = dummyWorkbook.addWorksheet('dummy');
const WorksheetPrototype = Object.getPrototypeOf(dummyWorksheet);
const originalAddRow = WorksheetPrototype.addRow;
WorksheetPrototype.addRow = function(this: unknown, values: unknown, ...args: unknown[]) {
  const sanitizeValue = (val: unknown): unknown => {
    if (typeof val === 'string') {
      // If the string starts with =, +, -, or @, prepend a single quote (')
      // to force Excel/LibreOffice to treat it as raw text rather than a formula.
      if (/^[=+\-@\t\r]/.test(val)) {
        return `'${val}`;
      }
    }
    return val;
  };

  if (Array.isArray(values)) {
    return originalAddRow.call(this, values.map(sanitizeValue), ...args);
  } else if (values && typeof values === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const key of Object.keys(values)) {
      sanitizedObj[key] = sanitizeValue((values as Record<string, unknown>)[key]);
    }
    return originalAddRow.call(this, sanitizedObj, ...args);
  }
  return originalAddRow.call(this, values, ...args);
};

// Get labels based on language
function getLabels(language: 'ar' | 'en') {
  if (language === 'ar') {
    return {
      financialReport: 'التقرير المالي',
      projectReport: 'تقرير المشاريع',
      taskReport: 'تقرير المهام',
      clientReport: 'تقرير العملاء',
      invoiceReport: 'تقرير الفواتير',
      contractReport: 'تقرير العقود',
      summary: 'الملخص',
      totalInvoiced: 'إجمالي الفواتير',
      totalPaid: 'المبالغ المحصلة',
      totalPending: 'المبالغ المعلقة',
      totalOverdue: 'المبالغ المتأخرة',
      date: 'التاريخ',
      invoiced: 'الفواتير',
      paid: 'المدفوعات',
      pending: 'المتأخرات',
      totalProjects: 'إجمالي المشاريع',
      active: 'نشط',
      completed: 'مكتمل',
      onHold: 'متوقف',
      projectName: 'اسم المشروع',
      client: 'العميل',
      status: 'الحالة',
      progress: 'التقدم',
      budget: 'الميزانية',
      startDate: 'تاريخ البداية',
      endDate: 'تاريخ النهاية',
      totalTasks: 'إجمالي المهام',
      todo: 'للتنفيذ',
      inProgress: 'قيد التنفيذ',
      done: 'منجز',
      overdue: 'متأخر',
      taskTitle: 'المهمة',
      project: 'المشروع',
      priority: 'الأولوية',
      dueDate: 'تاريخ الاستحقاق',
      assignee: 'المسؤول',
      totalClients: 'إجمالي العملاء',
      activeClients: 'العملاء النشطون',
      totalRevenue: 'إجمالي الإيرادات',
      name: 'الاسم',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      company: 'الشركة',
      totalInvoices: 'إجمالي الفواتير',
      invoiceNumber: 'رقم الفاتورة',
      amount: 'المبلغ',
      paidAmount: 'المبلغ المدفوع',
      issueDate: 'تاريخ الإصدار',
      contractNumber: 'رقم العقد',
      contractTitle: 'عنوان العقد',
      contractValue: 'قيمة العقد',
      contractType: 'نوع العقد',
      data: 'البيانات',
    };
  }

  return {
    financialReport: 'Financial Report',
    projectReport: 'Project Report',
    taskReport: 'Task Report',
    clientReport: 'Client Report',
    invoiceReport: 'Invoice Report',
    contractReport: 'Contract Report',
    summary: 'Summary',
    totalInvoiced: 'Total Invoiced',
    totalPaid: 'Total Paid',
    totalPending: 'Total Pending',
    totalOverdue: 'Total Overdue',
    date: 'Date',
    invoiced: 'Invoiced',
    paid: 'Paid',
    pending: 'Pending',
    totalProjects: 'Total Projects',
    active: 'Active',
    completed: 'Completed',
    onHold: 'On Hold',
    projectName: 'Project Name',
    client: 'Client',
    status: 'Status',
    progress: 'Progress',
    budget: 'Budget',
    startDate: 'Start Date',
    endDate: 'End Date',
    totalTasks: 'Total Tasks',
    todo: 'To Do',
    inProgress: 'In Progress',
    done: 'Done',
    overdue: 'Overdue',
    taskTitle: 'Task',
    project: 'Project',
    priority: 'Priority',
    dueDate: 'Due Date',
    assignee: 'Assignee',
    totalClients: 'Total Clients',
    activeClients: 'Active Clients',
    totalRevenue: 'Total Revenue',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    company: 'Company',
    totalInvoices: 'Total Invoices',
    invoiceNumber: 'Invoice #',
    amount: 'Amount',
    paidAmount: 'Paid Amount',
    issueDate: 'Issue Date',
    contractNumber: 'Contract #',
    contractTitle: 'Contract Title',
    contractValue: 'Contract Value',
    contractType: 'Contract Type',
    data: 'Data',
  };
}

// Apply header style to first row
function styleHeaderRow(worksheet: ExcelJS.Worksheet, colCount: number) {
  const row = worksheet.getRow(1);
  for (let col = 1; col <= colCount; col++) {
    const cell = row.getCell(col);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF14B8A6' }, // Teal
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF0D9488' } },
    };
  }
  row.height = 25;
}

// Status label mapping
const STATUS_LABELS: Record<string, Record<string, string>> = {
  ACTIVE: { ar: 'نشط', en: 'Active' },
  COMPLETED: { ar: 'مكتمل', en: 'Completed' },
  DELAYED: { ar: 'متأخر', en: 'Delayed' },
  ON_HOLD: { ar: 'متوقف', en: 'On Hold' },
  CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
  DRAFT: { ar: 'مسودة', en: 'Draft' },
  SENT: { ar: 'مرسلة', en: 'Sent' },
  PARTIALLY_PAID: { ar: 'مدفوعة جزئياً', en: 'Partially Paid' },
  PAID: { ar: 'مدفوعة', en: 'Paid' },
  OVERDUE: { ar: 'متأخرة', en: 'Overdue' },
  TODO: { ar: 'للتنفيذ', en: 'To Do' },
  IN_PROGRESS: { ar: 'قيد التنفيذ', en: 'In Progress' },
  REVIEW: { ar: 'مراجعة', en: 'Review' },
  DONE: { ar: 'منجز', en: 'Done' },
  PENDING_SIGNATURE: { ar: 'بانتظار التوقيع', en: 'Pending Signature' },
  EXPIRED: { ar: 'منتهي', en: 'Expired' },
  ENGINEERING_SERVICES: { ar: 'خدمات هندسية', en: 'Engineering Services' },
  CONSTRUCTION: { ar: 'إنشائي', en: 'Construction' },
  CONSULTING: { ar: 'استشارات', en: 'Consulting' },
  MAINTENANCE: { ar: 'صيانة', en: 'Maintenance' },
  NORMAL: { ar: 'عادي', en: 'Normal' },
  MEDIUM: { ar: 'متوسط', en: 'Medium' },
  HIGH: { ar: 'عالي', en: 'High' },
  URGENT: { ar: 'عاجل', en: 'Urgent' },
  CRITICAL: { ar: 'حرج', en: 'Critical' },
};

function getStatusLabel(status: string, lang: 'ar' | 'en'): string {
  return STATUS_LABELS[status]?.[lang] || status;
}

// ===== Financial Excel Export =====
async function exportFinancial(lang: 'ar' | 'en', org: Record<string, unknown> = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const labels = getLabels(lang);
  const currency = 'AED';

  const invoiceStats = await db.invoice.aggregate({
    _sum: { total: true, paidAmount: true },
    where: org,
  });
  const pendingSum = await db.invoice.aggregate({
    _sum: { remaining: true },
    where: { status: { in: ['SENT', 'PARTIALLY_PAID'] }, ...org },
  });
  const overdueSum = await db.invoice.aggregate({
    _sum: { remaining: true },
    where: { status: 'OVERDUE', ...org },
  });

  // Summary sheet
  const summarySheet = workbook.addWorksheet(labels.summary);
  summarySheet.columns = [{ width: 30 }, { width: 20 }];
  summarySheet.addRow([labels.financialReport, '']);
  summarySheet.addRow([]);
  summarySheet.addRow([labels.summary, '']);
  summarySheet.addRow([labels.totalInvoiced, `${invoiceStats._sum.total || 0} ${currency}`]);
  summarySheet.addRow([labels.totalPaid, `${invoiceStats._sum.paidAmount || 0} ${currency}`]);
  summarySheet.addRow([labels.totalPending, `${pendingSum._sum.remaining || 0} ${currency}`]);
  summarySheet.addRow([labels.totalOverdue, `${overdueSum._sum.remaining || 0} ${currency}`]);

  // Monthly data
  const now = new Date();
  const arMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const monthlySheet = workbook.addWorksheet(lang === 'ar' ? 'البيانات الشهرية' : 'Monthly Data');
  monthlySheet.columns = [
    { key: 'date', width: 15 },
    { key: 'invoiced', width: 18 },
    { key: 'paid', width: 18 },
    { key: 'pending', width: 18 },
  ];
  styleHeaderRow(monthlySheet, 4);

  // PERF: Sequential aggregate queries per month (N+1 pattern).
  // A future optimization could use a single groupBy query with date truncation
  // to compute all months in one database round-trip.
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const invoiced = await db.invoice.aggregate({
      _sum: { total: true },
      where: { status: { not: 'CANCELLED' }, createdAt: { gte: monthStart, lte: monthEnd }, ...org },
    });
    const paid = await db.invoice.aggregate({
      _sum: { paidAmount: true },
      where: { createdAt: { gte: monthStart, lte: monthEnd }, ...org },
    });

    monthlySheet.addRow([
      lang === 'ar' ? arMonths[monthStart.getMonth()] : enMonths[monthStart.getMonth()],
      invoiced._sum.total || 0,
      paid._sum.paidAmount || 0,
      Number(invoiced._sum.total || 0) - Number(paid._sum.paidAmount || 0),
    ]);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ===== Projects Excel Export =====
async function exportProjects(lang: 'ar' | 'en', org: Record<string, unknown> = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const labels = getLabels(lang);

  const projects = await db.project.findMany({
    where: org,
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  });

  const sheet = workbook.addWorksheet(lang === 'ar' ? 'المشاريع' : 'Projects');
  sheet.columns = [
    { key: 'name', width: 35 },
    { key: 'client', width: 25 },
    { key: 'status', width: 15 },
    { key: 'progress', width: 12 },
    { key: 'budget', width: 18 },
    { key: 'startDate', width: 15 },
    { key: 'endDate', width: 15 },
    { key: 'location', width: 20 },
    { key: 'type', width: 15 },
  ];
  sheet.addRow([labels.projectName, labels.client, labels.status, labels.progress, labels.budget, labels.startDate, labels.endDate, lang === 'ar' ? 'الموقع' : 'Location', lang === 'ar' ? 'النوع' : 'Type']);
  styleHeaderRow(sheet, 9);

  projects.forEach(p => {
    sheet.addRow([
      lang === 'ar' ? p.name : (p.nameEn || p.name),
      p.client.name,
      getStatusLabel(p.status, lang),
      `${p.progress}%`,
      p.budget,
      p.startDate ? new Date(p.startDate).toLocaleDateString('en-GB') : '-',
      p.endDate ? new Date(p.endDate).toLocaleDateString('en-GB') : '-',
      p.location,
      getStatusLabel(p.type, lang),
    ]);
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ===== Tasks Excel Export =====
async function exportTasks(lang: 'ar' | 'en', org: Record<string, unknown> = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const labels = getLabels(lang);

  const tasks = await db.task.findMany({
    where: org,
    include: {
      assignee: { select: { name: true } },
      project: { select: { name: true, nameEn: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const sheet = workbook.addWorksheet(lang === 'ar' ? 'المهام' : 'Tasks');
  sheet.columns = [
    { key: 'title', width: 35 },
    { key: 'project', width: 25 },
    { key: 'status', width: 15 },
    { key: 'priority', width: 12 },
    { key: 'dueDate', width: 15 },
    { key: 'assignee', width: 20 },
    { key: 'progress', width: 12 },
  ];
  sheet.addRow([labels.taskTitle, labels.project, labels.status, labels.priority, labels.dueDate, labels.assignee, labels.progress]);
  styleHeaderRow(sheet, 7);

  tasks.forEach(t => {
    sheet.addRow([
      t.title,
      lang === 'ar' ? (t.project?.name || '-') : (t.project?.nameEn || t.project?.name || '-'),
      getStatusLabel(t.status, lang),
      getStatusLabel(t.priority, lang),
      t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-GB') : '-',
      t.assignee?.name || '-',
      `${t.progress}%`,
    ]);
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ===== Invoices Excel Export =====
async function exportInvoices(lang: 'ar' | 'en', org: Record<string, unknown> = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const labels = getLabels(lang);

  const invoices = await db.invoice.findMany({
    where: org,
    include: {
      client: { select: { name: true } },
      project: { select: { name: true, nameEn: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const sheet = workbook.addWorksheet(lang === 'ar' ? 'الفواتير' : 'Invoices');
  sheet.columns = [
    { key: 'invoiceNumber', width: 18 },
    { key: 'client', width: 25 },
    { key: 'project', width: 25 },
    { key: 'total', width: 15 },
    { key: 'paidAmount', width: 15 },
    { key: 'remaining', width: 15 },
    { key: 'status', width: 15 },
    { key: 'issueDate', width: 15 },
    { key: 'dueDate', width: 15 },
  ];
  sheet.addRow([labels.invoiceNumber, labels.client, labels.project, labels.amount, labels.paidAmount, lang === 'ar' ? 'المتبقي' : 'Remaining', labels.status, labels.issueDate, labels.dueDate]);
  styleHeaderRow(sheet, 9);

  invoices.forEach(inv => {
    sheet.addRow([
      inv.number,
      inv.client.name,
      lang === 'ar' ? inv.project?.name : (inv.project?.nameEn || inv.project?.name),
      inv.total,
      inv.paidAmount,
      inv.remaining,
      getStatusLabel(inv.status, lang),
      new Date(inv.issueDate).toLocaleDateString('en-GB'),
      new Date(inv.dueDate).toLocaleDateString('en-GB'),
    ]);
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ===== Clients Excel Export =====
async function exportClients(lang: 'ar' | 'en', org: Record<string, unknown> = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const labels = getLabels(lang);

  const clients = await db.client.findMany({
    where: org,
    include: {
      invoices: { select: { total: true, paidAmount: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const sheet = workbook.addWorksheet(lang === 'ar' ? 'العملاء' : 'Clients');
  sheet.columns = [
    { key: 'name', width: 30 },
    { key: 'company', width: 25 },
    { key: 'email', width: 25 },
    { key: 'phone', width: 18 },
    { key: 'address', width: 30 },
    { key: 'totalInvoiced', width: 18 },
    { key: 'totalPaid', width: 18 },
    { key: 'outstanding', width: 18 },
  ];
  sheet.addRow([labels.name, labels.company, labels.email, labels.phone, lang === 'ar' ? 'العنوان' : 'Address', labels.totalInvoiced, labels.totalPaid, lang === 'ar' ? 'المتبقي' : 'Outstanding']);
  styleHeaderRow(sheet, 8);

  clients.forEach(c => {
    const totalInvoiced = c.invoices.reduce((s, inv) => s + Number(inv.total), 0);
    const totalPaid = c.invoices.reduce((s, inv) => s + Number(inv.paidAmount), 0);
    sheet.addRow([
      c.name,
      c.company,
      c.email,
      c.phone,
      c.address,
      totalInvoiced,
      totalPaid,
      totalInvoiced - totalPaid,
    ]);
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ===== Contracts Excel Export =====
async function exportContracts(lang: 'ar' | 'en', org: Record<string, unknown> = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const labels = getLabels(lang);

  const contracts = await db.contract.findMany({
    where: org,
    include: {
      client: { select: { name: true } },
      project: { select: { name: true, nameEn: true } },
      amendments: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const sheet = workbook.addWorksheet(lang === 'ar' ? 'العقود' : 'Contracts');
  sheet.columns = [
    { key: 'number', width: 18 },
    { key: 'title', width: 30 },
    { key: 'client', width: 25 },
    { key: 'project', width: 25 },
    { key: 'value', width: 18 },
    { key: 'type', width: 20 },
    { key: 'status', width: 15 },
    { key: 'startDate', width: 15 },
    { key: 'endDate', width: 15 },
    { key: 'amendments', width: 12 },
  ];
  sheet.addRow([labels.contractNumber, labels.contractTitle, labels.client, labels.project, labels.contractValue, labels.contractType, labels.status, labels.startDate, labels.endDate, lang === 'ar' ? 'التعديلات' : 'Amendments']);
  styleHeaderRow(sheet, 10);

  contracts.forEach(c => {
    sheet.addRow([
      c.number,
      c.title,
      c.client.name,
      lang === 'ar' ? c.project?.name : (c.project?.nameEn || c.project?.name),
      c.value,
      getStatusLabel(c.type, lang),
      getStatusLabel(c.status, lang),
      c.startDate ? new Date(c.startDate).toLocaleDateString('en-GB') : '-',
      c.endDate ? new Date(c.endDate).toLocaleDateString('en-GB') : '-',
      c.amendments.length,
    ]);
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ===== Main Export Function =====
export async function generateExcelExport(
  type: string,
  lang: 'ar' | 'en' = 'ar',
  org: Record<string, unknown> = {}
): Promise<Buffer> {
  switch (type) {
    case 'financial':
      return exportFinancial(lang, org);
    case 'projects':
      return exportProjects(lang, org);
    case 'tasks':
      return exportTasks(lang, org);
    case 'invoices':
      return exportInvoices(lang, org);
    case 'clients':
      return exportClients(lang, org);
    case 'contracts':
      return exportContracts(lang, org);
    default:
      throw new Error(`Unknown export type: ${type}`);
  }
}
