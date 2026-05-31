/**
 * Custom TypeScript Union Types replacing database enums.
 * SQLite maps these fields as Strings, so Prisma does not export native enums for them.
 */

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED';
export type ProjectType = 'VILLA' | 'BUILDING' | 'COMMERCIAL' | 'INDUSTRIAL';
export type NotificationType = 'PROJECT_UPDATE' | 'TASK_DUE' | 'INVOICE_OVERDUE' | 'APPROVAL_NEEDED' | 'SYSTEM_ALERT' | 'SLA_BREACH';
export type WorkflowStepSeverity = 'NORMAL' | 'HIGH' | 'CRITICAL';
export type TransmittalStatus = 'SENT' | 'RECEIVED' | 'REJECTED' | 'APPROVED' | 'DRAFT';
export type Currency = 'AED' | 'USD' | 'EUR' | 'GBP';
export type WeatherCondition = 'SUNNY' | 'CLOUDY' | 'RAINY' | 'WINDY' | 'DUSTY' | 'HOT' | 'HUMID';
export type Municipality = 'RAS_AL_KHAIMAH' | 'DUBAI' | 'ABU_DHABI' | 'SHARJAH' | 'AJMAN' | 'UMM_AL_QUWAIN' | 'FUJAIRAH' | 'ras_al_khaimah' | 'dubai' | 'abu_dhabi' | 'sharjah' | 'ajman' | 'umm_al_quwain' | 'fujairah';
