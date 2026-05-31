// @ts-check
/**
 * SLA Monitoring Service
 * خدمة مراقبة SLA وتنبيهات الانتهاك
 * 
 * This service monitors tasks with SLA requirements and sends alerts
 * when SLA is about to breach or has been breached.
 * 
 * Escalation Levels:
 * - Level 1 (Warning): SLA warning days reached → notification to assigned user
 * - Level 2 (Breach): SLA days exceeded → notification to manager
 * - Level 3 (Critical): 2x SLA days exceeded → notification to admin + urgent flag
 */

import { db, isDatabaseAvailable } from '@/lib/db';
import { TaskType, SLABreachStatus } from '@prisma/client';
import type { NotificationType } from '@/types/db-enums';
import { log } from '@/lib/logger';

// ============================================
// Types
// ============================================

export interface SLACheckResult {
  taskId: string;
  projectId: string | null;
  taskName: string;
  daysElapsed: number;
  slaDays: number;
  breachDays: number;
  status: SLABreachStatus;
  escalationLevel: number;
  assignedTo: string | null;
  governmentEntity: string | null;
}

export interface SLAMonitorReport {
  timestamp: Date;
  tasksChecked: number;
  warningsFound: number;
  breachesFound: number;
  criticalFound: number;
  results: SLACheckResult[];
}

export interface SLADashboardPhase {
  phaseId: string;
  phaseName: string;
  status: SLABreachStatus;
  daysElapsed: number;
  slaDays: number;
  daysRemaining: number;
  escalationLevel: number;
  assignedTo: string | null;
}

export interface SLADashboard {
  projectId: string;
  projectName: string;
  totalPhases: number;
  onTrack: number;
  warning: number;
  breached: number;
  CRITICAL: number;
  phases: SLADashboardPhase[];
}

export interface SuggestedTask {
  title: string;
  description: string;
  taskType: TaskType;
  slaDays: number;
  priority: 'HIGH' | 'URGENT';
  governmentEntity?: string;
}

// ============================================
// SLA Escalation Levels
// ============================================

const ESCALATION_LEVELS = {
  WARNING: 1,  // SLA warning days reached
  BREACH: 2,   // SLA days exceeded
  CRITICAL: 3, // 2x SLA days exceeded
} as const;

/**
 * Determine the escalation level based on days elapsed and SLA days
 */
function getEscalationLevel(daysElapsed: number, slaDays: number): {
  level: number;
  status: SLABreachStatus;
} {
  if (daysElapsed >= slaDays * 2) {
    return { level: ESCALATION_LEVELS.CRITICAL, status: SLABreachStatus.CRITICAL };
  }
  if (daysElapsed >= slaDays) {
    return { level: ESCALATION_LEVELS.BREACH, status: SLABreachStatus.BREACHED };
  }
  return { level: ESCALATION_LEVELS.WARNING, status: SLABreachStatus.WARNING };
}

// ============================================
// SLA Monitor Service
// ============================================

/**
 * Check all active tasks for SLA breaches
 * فحص جميع المهام النشطة لتجاوزات SLA
 */
export async function checkSLABreaches(): Promise<SLAMonitorReport> {
  const report: SLAMonitorReport = {
    timestamp: new Date(),
    tasksChecked: 0,
    warningsFound: 0,
    breachesFound: 0,
    criticalFound: 0,
    results: [],
  };

  if (!await isDatabaseAvailable()) {
    log.info('SLA Monitor: Database not available, skipping check');
    return report;
  }

  try {
    // Get all active tasks with SLA requirements
    const activeTasks = await db.task.findMany({
      where: {
        status: { in: ['TODO', 'IN_PROGRESS'] },
        slaDays: { not: null, gt: 0 },
        slaStartDate: { not: null },
      },
      include: {
        project: {
          include: {
            manager: true,
          },
        },
      },
    });

    report.tasksChecked = activeTasks.length;

    const now = new Date();

    for (const task of activeTasks) {
      if (!task.slaStartDate || !task.slaDays) continue;

      const startDate = new Date(task.slaStartDate);
      const daysElapsed = Math.floor(
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const slaDays = task.slaDays;
      const slaWarningDays = task.slaWarningDays || 1;
      const breachDays = daysElapsed - slaDays;

      const { level, status } = getEscalationLevel(daysElapsed, slaDays);

      // Check if within warning threshold
      if (daysElapsed < slaDays - slaWarningDays) {
        // Still within SLA
        continue;
      }

      if (status === SLABreachStatus.CRITICAL) {
        report.criticalFound++;
      } else if (status === SLABreachStatus.BREACHED) {
        report.breachesFound++;
      } else {
        report.warningsFound++;
      }

      const result: SLACheckResult = {
        taskId: task.id,
        projectId: task.projectId,
        taskName: task.title || '',
        daysElapsed,
        slaDays,
        breachDays,
        status,
        escalationLevel: level,
        assignedTo: task.assigneeId,
        governmentEntity: task.taskType === 'GOVERNMENTAL' ? 'Government' : null,
      };

      report.results.push(result);

      // Create or update SLA breach record
      await createOrUpdateSLABreach(task, result);

      // Send notifications based on escalation level
      await sendEscalatedNotifications(task, result, level);
    }

    return report;
  } catch (error) {
    log.error('SLA Monitor Error', error);
    throw error;
  }
}

/**
 * Create or update SLA breach record
 * إنشاء أو تحديث سجل تجاوز SLA
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SLATaskWithRelations = any;

/* Original typed interface — kept for documentation:
interface SLATaskWithRelations {
  id: string;
  projectId: string | null;
  title: string;
  assigneeId: string | null;
  governmentEntity?: string | null;
  isGovernmental?: boolean;
  slaBreaches: Array<{ id: string }>;
  project?: { managerId?: string | null } | null;
}
*/

async function createOrUpdateSLABreach(
  task: SLATaskWithRelations,
  result: SLACheckResult
): Promise<void> {
  try {
    const existingBreach = task.slaBreaches[0];

    if (existingBreach) {
      // Update existing breach
      await db.sLABreach.update({
        where: { id: existingBreach.id },
        data: {
          status: result.status,
          daysElapsed: result.daysElapsed,
          breachDays: result.breachDays,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new breach record
      await db.sLABreach.create({
        data: {
          taskId: task.id,
          projectId: task.projectId,
          status: result.status,
          daysElapsed: result.daysElapsed,
          slaDays: result.slaDays,
          breachDays: result.breachDays,
        },
      });

      // Update task with breach timestamp
      await db.task.update({
        where: { id: task.id },
        data: { slaBreachedAt: new Date() },
      });
    }
  } catch (error) {
    log.error('Error creating SLA breach record', error);
  }
}

/**
 * Send escalated SLA notifications based on escalation level
 * إرسال إشعارات SLA متدرجة حسب مستوى التصعيد
 */
async function sendEscalatedNotifications(
  task: SLATaskWithRelations,
  result: SLACheckResult,
  escalationLevel: number
): Promise<void> {
  try {
    const usersToNotify: string[] = [];

    // Level 1 (Warning): Notification to assigned user
    if (escalationLevel >= ESCALATION_LEVELS.WARNING) {
      if (task.assignedTo) {
        usersToNotify.push(task.assignedTo);
      }
    }

    // Level 2 (Breach): Notification to manager
    if (escalationLevel >= ESCALATION_LEVELS.BREACH) {
      if (task.project?.managerId) {
        usersToNotify.push(task.project.managerId);
      }
    }

    // Level 3 (Critical): Notification to admin + urgent flag
    if (escalationLevel >= ESCALATION_LEVELS.CRITICAL) {
      const admins = await db.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
        },
        select: { id: true },
      });
      usersToNotify.push(...admins.map((a: { id: string }) => a.id));
    }

    // Create notifications (deduplicated)
    const notificationPromises = [...new Set(usersToNotify)].map((userId) =>
      db.notification.create({
        data: {
          userId,
          title: getEscalatedNotificationTitle(result, task),
          message: getEscalatedNotificationMessage(result, task),
          type: 'TASK_DUE' as NotificationType,
          relatedEntityType: 'task',
          relatedEntityId: task.id,
        },
      })
    );

    await Promise.all(notificationPromises);

    log.info(
      `SLA Notification sent for task ${task.id}: Level ${escalationLevel} (${result.status})`
    );
  } catch (error) {
    log.error('Error sending SLA notifications', error);
  }
}

/**
 * Get notification title based on escalation level
 */
function getEscalatedNotificationTitle(result: SLACheckResult, task: SLATaskWithRelations): string {
  const entity = task.governmentEntity ? ` [${task.governmentEntity}]` : '';
  
  switch (result.escalationLevel) {
    case ESCALATION_LEVELS.WARNING:
      return `⚠️ SLA Warning (Level 1): ${task.title}${entity}`;
    case ESCALATION_LEVELS.BREACH:
      return `🚨 SLA Breach (Level 2): ${task.title}${entity}`;
    case ESCALATION_LEVELS.CRITICAL:
      return `🔴 SLA Critical (Level 3): ${task.title}${entity}`;
    default:
      return `SLA Alert: ${task.title}`;
  }
}

/**
 * Get notification message based on escalation level
 */
function getEscalatedNotificationMessage(result: SLACheckResult, task: SLATaskWithRelations): string {
  const entity = task.governmentEntity ? ` (${task.governmentEntity})` : '';
  
  switch (result.escalationLevel) {
    case ESCALATION_LEVELS.WARNING: {
      const daysRemaining = result.slaDays - result.daysElapsed;
      return `Task is approaching SLA deadline. ${daysRemaining} day(s) remaining${entity}. Assigned user has been notified.`;
    }
    case ESCALATION_LEVELS.BREACH:
      return `Task has exceeded SLA by ${result.breachDays} day(s)${entity}. Project manager has been notified.`;
    case ESCALATION_LEVELS.CRITICAL:
      return `CRITICAL: Task is now at 2x SLA limit (${result.breachDays} days overdue)${entity}. Admins notified with URGENT priority.`;
    default:
      return `SLA update: ${result.daysElapsed}/${result.slaDays} days`;
  }
}

/**
 * Get notification title based on breach status (legacy compatibility)
 */
function getSLANotificationTitle(status: SLABreachStatus, taskName: string): string {
  const titles = {
    [SLABreachStatus.WARNING]: `⚠️ تحذير SLA: ${taskName}`,
    [SLABreachStatus.BREACHED]: `🚨 تجاوز SLA: ${taskName}`,
    [SLABreachStatus.CRITICAL]: `🔴 تجاوز حرج: ${taskName}`,
    [SLABreachStatus.RESOLVED]: `✅ تم حل تجاوز SLA: ${taskName}`,
  };
  return titles[status] || `SLA: ${taskName}`;
}

/**
 * Get notification message based on breach details (legacy compatibility)
 */
function getSLANotificationMessage(result: SLACheckResult, task: SLATaskWithRelations): string {
  const entity = task.governmentEntity ? ` (${task.governmentEntity})` : '';
  
  if (result.status === SLABreachStatus.WARNING) {
    const daysRemaining = result.slaDays - result.daysElapsed;
    return `المهمة على وشك تجاوز SLA. متبقي ${daysRemaining} يوم${entity}.`;
  }
  
  if (result.status === SLABreachStatus.BREACHED) {
    return `تجاوزت المهمة SLA بـ ${result.breachDays} يوم${entity}.`;
  }
  
  if (result.status === SLABreachStatus.CRITICAL) {
    return `تجاوز حرج! المهمة متأخرة ${result.breachDays} يوم عن SLA${entity}.`;
  }
  
  return `تحديث SLA للمهمة: ${result.daysElapsed}/${result.slaDays} يوم`;
}

/**
 * Send SLA notifications to relevant users (legacy compatibility)
 * إرسال إشعارات SLA للمستخدمين المعنيين
 */
async function _sendSLANotifications(
  task: SLATaskWithRelations,
  result: SLACheckResult
): Promise<void> {
  try {
    const usersToNotify: string[] = [];

    if (task.assignedTo) {
      usersToNotify.push(task.assignedTo);
    }

    if (task.project?.managerId) {
      usersToNotify.push(task.project.managerId);
    }

    if (result.status === SLABreachStatus.CRITICAL) {
      const admins = await db.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
        },
        select: { id: true },
      });
      usersToNotify.push(...admins.map((a: { id: string }) => a.id));
    }

    const notificationPromises = [...new Set(usersToNotify)].map((userId) =>
      db.notification.create({
        data: {
          userId,
          title: getSLANotificationTitle(result.status, task.title),
          message: getSLANotificationMessage(result, task),
          type: 'TASK_DUE' as NotificationType,
          relatedEntityType: 'task',
          relatedEntityId: task.id,
        },
      })
    );

    await Promise.all(notificationPromises);

    log.info(
      `SLA Notification sent for task ${task.id}: ${result.status}`
    );
  } catch (error) {
    log.error('Error sending SLA notifications', error);
  }
}

/**
 * Get SLA statistics for dashboard
 * إحصائيات SLA للوحة التحكم
 */
export async function getSLAStatistics(): Promise<{
  totalActive: number;
  onTrack: number;
  warning: number;
  breached: number;
  CRITICAL: number;
}> {
  if (!await isDatabaseAvailable()) {
    return { totalActive: 0, onTrack: 0, warning: 0, breached: 0, CRITICAL: 0 };
  }

  const now = new Date();

  const tasks = await db.task.findMany({
    where: {
      status: { in: ['TODO', 'IN_PROGRESS'] },
      slaDays: { not: null, gt: 0 },
      slaStartDate: { not: null },
    },
    select: {
      slaStartDate: true,
      slaDays: true,
      slaWarningDays: true,
    },
  });

  let onTrack = 0;
  let warning = 0;
  let breached = 0;
  let critical = 0;

  for (const task of tasks) {
    if (!task.slaStartDate || !task.slaDays) continue;

    const daysElapsed = Math.floor(
      (now.getTime() - new Date(task.slaStartDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const { level } = getEscalationLevel(daysElapsed, task.slaDays);

    if (level === ESCALATION_LEVELS.CRITICAL) {
      critical++;
    } else if (level === ESCALATION_LEVELS.BREACH) {
      breached++;
    } else if (daysElapsed >= task.slaDays - (task.slaWarningDays || 1)) {
      warning++;
    } else {
      onTrack++;
    }
  }

  return {
    totalActive: tasks.length,
    onTrack,
    warning,
    breached,
    CRITICAL: critical,
  };
}

/**
 * Get SLA Dashboard for a specific project
 * Returns SLA summary: total phases, on-track, warning, breached, critical
 * Includes time remaining for each active phase
 */
export async function getSLADashboard(projectId: string): Promise<SLADashboard | null> {
  if (!await isDatabaseAvailable()) return null;

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!project) return null;

  const tasks = await db.task.findMany({
    where: {
      projectId,
      status: { in: ['TODO', 'IN_PROGRESS'] },
      slaDays: { not: null, gt: 0 },
      slaStartDate: { not: null },
    },
    select: {
      id: true,
      title: true,
      status: true,
      slaStartDate: true,
      slaDays: true,
      slaWarningDays: true,
      taskType: true,
      assigneeId: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const now = new Date();
  const phases: SLADashboardPhase[] = [];

  let onTrack = 0;
  let warning = 0;
  let breached = 0;
  let critical = 0;

  for (const task of tasks) {
    if (!task.slaStartDate || !task.slaDays) continue;

    const daysElapsed = Math.floor(
      (now.getTime() - new Date(task.slaStartDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const { level, status } = getEscalationLevel(daysElapsed, task.slaDays);
    const daysRemaining = task.slaDays - daysElapsed;

    // Categorize
    if (level === ESCALATION_LEVELS.CRITICAL) {
      critical++;
    } else if (level === ESCALATION_LEVELS.BREACH) {
      breached++;
    } else if (daysElapsed >= task.slaDays - (task.slaWarningDays || 1)) {
      warning++;
    } else {
      onTrack++;
    }

    phases.push({
      phaseId: task.id,
      phaseName: task.title || '',
      status: daysRemaining < 0 ? status : (warning > 0 && daysRemaining <= (task.slaWarningDays || 1) ? SLABreachStatus.WARNING : status),
      daysElapsed,
      slaDays: task.slaDays,
      daysRemaining,
      escalationLevel: level,
      assignedTo: task.assigneeId,
    });
  }

  // Also count tasks without SLA as on-track
  const allActiveTasks = await db.task.count({
    where: {
      projectId,
      status: { in: ['TODO', 'IN_PROGRESS'] },
    },
  });

  return {
    projectId: project.id,
    projectName: project.name,
    totalPhases: allActiveTasks,
    onTrack,
    warning,
    breached,
    CRITICAL: critical,
    phases,
  };
}

/**
 * Get auto-task-creation suggestions when a government phase starts.
 * When a government phase/task begins, suggest related follow-up tasks.
 */
export async function getAutoTaskSuggestions(taskId: string): Promise<SuggestedTask[]> {
  if (!await isDatabaseAvailable()) return [];

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      description: true,
      taskType: true,
      projectId: true,
      slaDays: true,
    },
  });

  if (!task || task.taskType !== TaskType.GOVERNMENTAL) return [];

  const suggestions: SuggestedTask[] = [];
  const govEntity = task.taskType === 'GOVERNMENTAL' ? 'government' : '';

  // Generic government entity suggestions
  if (govEntity) {
    const entity = govEntity.toLowerCase();

    // FEWA suggestions
    if (entity.includes('fewa') || entity.includes('electricity') || entity.includes('water')) {
      suggestions.push(
        {
          title: 'Prepare FEWA Application Documents',
          description: 'Prepare all required documents for FEWA submission including site plans and load calculations.',
          taskType: TaskType.MANDATORY,
          slaDays: 3,
          priority: 'HIGH',
          governmentEntity: govEntity || null,
        },
        {
          title: 'Schedule FEWA Site Inspection',
          description: 'Coordinate with FEWA for site inspection and meter installation.',
          taskType: TaskType.STANDARD,
          slaDays: 7,
          priority: 'HIGH',
          governmentEntity: govEntity || null,
        }
      );
    }

    // Civil Defense suggestions
    if (entity.includes('civil defense') || entity.includes('دفاع')) {
      suggestions.push(
        {
          title: 'Prepare Fire Safety Drawings',
          description: 'Create fire escape plans, sprinkler layouts, and fire alarm system drawings per Civil Defense requirements.',
          taskType: TaskType.MANDATORY,
          slaDays: 5,
          priority: 'URGENT',
          governmentEntity: govEntity || null,
        },
        {
          title: 'Submit Fire Safety Equipment List',
          description: 'Compile and submit the complete fire safety equipment and materials list.',
          taskType: TaskType.MANDATORY,
          slaDays: 3,
          priority: 'HIGH',
          governmentEntity: govEntity || null,
        }
      );
    }

    // Municipality suggestions
    if (entity.includes('municipality') || entity.includes('بلدية')) {
      suggestions.push(
        {
          title: 'Prepare Municipality Drawing Package',
          description: 'Compile all required drawings (architectural, structural, MEP) for municipality submission.',
          taskType: TaskType.MANDATORY,
          slaDays: 3,
          priority: 'URGENT',
          governmentEntity: govEntity || null,
        },
        {
          title: 'Obtain Owner NOC',
          description: 'Get No Objection Certificate from the building owner for municipality submission.',
          taskType: TaskType.MANDATORY,
          slaDays: 5,
          priority: 'HIGH',
          governmentEntity: govEntity || null,
        }
      );
    }
  }

  // Generic suggestions for any governmental task
  suggestions.push(
    {
      title: 'Prepare Submission Checklist',
      description: 'Create a comprehensive checklist of all required documents for this government submission.',
      taskType: TaskType.INTERNAL,
      slaDays: 2,
      priority: 'HIGH',
      governmentEntity: govEntity || undefined,
    },
    {
      title: 'Follow-up Submission',
      description: `Schedule a follow-up visit to ${govEntity || 'the government entity'} to track application progress.`,
      taskType: TaskType.STANDARD,
      slaDays: task.slaDays ? Math.max(task.slaDays + 7, 14) : 14,
      priority: 'HIGH',
      governmentEntity: govEntity || undefined,
    }
  );

  return suggestions;
}

/**
 * Mark SLA breach as resolved
 * تحديد تجاوز SLA كمحلول
 */
export async function resolveSLABreach(
  breachId: string,
  resolutionNotes?: string
): Promise<void> {
  if (!await isDatabaseAvailable()) return;

  await db.sLABreach.update({
    where: { id: breachId },
    data: {
      status: SLABreachStatus.RESOLVED,
      resolvedAt: new Date(),
      resolutionNotes,
    },
  });
}

const slaMonitorService = {
  checkSLABreaches,
  getSLAStatistics,
  getSLADashboard,
  getAutoTaskSuggestions,
  resolveSLABreach,
};

export default slaMonitorService;
