// @ts-check
/**
 * Predefined Templates
 * القوالب المحددة مسبقاً
 * 
 * Predefined project templates for UAE/Gulf Region government approval workflows.
 * These are pure data — no DB dependencies.
 */

import { type TemplateTaskData } from './types';

// ============================================
// Predefined Templates for UAE/Gulf Region
// قوالب محددة مسبقاً لدولة الإمارات والخليج
// ============================================

export const PREDEFINED_TEMPLATES: Record<string, TemplateTaskData[]> = {
  // هيئة كهرباء ومياه - FEWA
  FEWA: [
    {
      name: 'Prepare FEWA Application Documents',
      nameAr: 'إعداد مستندات طلب هيئة الكهرباء',
      slaDays: 3,
      order: 1,
      estimatedMinutes: 480,
      color: '#3B82F6',
    },
    {
      name: 'Submit Application to FEWA',
      nameAr: 'تقديم الطلب لهيئة الكهرباء',
      slaDays: 7,
      order: 2,
      dependencies: [1],
      governmentEntity: 'FEWA - Federal Electricity & Water Authority',
      governmentEntityAr: 'هيئة الكهرباء والماء',
      color: '#3B82F6',
    },
    {
      name: 'FEWA Technical Review',
      nameAr: 'المراجعة الفنية لهيئة الكهرباء',
      slaDays: 14,
      order: 3,
      dependencies: [2],
      governmentEntity: 'FEWA - Federal Electricity & Water Authority',
      governmentEntityAr: 'هيئة الكهرباء والماء',
      color: '#3B82F6',
    },
    {
      name: 'FEWA Site Inspection',
      nameAr: 'معاينة الموقع من هيئة الكهرباء',
      slaDays: 7,
      order: 4,
      dependencies: [3],
      governmentEntity: 'FEWA - Federal Electricity & Water Authority',
      governmentEntityAr: 'هيئة الكهرباء والماء',
      color: '#3B82F6',
    },
    {
      name: 'Obtain FEWA Approval/Connection',
      nameAr: 'الحصول على موافقة/توصيل هيئة الكهرباء',
      slaDays: 7,
      order: 5,
      dependencies: [4],
      governmentEntity: 'FEWA - Federal Electricity & Water Authority',
      governmentEntityAr: 'هيئة الكهرباء والماء',
      color: '#10B981',
    },
  ],

  // الدفاع المدني - Civil Defense
  CIVIL_DEFENSE: [
    {
      name: 'Prepare Civil Defense Drawings',
      nameAr: 'إعداد رسومات الدفاع المدني',
      slaDays: 5,
      order: 1,
      estimatedMinutes: 960,
      color: '#EF4444',
    },
    {
      name: 'Submit to Civil Defense',
      nameAr: 'تقديم للدفاع المدني',
      slaDays: 7,
      order: 2,
      dependencies: [1],
      governmentEntity: 'Civil Defense',
      governmentEntityAr: 'الدفاع المدني',
      color: '#EF4444',
    },
    {
      name: 'Civil Defense Plan Review',
      nameAr: 'مراجعة المخطط من الدفاع المدني',
      slaDays: 14,
      order: 3,
      dependencies: [2],
      governmentEntity: 'Civil Defense',
      governmentEntityAr: 'الدفاع المدني',
      color: '#EF4444',
    },
    {
      name: 'Civil Defense Site Inspection',
      nameAr: 'معاينة الموقع من الدفاع المدني',
      slaDays: 7,
      order: 4,
      dependencies: [3],
      governmentEntity: 'Civil Defense',
      governmentEntityAr: 'الدفاع المدني',
      color: '#EF4444',
    },
    {
      name: 'Obtain Civil Defense Certificate',
      nameAr: 'الحصول على شهادة الدفاع المدني',
      slaDays: 5,
      order: 5,
      dependencies: [4],
      governmentEntity: 'Civil Defense',
      governmentEntityAr: 'الدفاع المدني',
      color: '#10B981',
    },
  ],

  // البلدية - Municipality
  MUNICIPALITY: [
    {
      name: 'Prepare Municipality Permit Documents',
      nameAr: 'إعداد مستندات تصريح البلدية',
      slaDays: 3,
      order: 1,
      estimatedMinutes: 720,
      color: '#8B5CF6',
    },
    {
      name: 'Submit Building Permit Application',
      nameAr: 'تقديم طلب ترخيص بناء',
      slaDays: 5,
      order: 2,
      dependencies: [1],
      governmentEntity: 'Municipality',
      governmentEntityAr: 'البلدية',
      color: '#8B5CF6',
    },
    {
      name: 'Municipality Technical Review',
      nameAr: 'المراجعة الفنية للبلدية',
      slaDays: 21,
      order: 3,
      dependencies: [2],
      governmentEntity: 'Municipality',
      governmentEntityAr: 'البلدية',
      color: '#8B5CF6',
    },
    {
      name: 'Municipality Committee Approval',
      nameAr: 'موافقة لجنة البلدية',
      slaDays: 14,
      order: 4,
      dependencies: [3],
      governmentEntity: 'Municipality',
      governmentEntityAr: 'البلدية',
      color: '#8B5CF6',
    },
    {
      name: 'Issue Building Permit',
      nameAr: 'إصدار رخصة البناء',
      slaDays: 7,
      order: 5,
      dependencies: [4],
      governmentEntity: 'Municipality',
      governmentEntityAr: 'البلدية',
      color: '#10B981',
    },
  ],

  // اتصالات - Etisalat/Telecom
  TELECOM: [
    {
      name: 'Prepare Telecom Connection Application',
      nameAr: 'إعداد طلب توصيل الاتصالات',
      slaDays: 2,
      order: 1,
      estimatedMinutes: 240,
      color: '#06B6D4',
    },
    {
      name: 'Submit to Telecom Provider',
      nameAr: 'تقديم لمزود الاتصالات',
      slaDays: 5,
      order: 2,
      dependencies: [1],
      governmentEntity: 'Etisalat/Du',
      governmentEntityAr: 'اتصالات/دو',
      color: '#06B6D4',
    },
    {
      name: 'Telecom Technical Survey',
      nameAr: 'المسح الفني للاتصالات',
      slaDays: 7,
      order: 3,
      dependencies: [2],
      governmentEntity: 'Etisalat/Du',
      governmentEntityAr: 'اتصالات/دو',
      color: '#06B6D4',
    },
    {
      name: 'Telecom Installation',
      nameAr: 'تركيب خطوط الاتصالات',
      slaDays: 14,
      order: 4,
      dependencies: [3],
      governmentEntity: 'Etisalat/Du',
      governmentEntityAr: 'اتصالات/دو',
      color: '#06B6D4',
    },
    {
      name: 'Telecom Connection Activation',
      nameAr: 'تفعيل خدمة الاتصالات',
      slaDays: 3,
      order: 5,
      dependencies: [4],
      governmentEntity: 'Etisalat/Du',
      governmentEntityAr: 'اتصالات/دو',
      color: '#10B981',
    },
  ],
};

/**
 * Get template metadata by code
 */
export function getTemplateMetadata(code: string): {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: string;
} {
  const metadata: Record<string, {
    name: string;
    nameAr: string;
    description: string;
    descriptionAr: string;
    category: string;
  }> = {
    FEWA: {
      name: 'FEWA Electricity & Water Connection',
      nameAr: 'توصيل هيئة الكهرباء والماء',
      description: 'Standard workflow for FEWA utility connections',
      descriptionAr: 'سير العمل القياسي لتوصيل هيئة الكهرباء والماء',
      category: 'utility',
    },
    CIVIL_DEFENSE: {
      name: 'Civil Defense Approval',
      nameAr: 'موافقة الدفاع المدني',
      description: 'Fire safety and civil defense approval workflow',
      descriptionAr: 'سير عمل موافقة الدفاع المدني والسلامة',
      category: 'safety',
    },
    MUNICIPALITY: {
      name: 'Municipality Building Permit',
      nameAr: 'رخصة بناء البلدية',
      description: 'Building permit application through municipality',
      descriptionAr: 'طلب ترخيص بناء عبر البلدية',
      category: 'municipality',
    },
    TELECOM: {
      name: 'Telecom Connection',
      nameAr: 'توصيل الاتصالات',
      description: 'Internet and phone line installation workflow',
      descriptionAr: 'سير عمل تركيب خطوط الإنترنت والهاتف',
      category: 'communications',
    },
  };

  return metadata[code] || {
    name: code,
    nameAr: code,
    description: '',
    descriptionAr: '',
    category: 'general',
  };
}
