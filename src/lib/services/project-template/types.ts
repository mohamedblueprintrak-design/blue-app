// @ts-check
/**
 * Project Template Types
 * أنواع قوالب المشاريع
 * 
 * Type definitions for the project template service.
 */

import { db } from '@/lib/db';

// Extended database client type for models not yet in the Prisma schema
interface TemplateTaskRecord {
  taskName: string;
  taskNameAr: string | undefined;
  description: string | undefined;
  descriptionAr: string | undefined;
  slaDays: number;
  slaWarningDays: number | undefined;
  estimatedMinutes: number | undefined;
  order: number;
  dependencies: string | undefined;
  governmentEntity: string | undefined;
  governmentEntityAr: string | undefined;
  isMandatory: boolean;
  color: string | undefined;
}

interface ProjectTemplateRecord {
  id: string;
  name: string;
  nameAr: string;
  code: string;
  description: string;
  descriptionAr: string;
  category: string;
  estimatedDays: number;
  tasks: TemplateTaskRecord[];
}

type ExtendedPrismaClient = typeof db & {
  projectTemplate: {
    findUnique: (args: { where: { code: string }; include?: Record<string, unknown> }) => Promise<ProjectTemplateRecord | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<ProjectTemplateRecord>;
    findMany: (args: { where?: Record<string, unknown>; include?: Record<string, unknown>; orderBy?: Record<string, string> }) => Promise<Array<ProjectTemplateRecord>>;
  };
};

export interface CreateProjectFromTemplateInput {
  projectId: string;
  templateCode: string;
  customStartDate?: Date;
  assignedToId?: string;
}

export interface TemplateTaskData {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  slaDays: number;
  slaWarningDays?: number;
  estimatedMinutes?: number;
  order: number;
  governmentEntity?: string;
  governmentEntityAr?: string;
  dependencies?: number[];
  color?: string;
}

export interface WorkflowPhaseTemplateData {
  phaseType: string;
  phaseTypeAr?: string;
  phaseCategory: string;
  description?: string;
  descriptionAr?: string;
  slaDays: number;
  slaWarningDays?: number;
  order: number;
  dependsOnOrder?: number;
  color?: string;
}

export { db };
export type { ExtendedPrismaClient, TemplateTaskRecord, ProjectTemplateRecord };
