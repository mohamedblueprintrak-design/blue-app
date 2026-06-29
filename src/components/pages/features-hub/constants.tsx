import { MapPin, Calculator, Clock, Globe, PhoneCall, PenTool, Car } from 'lucide-react'
import type { DemoProject, DemoEngineer, DemoVisit, BOQItem, TimeEntry, ClientInteraction, ClientProject, NavItem } from './types'

// ===== Demo Data =====
export const DEMO_PROJECTS: DemoProject[] = [
  { id: '1', name: 'فيلا المريعي', client: 'أحمد المريعي', status: 'ACTIVE', progress: 65, lat: 25.7895, lng: 55.9432, budget: 2500000, type: 'فيلا', startDate: '2024-01-15', endDate: '2025-06-30' },
  { id: '2', name: 'برج النخيل', client: 'شركة النخيل للاستثمار', status: 'ACTIVE', progress: 40, lat: 25.7950, lng: 55.9600, budget: 18000000, type: 'برج سكني', startDate: '2024-03-01', endDate: '2026-12-31' },
  { id: '3', name: 'مجمع الواحة التجاري', client: 'مجموعة الواحة', status: 'DELAYED', progress: 28, lat: 25.7700, lng: 55.9350, budget: 35000000, type: 'تجاري', startDate: '2023-09-01', endDate: '2025-09-01' },
  { id: '4', name: 'مدرسة الفلاح', client: 'وزارة التربية والتعليم', status: 'COMPLETED', progress: 100, lat: 25.8050, lng: 55.9700, budget: 12000000, type: 'مدرسة', startDate: '2022-06-01', endDate: '2024-01-15' },
  { id: '5', name: 'فيلا الشامسي', client: 'خالد الشامسي', status: 'ON_HOLD', progress: 15, lat: 25.7820, lng: 55.9280, budget: 1800000, type: 'فيلا', startDate: '2024-06-01', endDate: '2025-03-30' },
  { id: '6', name: 'فندق الخليج', client: 'شركة الخليج للضيافة', status: 'ACTIVE', progress: 55, lat: 25.7980, lng: 55.9550, budget: 45000000, type: 'فندق', startDate: '2023-12-01', endDate: '2026-06-01' },
  { id: '7', name: 'مركز الصحة', client: 'دائرة الصحة رأس الخيمة', status: 'ACTIVE', progress: 72, lat: 25.8010, lng: 55.9380, budget: 8000000, type: 'طبي', startDate: '2024-02-01', endDate: '2025-04-30' },
  { id: '8', name: 'فيلا الكعبي', client: 'سالم الكعبي', status: 'COMPLETED', progress: 100, lat: 25.7760, lng: 55.9510, budget: 2200000, type: 'فيلا', startDate: '2023-03-01', endDate: '2024-06-30' },
]

export const DEMO_ENGINEERS: DemoEngineer[] = [
  { id: 'e1', name: 'م. محمد العلي', role: 'مهندس معماري أول', phone: '+971501234567', avatar: '🏗️' },
  { id: 'e2', name: 'م. سارة الحوسني', role: 'مهندسة إنشائية', phone: '+971502345678', avatar: '📐' },
  { id: 'e3', name: 'م. خالد الرميثي', role: 'مهندس كهربائي', phone: '+971503456789', avatar: '⚡' },
  { id: 'e4', name: 'م. فاطمة الزيودي', role: 'مهندسة MEP', phone: '+971504567890', avatar: '🔧' },
  { id: 'e5', name: 'م. عبدالله الشامسي', role: 'مهندس مدني', phone: '+971505678901', avatar: '🏗️' },
]

export const DEMO_VISITS: DemoVisit[] = [
  { id: 'v1', engineerId: 'e1', projectId: '1', engineerName: 'م. محمد العلي', projectName: 'فيلا المريعي', date: '2025-04-08', timeIn: '08:30', timeOut: '11:45', status: 'COMPLETED', lat: 25.7895, lng: 55.9432, notes: 'فحص أعمال الصب ومراجعة الارتدادات' },
  { id: 'v2', engineerId: 'e2', projectId: '2', engineerName: 'م. سارة الحوسني', projectName: 'برج النخيل', date: '2025-04-08', timeIn: '09:00', timeOut: '13:00', status: 'COMPLETED', lat: 25.7950, lng: 55.9600, notes: 'معاينة حديد التسليح في الدور الخامس' },
  { id: 'v3', engineerId: 'e3', projectId: '3', engineerName: 'م. خالد الرميثي', projectName: 'مجمع الواحة التجاري', date: '2025-04-08', timeIn: '10:00', timeOut: null, status: 'IN_PROGRESS', lat: 25.7700, lng: 55.9350, notes: 'فحص التمديدات الكهربائية' },
  { id: 'v4', engineerId: 'e4', projectId: '6', engineerName: 'م. فاطمة الزيودي', projectName: 'فندق الخليج', date: '2025-04-09', timeIn: '08:00', timeOut: null, status: 'PLANNED', lat: 25.7980, lng: 55.9550, notes: 'مراجعة تصاميم MEP' },
  { id: 'v5', engineerId: 'e5', projectId: '7', engineerName: 'م. عبدالله الشامسي', projectName: 'مركز الصحة', date: '2025-04-09', timeIn: '09:30', timeOut: null, status: 'PLANNED', lat: 25.8010, lng: 55.9380, notes: 'فحص أعمال النجارة' },
  { id: 'v6', engineerId: 'e1', projectId: '5', engineerName: 'م. محمد العلي', projectName: 'فيلا الشامسي', date: '2025-04-07', timeIn: '07:45', timeOut: '10:30', status: 'COMPLETED', lat: 25.7820, lng: 55.9280, notes: 'فحص الموقع ومراجعة الأساسات' },
  { id: 'v7', engineerId: 'e2', projectId: '1', engineerName: 'م. سارة الحوسني', projectName: 'فيلا المريعي', date: '2025-04-05', timeIn: '08:00', timeOut: '12:00', status: 'COMPLETED', lat: 25.7895, lng: 55.9432, notes: 'اختبار الخرسانة' },
  { id: 'v8', engineerId: 'e3', projectId: '6', engineerName: 'م. خالد الرميثي', projectName: 'فندق الخليج', date: '2025-04-06', timeIn: '09:00', timeOut: '11:30', status: 'COMPLETED', lat: 25.7980, lng: 55.9550, notes: 'فحص لوحات التوزيع الكهربائي' },
]

export const DEMO_BOQ_ITEMS: BOQItem[] = [
  { id: 'b1', description: 'حفر أساسات', unit: 'م³', quantity: 250, unitCost: 45, category: 'civil', total: 11250 },
  { id: 'b2', description: 'خرسانة عادية للأساسات', unit: 'م³', quantity: 180, unitCost: 280, category: 'civil', total: 50400 },
  { id: 'b3', description: 'خرسانة مسلحة', unit: 'م³', quantity: 320, unitCost: 420, category: 'structural', total: 134400 },
  { id: 'b4', description: 'حديد تسليح', unit: 'طن', quantity: 85, unitCost: 3200, category: 'structural', total: 272000 },
  { id: 'b5', description: 'تمديدات كهربائية', unit: 'نقطة', quantity: 150, unitCost: 350, category: 'mep', total: 52500 },
  { id: 'b6', description: 'تمديدات تكييف مركزي', unit: 'طن تبريد', quantity: 25, unitCost: 8500, category: 'mep', total: 212500 },
  { id: 'b7', description: 'بلاط أرضيات رخام', unit: 'م²', quantity: 450, unitCost: 280, category: 'finishing', total: 126000 },
  { id: 'b8', description: 'دهانات داخلية', unit: 'م²', quantity: 1200, unitCost: 35, category: 'finishing', total: 42000 },
  { id: 'b9', description: 'أشجار ونباتات زينة', unit: 'عدد', quantity: 35, unitCost: 1200, category: 'landscape', total: 42000 },
  { id: 'b10', description: 'نظام ري آلي', unit: 'محطة', quantity: 4, unitCost: 3500, category: 'landscape', total: 14000 },
]

export const BOQ_AI_SUGGESTIONS: Record<string, { min: number; max: number; unit: string }> = {
  'حفر': { min: 35, max: 55, unit: '/م³' },
  'خرسانة عادية': { min: 250, max: 320, unit: '/م³' },
  'خرسانة مسلحة': { min: 380, max: 480, unit: '/م³' },
  'حديد تسليح': { min: 2800, max: 3600, unit: '/طن' },
  'بلاط': { min: 200, max: 380, unit: '/م²' },
  'دهانات': { min: 28, max: 45, unit: '/م²' },
  'تمديدات كهربائية': { min: 300, max: 450, unit: '/نقطة' },
  'تكييف': { min: 7000, max: 10000, unit: '/طن تبريد' },
}

export const DEMO_TIME_ENTRIES: TimeEntry[] = [
  { id: 't1', projectId: '1', projectName: 'فيلا المريعي', task: 'مراجعة المخططات', date: '2025-04-08', startTime: '08:00', endTime: '12:00', duration: 4, isBillable: true, isTimerRunning: false },
  { id: 't2', projectId: '2', projectName: 'برج النخيل', task: 'تصميم هيكي', date: '2025-04-08', startTime: '12:30', endTime: '16:30', duration: 4, isBillable: true, isTimerRunning: false },
  { id: 't3', projectId: '3', projectName: 'مجمع الواحة التجاري', task: 'متابعة المقاول', date: '2025-04-07', startTime: '09:00', endTime: '11:00', duration: 2, isBillable: true, isTimerRunning: false },
  { id: 't4', projectId: '6', projectName: 'فندق الخليج', task: 'إعداد تقرير', date: '2025-04-07', startTime: '13:00', endTime: '15:00', duration: 2, isBillable: false, isTimerRunning: false },
  { id: 't5', projectId: '1', projectName: 'فيلا المريعي', task: 'زيارة موقع', date: '2025-04-06', startTime: '08:30', endTime: '11:30', duration: 3, isBillable: true, isTimerRunning: false },
  { id: 't6', projectId: '7', projectName: 'مركز الصحة', task: 'تنسيق مع البلدية', date: '2025-04-08', startTime: '10:00', endTime: null, duration: 0, isBillable: false, isTimerRunning: true },
]

export const DEMO_INTERACTIONS: ClientInteraction[] = [
  { id: 'c1', clientId: '1', clientName: 'أحمد المريعي', projectId: '1', projectName: 'فيلا المريعي', type: 'meeting', date: '2025-04-08', subject: 'مراجعة التصميم النهائي', description: 'تم عقد اجتماع لمراجعة التعديلات المطلوبة على التصميم الداخلي', outcome: 'تمت الموافقة على التعديلات' },
  { id: 'c2', clientId: '2', clientName: 'شركة النخيل للاستثمار', projectId: '2', projectName: 'برج النخيل', type: 'call', date: '2025-04-07', subject: 'متابعة حالة المشروع', description: 'اتصال هاتفي لمناقشة التأخير في تنفيذ الأعمال الإنشائية', outcome: 'طلب تعجيل المقاول' },
  { id: 'c3', clientId: '3', clientName: 'مجموعة الواحة', projectId: '3', projectName: 'مجمع الواحة التجاري', type: 'email', date: '2025-04-06', subject: 'إرسال المخططات المحدثة', description: 'تم إرسال نسخة محدثة من مخططات الطابق الثاني', outcome: 'بانتظار الرد' },
  { id: 'c4', clientId: '1', clientName: 'أحمد المريعي', projectId: '1', projectName: 'فيلا المريعي', type: 'call', date: '2025-04-05', subject: 'تأكيد موعد الزيارة', description: 'تأكيد موعد زيارة الموقع يوم الثلاثاء', outcome: 'تم التأكيد' },
  { id: 'c5', clientId: '6', clientName: 'شركة الخليج للضيافة', projectId: '6', projectName: 'فندق الخليج', type: 'meeting', date: '2025-04-04', subject: 'اجتماع لجنة المراجعة', description: 'اجتماع لمناقشة مخططات MEP مع فريق الفندق', outcome: 'تحتاج تعديلات على مسار التكييف' },
  { id: 'c6', clientId: '7', clientName: 'دائرة الصحة رأس الخيمة', projectId: '7', projectName: 'مركز الصحة', type: 'call', date: '2025-04-03', subject: 'استفسار عن التراخيص', description: 'اتصال بخصوص حالة طلب الترخيص من البلدية', outcome: 'الطلب قيد المراجعة' },
]

export const DEMO_CLIENT_PROJECTS: ClientProject[] = [
  {
    id: '1', name: 'فيلا المريعي', status: 'ACTIVE', progress: 65,
    milestones: [
      { name: 'التصميم المعماري', completed: true, date: '2024-03-01' },
      { name: 'التصميم الإنشائي', completed: true, date: '2024-04-15' },
      { name: 'ترخيص البناء', completed: true, date: '2024-06-01' },
      { name: 'أعمال الأساسات', completed: true, date: '2024-09-01' },
      { name: 'الهيكل الخرساني', completed: false, date: '2025-03-01' },
      { name: 'التشطيبات', completed: false, date: '2025-06-15' },
      { name: 'التسليم', completed: false, date: '2025-06-30' },
    ],
    documents: [
      { name: 'المخطط المعماري النهائي', type: 'pdf', date: '2024-03-01' },
      { name: 'دراسة الإنشاء', type: 'pdf', date: '2024-04-15' },
      { name: 'رخصة البناء', type: 'pdf', date: '2024-06-01' },
      { name: 'تقرير الزيارة الأخيرة', type: 'pdf', date: '2025-04-08' },
    ]
  }
]



export const PIE_COLORS = ['#0e2a5c', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#10b981', '#f97316']

// ===== NAVIGATION =====
export const NAV_ITEMS: NavItem[] = [
  { id: 'map', label: 'خريطة المشاريع', labelEn: 'Project Map', icon: <MapPin className="h-5 w-5" /> },
  { id: 'visits', label: 'زيارات المهندسين', labelEn: 'Site Visits', icon: <Car className="h-5 w-5" /> },
  { id: 'boq', label: 'حاسبة التكاليف', labelEn: 'Cost Calculator', icon: <Calculator className="h-5 w-5" /> },
  { id: 'time', label: 'إدارة الوقت', labelEn: 'Time Tracking', icon: <Clock className="h-5 w-5" /> },
  { id: 'portal', label: 'بوابة العملاء', labelEn: 'Client Portal', icon: <Globe className="h-5 w-5" /> },
  { id: 'communications', label: 'التواصل', labelEn: 'Communications', icon: <PhoneCall className="h-5 w-5" /> },
  { id: 'design', label: 'إدارة التصميم', labelEn: 'Design Management', icon: <PenTool className="h-5 w-5" /> },
]
