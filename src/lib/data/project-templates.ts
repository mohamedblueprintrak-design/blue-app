// @ts-check
/**
 * Pre-defined Project Templates for UAE Engineering Consultancy
 * قوالب المشاريع المحددة مسبقاً للاستشارات الهندسية في الإمارات
 * 
 * Each template contains stages with tasks that represent a typical
 * project lifecycle for different building types in the UAE/Gulf region.
 */

import { db } from '@/lib/db';

// ==================== Types ====================

export interface TemplateTaskDef {
  title: string;
  titleAr: string;
  description?: string;
  descriptionAr?: string;
  assigneeRole?: string; // e.g., 'ENGINEER', 'DRAFTSMAN', 'ARCHITECT'
  priority: 'low' | 'normal' | 'medium' | 'high' | 'urgent';
  estimatedDays: number;
}

export interface TemplateStageDef {
  name: string;
  nameAr: string;
  order: number;
  tasks: TemplateTaskDef[];
}

export interface ProjectTemplateDef {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: 'RESIDENTIAL' | 'COMMERCIAL' | 'INFRASTRUCTURE' | 'INDUSTRIAL' | 'EDUCATIONAL';
  icon: string;
  defaultBudget: number;
  defaultDurationDays: number;
  currency: string;
  stages: TemplateStageDef[];
}

// ==================== Pre-defined Templates ====================

export const PROJECT_TEMPLATES: ProjectTemplateDef[] = [
  // ─── Residential Villa ───
  {
    name: 'Residential Villa',
    nameAr: 'فيلا سكنية',
    description: 'Complete design and approval workflow for a residential villa project including municipality permits and supervision.',
    descriptionAr: 'سير عمل التصميم والاعتماد الكامل لمشروع فيلا سكنية يشمل تصاريح البلدية والإشراف.',
    category: 'RESIDENTIAL',
    icon: '🏠',
    defaultBudget: 150000,
    defaultDurationDays: 180,
    currency: 'AED',
    stages: [
      {
        name: 'Site Survey',
        nameAr: 'مسح الموقع',
        order: 1,
        tasks: [
          { title: 'Conduct topographic survey', titleAr: 'إجراء مسح طبوغرافي', assigneeRole: 'DRAFTSMAN', priority: 'high', estimatedDays: 3 },
          { title: 'Verify plot boundaries', titleAr: 'التحقق من حدود القسيمة', assigneeRole: 'DRAFTSMAN', priority: 'high', estimatedDays: 2 },
          { title: 'Document existing conditions', titleAr: 'توثيق الحالة الحالية', assigneeRole: 'ENGINEER', priority: 'normal', estimatedDays: 2 },
          { title: 'Prepare site survey report', titleAr: 'إعداد تقرير مسح الموقع', assigneeRole: 'ENGINEER', priority: 'normal', estimatedDays: 2 },
        ],
      },
      {
        name: 'Concept Design',
        nameAr: 'التصميم المفاهيمي',
        order: 2,
        tasks: [
          { title: 'Develop concept floor plans', titleAr: 'تطوير مخططات الطوابق المفاهيمية', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 7 },
          { title: 'Create exterior elevations', titleAr: 'إنشاء الواجهات الخارجية', assigneeRole: 'DRAFTSMAN', priority: 'high', estimatedDays: 5 },
          { title: 'Client review and feedback', titleAr: 'مراجعة العميل والملاحظات', assigneeRole: 'ENGINEER', priority: 'urgent', estimatedDays: 3 },
          { title: 'Revise concept based on feedback', titleAr: 'مراجعة المفهوم بناءً على الملاحظات', assigneeRole: 'ENGINEER', priority: 'medium', estimatedDays: 5 },
        ],
      },
      {
        name: 'Detailed Design',
        nameAr: 'التصميم التفصيلي',
        order: 3,
        tasks: [
          { title: 'Prepare architectural detailed drawings', titleAr: 'إعداد الرسومات المعمارية التفصيلية', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 14 },
          { title: 'Design structural system', titleAr: 'تصميم النظام الإنشائي', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 10 },
          { title: 'Design MEP systems (Electrical)', titleAr: 'تصميم أنظمة الكهرباء والميكانيكا', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 7 },
          { title: 'Design MEP systems (Plumbing)', titleAr: 'تصميم أنظمة السباكة', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 5 },
          { title: 'Prepare Bill of Quantities', titleAr: 'إعداد جدول الكميات', assigneeRole: 'ENGINEER', priority: 'medium', estimatedDays: 5 },
        ],
      },
      {
        name: 'Municipality Approval',
        nameAr: 'اعتماد البلدية',
        order: 4,
        tasks: [
          { title: 'Prepare municipality submission package', titleAr: 'إعداد حزمة تقديم البلدية', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 3 },
          { title: 'Submit building permit application', titleAr: 'تقديم طلب رخصة البناء', assigneeRole: 'SECRETARY', priority: 'urgent', estimatedDays: 2 },
          { title: 'Address municipality review comments', titleAr: 'معالجة ملاحظات مراجعة البلدية', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 7 },
          { title: 'Obtain building permit', titleAr: 'الحصول على رخصة البناء', assigneeRole: 'SECRETARY', priority: 'urgent', estimatedDays: 3 },
          { title: 'Obtain Civil Defense approval', titleAr: 'الحصول على موافقة الدفاع المدني', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 10 },
        ],
      },
      {
        name: 'Supervision',
        nameAr: 'الإشراف',
        order: 5,
        tasks: [
          { title: 'Conduct pre-construction meeting', titleAr: 'عقد اجتماع ما قبل البناء', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 1 },
          { title: 'Schedule regular site inspections', titleAr: 'جدولة المعاينات الدورية للموقع', assigneeRole: 'ENGINEER', priority: 'normal', estimatedDays: 2 },
          { title: 'Review and approve shop drawings', titleAr: 'مراجعة واعتماد رسومات التنفيذ', assigneeRole: 'ENGINEER', priority: 'medium', estimatedDays: 30 },
          { title: 'Final inspection and handover', titleAr: 'المعاينة النهائية والتسليم', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 3 },
        ],
      },
    ],
  },

  // ─── Commercial Tower ───
  {
    name: 'Commercial Tower',
    nameAr: 'برج تجاري',
    description: 'Full lifecycle project template for commercial tower construction including feasibility study, detailed design, and multi-department approvals.',
    descriptionAr: 'قالب دورة حياة كامل لمشروع بناء برج تجاري يشمل دراسة الجدوى والتصميم التفصيلي واعتمادات الأقسام المتعددة.',
    category: 'COMMERCIAL',
    icon: '🏢',
    defaultBudget: 500000,
    defaultDurationDays: 365,
    currency: 'AED',
    stages: [
      {
        name: 'Feasibility Study',
        nameAr: 'دراسة الجدوى',
        order: 1,
        tasks: [
          { title: 'Conduct market analysis', titleAr: 'إجراء تحليل السوق', assigneeRole: 'MANAGER', priority: 'high', estimatedDays: 7 },
          { title: 'Prepare cost estimation', titleAr: 'إعداد تقدير التكاليف', assigneeRole: 'ACCOUNTANT', priority: 'high', estimatedDays: 5 },
          { title: 'Evaluate site constraints', titleAr: 'تقييم قيود الموقع', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 5 },
          { title: 'Prepare feasibility report', titleAr: 'إعداد تقرير الجدوى', assigneeRole: 'MANAGER', priority: 'urgent', estimatedDays: 3 },
        ],
      },
      {
        name: 'Concept Design',
        nameAr: 'التصميم المفاهيمي',
        order: 2,
        tasks: [
          { title: 'Develop massing and layout options', titleAr: 'تطوير خيارات الحجم والتخطيط', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 10 },
          { title: 'Create structural concept', titleAr: 'إنشاء المفهوم الإنشائي', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 7 },
          { title: 'Prepare MEP concept design', titleAr: 'إعداد تصميم MEP المفاهيمي', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 5 },
          { title: 'Client presentation and approval', titleAr: 'عرض العميل والاعتماد', assigneeRole: 'MANAGER', priority: 'urgent', estimatedDays: 3 },
        ],
      },
      {
        name: 'Detailed Design',
        nameAr: 'التصميم التفصيلي',
        order: 3,
        tasks: [
          { title: 'Architectural detailed drawings', titleAr: 'الرسومات المعمارية التفصيلية', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 21 },
          { title: 'Structural engineering design', titleAr: 'التصميم الهندسي الإنشائي', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 15 },
          { title: 'MEP detailed design (Electrical)', titleAr: 'تصميم MEP تفصيلي (كهرباء)', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 10 },
          { title: 'MEP detailed design (HVAC)', titleAr: 'تصميم MEP تفصيلي (تكييف)', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 10 },
          { title: 'MEP detailed design (Plumbing & Fire)', titleAr: 'تصميم MEP تفصيلي (سباكة وإطفاء)', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 7 },
        ],
      },
      {
        name: 'Municipality Approval',
        nameAr: 'اعتماد البلدية',
        order: 4,
        tasks: [
          { title: 'Submit initial building permit', titleAr: 'تقديم طلب رخصة البناء المبدئي', assigneeRole: 'SECRETARY', priority: 'urgent', estimatedDays: 3 },
          { title: 'Address architectural review comments', titleAr: 'معالجة ملاحظات المراجعة المعمارية', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 10 },
          { title: 'Obtain Civil Defense approval', titleAr: 'الحصول على موافقة الدفاع المدني', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 14 },
          { title: 'Obtain final building permit', titleAr: 'الحصول على رخصة البناء النهائية', assigneeRole: 'SECRETARY', priority: 'urgent', estimatedDays: 5 },
        ],
      },
      {
        name: 'Supervision',
        nameAr: 'الإشراف',
        order: 5,
        tasks: [
          { title: 'Establish site supervision plan', titleAr: 'وضع خطة الإشراف على الموقع', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 3 },
          { title: 'Monitor construction progress', titleAr: 'متابعة تقدم البناء', assigneeRole: 'ENGINEER', priority: 'medium', estimatedDays: 90 },
          { title: 'Quality assurance inspections', titleAr: 'معاينات ضمان الجودة', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 60 },
          { title: 'Final completion certificate', titleAr: 'شهادة الإنجاز النهائية', assigneeRole: 'ENGINEER', priority: 'urgent', estimatedDays: 5 },
        ],
      },
    ],
  },

  // ─── School Building ───
  {
    name: 'School Building',
    nameAr: 'مدرسة',
    description: 'Educational facility template with focus on civil defense requirements, accessibility standards, and municipality approvals.',
    descriptionAr: 'قالب منشأة تعليمية مع التركيز على متطلبات الدفاع المدني ومعايير إمكانية الوصول واعتمادات البلدية.',
    category: 'EDUCATIONAL',
    icon: '🏫',
    defaultBudget: 350000,
    defaultDurationDays: 270,
    currency: 'AED',
    stages: [
      {
        name: 'Site Survey & Analysis',
        nameAr: 'مسح وتحليل الموقع',
        order: 1,
        tasks: [
          { title: 'Topographic and geotechnical survey', titleAr: 'المسح الطبوغرافي والجيوتقني', assigneeRole: 'DRAFTSMAN', priority: 'high', estimatedDays: 5 },
          { title: 'Traffic and accessibility study', titleAr: 'دراسة الحركة وإمكانية الوصول', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 7 },
          { title: 'Environmental impact assessment', titleAr: 'تقييم الأثر البيئي', assigneeRole: 'ENGINEER', priority: 'medium', estimatedDays: 10 },
        ],
      },
      {
        name: 'Concept Design',
        nameAr: 'التصميم المفاهيمي',
        order: 2,
        tasks: [
          { title: 'Develop educational space layout', titleAr: 'تطوير تخطيط المساحات التعليمية', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 10 },
          { title: 'Design circulation and safety zones', titleAr: 'تصميم مناطق الحركة والسلامة', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 7 },
          { title: 'Client approval of concept', titleAr: 'اعتماد العميل للمفهوم', assigneeRole: 'MANAGER', priority: 'urgent', estimatedDays: 5 },
        ],
      },
      {
        name: 'Detailed Design',
        nameAr: 'التصميم التفصيلي',
        order: 3,
        tasks: [
          { title: 'Architectural detailed drawings', titleAr: 'الرسومات المعمارية التفصيلية', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 14 },
          { title: 'Structural design and calculations', titleAr: 'التصميم الإنشائي والحسابات', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 12 },
          { title: 'MEP design (Electrical & HVAC)', titleAr: 'تصميم MEP (كهرباء وتكييف)', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 10 },
          { title: 'Fire safety and civil defense design', titleAr: 'تصميم السلامة من الحرائق والدفاع المدني', assigneeRole: 'ENGINEER', priority: 'urgent', estimatedDays: 7 },
          { title: 'Accessibility compliance review', titleAr: 'مراجعة الامتثال لإمكانية الوصول', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 5 },
        ],
      },
      {
        name: 'Municipality & Civil Defense Approval',
        nameAr: 'اعتماد البلدية والدفاع المدني',
        order: 4,
        tasks: [
          { title: 'Submit building permit application', titleAr: 'تقديم طلب رخصة البناء', assigneeRole: 'SECRETARY', priority: 'urgent', estimatedDays: 3 },
          { title: 'Obtain Civil Defense approval (critical)', titleAr: 'الحصول على موافقة الدفاع المدني (حرج)', assigneeRole: 'ENGINEER', priority: 'urgent', estimatedDays: 21 },
          { title: 'Obtain municipality building permit', titleAr: 'الحصول على رخصة بناء البلدية', assigneeRole: 'SECRETARY', priority: 'urgent', estimatedDays: 14 },
          { title: 'Obtain educational authority approval', titleAr: 'الحصول على موافقة الجهة التعليمية', assigneeRole: 'MANAGER', priority: 'high', estimatedDays: 10 },
        ],
      },
      {
        name: 'Supervision & Handover',
        nameAr: 'الإشراف والتسليم',
        order: 5,
        tasks: [
          { title: 'Establish supervision and safety plan', titleAr: 'وضع خطة الإشراف والسلامة', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 3 },
          { title: 'Regular site inspections', titleAr: 'المعاينات الدورية للموقع', assigneeRole: 'ENGINEER', priority: 'medium', estimatedDays: 60 },
          { title: 'Civil Defense final inspection', titleAr: 'المعاينة النهائية للدفاع المدني', assigneeRole: 'ENGINEER', priority: 'urgent', estimatedDays: 5 },
          { title: 'Final completion and handover', titleAr: 'الإنجاز النهائي والتسليم', assigneeRole: 'MANAGER', priority: 'high', estimatedDays: 5 },
        ],
      },
    ],
  },

  // ─── Industrial Building ───
  {
    name: 'Industrial Building',
    nameAr: 'مبنى صناعي',
    description: 'Industrial facility template with FEWA focus, heavy load structural design, and specialized MEP systems.',
    descriptionAr: 'قالب منشأة صناعية مع التركيز على هيئة الكهرباء والماء والتصميم الإنشائي للأحمال الثقيلة وأنظمة MEP المتخصصة.',
    category: 'INDUSTRIAL',
    icon: '🏭',
    defaultBudget: 250000,
    defaultDurationDays: 240,
    currency: 'AED',
    stages: [
      {
        name: 'Site Survey & Feasibility',
        nameAr: 'مسح الموقع والجدوى',
        order: 1,
        tasks: [
          { title: 'Conduct site survey and soil testing', titleAr: 'إجراء مسح الموقع واختبار التربة', assigneeRole: 'DRAFTSMAN', priority: 'high', estimatedDays: 5 },
          { title: 'Assess industrial zone requirements', titleAr: 'تقييم متطلبات المنطقة الصناعية', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 5 },
          { title: 'FEWA connection feasibility', titleAr: 'جدوى توصيل هيئة الكهرباء والماء', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 7 },
          { title: 'Prepare feasibility report', titleAr: 'إعداد تقرير الجدوى', assigneeRole: 'MANAGER', priority: 'medium', estimatedDays: 3 },
        ],
      },
      {
        name: 'Concept Design',
        nameAr: 'التصميم المفاهيمي',
        order: 2,
        tasks: [
          { title: 'Develop industrial layout concept', titleAr: 'تطوير مفهوم التخطيط الصناعي', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 7 },
          { title: 'Design heavy load structural concept', titleAr: 'تصميم المفهوم الإنشائي للأحمال الثقيلة', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 5 },
          { title: 'MEP concept (power-heavy)', titleAr: 'مفهوم MEP (طاقة عالية)', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 5 },
        ],
      },
      {
        name: 'Detailed Design',
        nameAr: 'التصميم التفصيلي',
        order: 3,
        tasks: [
          { title: 'Architectural and structural drawings', titleAr: 'الرسومات المعمارية والإنشائية', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 14 },
          { title: 'High-power electrical design', titleAr: 'تصميم الكهرباء عالية الطاقة', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 10 },
          { title: 'Industrial plumbing and drainage', titleAr: 'السباكة والصرف الصناعي', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 7 },
          { title: 'Fire suppression system design', titleAr: 'تصميم نظام الإطفاء', assigneeRole: 'ENGINEER', priority: 'urgent', estimatedDays: 7 },
          { title: 'HVAC for industrial spaces', titleAr: 'التكييف للمساحات الصناعية', assigneeRole: 'ENGINEER', priority: 'medium', estimatedDays: 5 },
        ],
      },
      {
        name: 'FEWA & Municipality Approval',
        nameAr: 'اعتماد هيئة الكهرباء والبلدية',
        order: 4,
        tasks: [
          { title: 'Submit FEWA connection application', titleAr: 'تقديم طلب توصيل هيئة الكهرباء', assigneeRole: 'SECRETARY', priority: 'urgent', estimatedDays: 3 },
          { title: 'FEWA technical review and approval', titleAr: 'المراجعة الفنية والموافقة من هيئة الكهرباء', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 14 },
          { title: 'Submit building permit application', titleAr: 'تقديم طلب رخصة البناء', assigneeRole: 'SECRETARY', priority: 'urgent', estimatedDays: 3 },
          { title: 'Obtain Civil Defense approval', titleAr: 'الحصول على موافقة الدفاع المدني', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 14 },
          { title: 'Obtain building permit', titleAr: 'الحصول على رخصة البناء', assigneeRole: 'SECRETARY', priority: 'urgent', estimatedDays: 7 },
        ],
      },
      {
        name: 'Supervision & Commissioning',
        nameAr: 'الإشراف والتشغيل',
        order: 5,
        tasks: [
          { title: 'Construction supervision plan', titleAr: 'خطة الإشراف على البناء', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 3 },
          { title: 'Monitor construction quality', titleAr: 'مراقبة جودة البناء', assigneeRole: 'ENGINEER', priority: 'medium', estimatedDays: 45 },
          { title: 'FEWA connection and testing', titleAr: 'توصيل واختبار هيئة الكهرباء', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 10 },
          { title: 'Systems commissioning', titleAr: 'تشغيل الأنظمة واختبارها', assigneeRole: 'ENGINEER', priority: 'high', estimatedDays: 7 },
          { title: 'Final inspection and handover', titleAr: 'المعاينة النهائية والتسليم', assigneeRole: 'MANAGER', priority: 'urgent', estimatedDays: 3 },
        ],
      },
    ],
  },
];

// ==================== Seed Function ====================

/**
 * Seed project templates into the database.
 * Creates templates only if they don't already exist (by name).
 */
export async function seedProjectTemplates(createdById: string, organizationId?: string): Promise<number> {
  let created = 0;

  for (const tpl of PROJECT_TEMPLATES) {
    // Check if template already exists
    const existing = await db.projectTemplate.findFirst({
      where: { name: tpl.name, organizationId: organizationId || null },
    });

    if (existing) continue;

    await db.projectTemplate.create({
      data: {
        name: tpl.name,
        nameAr: tpl.nameAr,
        description: tpl.description,
        descriptionAr: tpl.descriptionAr,
        category: tpl.category,
        icon: tpl.icon,
        defaultBudget: tpl.defaultBudget,
        defaultDurationDays: tpl.defaultDurationDays,
        currency: tpl.currency,
        stages: JSON.stringify(tpl.stages),
        isActive: true,
        usageCount: 0,
        createdById,
        organizationId: organizationId || null,
      },
    });

    created++;
  }

  return created;
}
