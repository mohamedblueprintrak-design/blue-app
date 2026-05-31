// ===== Types =====
export interface ChecklistItem {
  id: string;
  checklistId: string;
  category: string;
  description: string;
  specification: string;
  isChecked: boolean;
  compliant: boolean;
  notes: string;
  photoUrl: string;
  createdAt: string;
}

export interface Violation {
  id: string;
  checklistId: string;
  projectId: string;
  type: string;
  severity: string;
  description: string;
  contractorName: string;
  deadline: string | null;
  status: string;
  photoBefore: string;
  photoAfter: string;
  resolutionNotes: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; nameEn: string; number: string } | null;
}

export interface SupervisionChecklist {
  id: string;
  projectId: string;
  stage: string;
  title: string;
  visitDate: string;
  engineerId: string | null;
  weather: string;
  temperature: string;
  workerCount: number;
  contractorName: string;
  progressOverall: number;
  notes: string;
  status: string;
  approvedById: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; nameEn: string; number: string } | null;
  items: ChecklistItem[];
  violations: Violation[];
}

export interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

export interface SupervisionProps {
  language: "ar" | "en";
  projectId?: string;
}

export interface CreateFormItem {
  _key: string;
  category: string;
  description: string;
  specification: string;
  isChecked: boolean;
  compliant: boolean;
  notes: string;
}

export interface CreateViolationItem {
  _key: string;
  type: string;
  severity: string;
  description: string;
  contractorName: string;
  deadline: string;
}

export interface CreateFormState {
  projectId: string;
  stage: string;
  title: string;
  visitDate: string;
  weather: string;
  temperature: string;
  workerCount: string;
  contractorName: string;
  progressOverall: number;
  concreteProgress: number;
  masonryProgress: number;
  electricalProgress: number;
  plumbingProgress: number;
  notes: string;
}

// ===== Stage Config =====
export const STAGES = [
  { key: "excavation", ar: "الحفر والأساسات", en: "Excavation & Foundation" },
  { key: "structure", ar: "الهيكل", en: "Structure" },
  { key: "masonry", ar: "البناء", en: "Masonry" },
  { key: "FINISHING", ar: "التشطيبات", en: "Finishing" },
  { key: "handover", ar: "التسليم", en: "Handover" },
];

export const STAGE_TEMPLATES: Record<string, { category: string; description: string; specification: string }[]> = {
  excavation: [
    { category: "أعمال الحفر", description: "عمق الحفر مطابق للمخطط", specification: "طبقاً للمخططات الإنشائية" },
    { category: "أعمال الحفر", description: "اتساع القواعد صحيح", specification: "طبقاً للمخططات الإنشائية" },
    { category: "الأساسات", description: "تسليح القواعد مطابق", specification: "قطر وعدد الحديد طبقاً للمخطط" },
    { category: "الأساسات", description: "صب القواعد", specification: "خرسانة مسلحة C35" },
    { category: "أعمال التسوية", description: "تسوية أرضية القواعد", specification: "طبقة رمل 10 سم" },
    { category: "السلامة", description: "حفرات السياج والحماية", specification: "حماية بلاستيكية حول الحفرات" },
  ],
  structure: [
    { category: "الأعمدة", description: "تسليح الأعمدة مطابق", specification: "قطر وعدد الحديد" },
    { category: "الأعمدة", description: "صب الأعمدة", specification: "خرسانة مسلحة C40" },
    { category: "الأسقف", description: "تسليح الأسقف مطابق", specification: "طبقاً للمخطط الإنشائي" },
    { category: "الأسقف", description: "صب الأسقف", specification: "خرسانة مسلحة C35" },
    { category: "الجدران الحاملة", description: "أعمال البلوك الحامل", specification: "بلوك إسمنتي معتمد" },
    { category: "السلامة", description: "سقالات ودعامات آمنة", specification: "معتمدة من مهندس السلامة" },
  ],
  masonry: [
    { category: "البناء", description: "مطابقة محاور الجدران", specification: "طبقاً للمخطط المعماري" },
    { category: "البناء", description: "أعمال الطوب والبلوك", specification: "نوع وقوة البلوك" },
    { category: "الملاط", description: "خلطة الملاط", specification: "نسبة الأسمنت:الرمل" },
    { category: "العزل", description: "عزل الرطوبة", specification: "مادة العزل المعتمدة" },
    { category: "أعمال المياه", description: "تمديدات السباكة الأولية", specification: "طبقاً لمخطط MEP" },
    { category: "السلامة", description: "استخدام معدات الوقاية", specification: "خوذة وقفازات" },
  ],
  FINISHING: [
    { category: "الدهانات", description: "معجون وتسوية الجدران", specification: "سطح ناعم جاهز للدهان" },
    { category: "الدهانات", description: "أعمال الدهان", specification: "درجتان على الأقل" },
    { category: "البلاط", description: "بلاط الأرضيات", specification: "مطابق للمخطط ونوعية المواد" },
    { category: "البلاط", description: "بلاط الحوائط", specification: "مطابق للمخطط" },
    { category: "الكهرباء", description: "الأعمال الكهربائية", specification: "طبقاً لمخطط MEP" },
    { category: "المكيفات", description: "تمديدات التكييف", specification: "طبقاً لمخطط MEP" },
  ],
  handover: [
    { category: "المعينة", description: "فحص المبنى كاملاً", specification: "قائمة المعاينة النهائية" },
    { category: "الوثائق", description: "استلام كروكات الأساسات", specification: "جميع الكروكات المطلوبة" },
    { category: "الاختبارات", description: "اختبارات ضغط الخرسانة", specification: "تقرير المختبر" },
    { category: "النظافة", description: "نظافة الموقع والمبنى", specification: "جاهزية للتسليم" },
    { category: "الموافقات", description: "الموافقات الحكومية", specification: "شهادة الإنجاز" },
  ],
};

// ===== Helpers =====
export function getInitialCreateForm(projectId?: string, selectedStage?: string): CreateFormState {
  return {
    projectId: projectId || "",
    stage: selectedStage && selectedStage !== "all" ? selectedStage : "",
    title: "",
    visitDate: new Date().toISOString().split("T")[0],
    weather: "sunny",
    temperature: "",
    workerCount: "",
    contractorName: "",
    progressOverall: 0,
    concreteProgress: 0,
    masonryProgress: 0,
    electricalProgress: 0,
    plumbingProgress: 0,
    notes: "",
  };
}
