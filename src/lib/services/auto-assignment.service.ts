/**
 * Auto-Assignment Service
 * خدمة التعيين التلقائي
 *
 * Core service that evaluates auto-assignment rules against new entities.
 * Supports conditions: equals, not_equals, contains, in, starts_with
 * Supports assignment types: direct user, role-based, round-robin within a team
 * Logs all auto-assignments for audit trail.
 *
 * Key behaviours:
 * - Rules are evaluated in priority order (highest first)
 * - First matching rule wins (stop evaluating after first match)
 * - If no rule matches, the entity remains unassigned
 * - Auto-assignments are logged in the activity log
 * - Notifications are sent when tasks are auto-assigned
 */

import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import type { AuthContext } from '@/app/api/utils/auth';
import { notificationService } from '@/lib/services/notification.service';
import { createAuditEntry } from '@/lib/services/audit-helper';

// ============================================
// Types
// ============================================

export type TriggerType = 'task_created' | 'task_status_changed' | 'project_created' | 'document_uploaded';
export type AssignToType = 'user' | 'role' | 'round_robin';
export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'in' | 'starts_with';

export interface AssignmentCondition {
  field: string;
  operator: ConditionOperator;
  value: string | string[];
}

/**
 * Action JSON structure — what to do when conditions match
 */
export interface AssignmentAction {
  assignToId?: string;          // user to assign the task to
  notify?: boolean;             // send notification to assignee
  setPriority?: string;         // optionally override priority
  addTags?: string[];           // optionally add tags
}

export interface AutoAssignmentResult {
  matched: boolean;
  ruleId: string;
  ruleName: string;
  assignToType: AssignToType;
  assignToId: string;
  action: AssignmentAction;
  assignedUserId?: string;
  reason: string;
}

// Round-robin state tracker (in-memory; in production use Redis)
const roundRobinCounters = new Map<string, number>();

// ============================================
// Condition Evaluation
// ============================================

/**
 * Evaluate a single condition against entity data
 */
function evaluateCondition(
  condition: AssignmentCondition,
  entityData: Record<string, unknown>
): boolean {
  const fieldValue = entityData[condition.field];

  // Handle undefined/null field values
  if (fieldValue === undefined || fieldValue === null) {
    return condition.operator === 'not_equals' && condition.value !== '';
  }

  const fieldStr = String(fieldValue);

  switch (condition.operator) {
    case 'equals':
      return fieldStr === String(condition.value);

    case 'not_equals':
      return fieldStr !== String(condition.value);

    case 'contains':
      return fieldStr.toLowerCase().includes(String(condition.value).toLowerCase());

    case 'in': {
      const values = Array.isArray(condition.value) ? condition.value : [condition.value];
      return values.map(String).includes(fieldStr);
    }

    case 'starts_with':
      return fieldStr.toLowerCase().startsWith(String(condition.value).toLowerCase());

    default:
      log.warn(`[AutoAssignment] Unknown operator: ${condition.operator}`);
      return false;
  }
}

/**
 * Evaluate all conditions for a rule (AND logic — all conditions must match)
 */
function evaluateConditions(
  conditions: AssignmentCondition[],
  entityData: Record<string, unknown>
): boolean {
  if (conditions.length === 0) return true; // No conditions = always match
  return conditions.every((condition) => evaluateCondition(condition, entityData));
}

// ============================================
// Assignment Resolution
// ============================================

/**
 * Resolve the actual user ID from an assignment target
 */
async function resolveAssignee(
  assignToType: AssignToType,
  assignToId: string,
  organizationId: string | null
): Promise<string | null> {
  switch (assignToType) {
    case 'user':
      // Direct user assignment
      return assignToId;

    case 'role': {
      // Find the first user with this role in the organization
      const where: Record<string, unknown> = {
        role: assignToId,
        isActive: true,
        deletedAt: null,
      };
      if (organizationId) {
        where.organizationId = organizationId;
      }
      const user = await db.user.findFirst({
        where,
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      return user?.id ?? null;
    }

    case 'round_robin': {
      // Round-robin assignment among team members
      // assignToId represents a department/team identifier
      const where: Record<string, unknown> = {
        isActive: true,
        deletedAt: null,
      };
      if (organizationId) {
        where.organizationId = organizationId;
      }
      // If assignToId looks like a role, filter by role
      if (assignToId && assignToId !== 'all') {
        where.role = assignToId;
      }

      const users = await db.user.findMany({
        where,
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });

      if (users.length === 0) return null;

      // Get or initialize the counter for this team
      const counterKey = `${organizationId || 'global'}:${assignToId}`;
      const currentIndex = roundRobinCounters.get(counterKey) ?? 0;
      const selectedUser = users[currentIndex % users.length];

      // Increment the counter for next time
      roundRobinCounters.set(counterKey, currentIndex + 1);

      return selectedUser.id;
    }

    default:
      log.warn(`[AutoAssignment] Unknown assignToType: ${assignToType}`);
      return null;
  }
}

// ============================================
// CRUD Helper Functions
// ============================================

/**
 * Get all active auto-assignment rules for an organization, sorted by priority.
 */
export async function getRules(organizationId: string | null): Promise<unknown[]> {
  const where: Record<string, unknown> = {
    deletedAt: null,
  };
  if (organizationId) {
    where.organizationId = organizationId;
  }

  return db.autoAssignmentRule.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
}

/**
 * Create a new auto-assignment rule with validation.
 */
export async function createRule(data: {
  name: string;
  nameEn?: string;
  nameAr?: string;
  description?: string;
  triggerType: string;
  conditions: AssignmentCondition[];
  action?: AssignmentAction;
  assignToType: string;
  assignToId: string;
  isActive?: boolean;
  priority?: number;
  createdById: string;
  organizationId: string | null;
}): Promise<unknown> {
  const created = await db.autoAssignmentRule.create({
    data: {
      name: data.name,
      nameEn: data.nameEn || null,
      nameAr: data.nameAr || null,
      description: data.description || null,
      triggerType: data.triggerType,
      conditions: JSON.stringify(data.conditions),
      action: JSON.stringify(data.action || {}),
      assignToType: data.assignToType,
      assignToId: data.assignToId,
      isActive: data.isActive ?? true,
      priority: data.priority ?? 0,
      createdById: data.createdById,
      organizationId: data.organizationId,
    },
  });

  log.info(`[AutoAssignment] Rule created: "${data.name}" by ${data.createdById}`);

  return created;
}

/**
 * Update an existing auto-assignment rule.
 */
export async function updateRule(
  id: string,
  data: {
    name?: string;
    nameEn?: string;
    nameAr?: string;
    description?: string;
    triggerType?: string;
    conditions?: AssignmentCondition[];
    action?: AssignmentAction;
    assignToType?: string;
    assignToId?: string;
    isActive?: boolean;
    priority?: number;
  }
): Promise<unknown> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.nameEn !== undefined) payload.nameEn = data.nameEn;
  if (data.nameAr !== undefined) payload.nameAr = data.nameAr;
  if (data.description !== undefined) payload.description = data.description;
  if (data.triggerType !== undefined) payload.triggerType = data.triggerType;
  if (data.conditions !== undefined) payload.conditions = JSON.stringify(data.conditions);
  if (data.action !== undefined) payload.action = JSON.stringify(data.action);
  if (data.assignToType !== undefined) payload.assignToType = data.assignToType;
  if (data.assignToId !== undefined) payload.assignToId = data.assignToId;
  if (data.isActive !== undefined) payload.isActive = data.isActive;
  if (data.priority !== undefined) payload.priority = data.priority;

  const updated = await db.autoAssignmentRule.update({
    where: { id },
    data: payload,
  });

  log.info(`[AutoAssignment] Rule updated: ${id}`);

  return updated;
}

/**
 * Soft-delete an auto-assignment rule.
 */
export async function deleteRule(id: string): Promise<unknown> {
  const deleted = await db.autoAssignmentRule.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  log.info(`[AutoAssignment] Rule soft-deleted: ${id}`);

  return deleted;
}

// ============================================
// Main Evaluation Function
// ============================================

/**
 * Evaluate auto-assignment rules for a given trigger and entity data.
 * Uses first-match-wins: stops evaluating after the first matching rule.
 *
 * @param triggerType - The event that triggered evaluation
 * @param entityData - The entity data to match conditions against
 * @param organizationId - The organization context
 * @returns The first matching rule result, or null if no match
 */
export async function evaluateRules(
  triggerType: TriggerType,
  entityData: Record<string, unknown>,
  organizationId: string | null
): Promise<AutoAssignmentResult | null> {
  try {
    // Fetch active rules for this trigger type and organization, ordered by priority (highest first)
    const where: Record<string, unknown> = {
      triggerType,
      isActive: true,
      deletedAt: null,
    };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const rules = await db.autoAssignmentRule.findMany({
      where,
      orderBy: { priority: 'desc' },
    });

    if (rules.length === 0) return null;

    for (const rule of rules) {
      // Parse conditions from JSON
      let conditions: AssignmentCondition[];
      try {
        conditions = JSON.parse(rule.conditions || '[]');
        if (!Array.isArray(conditions)) {
          log.warn(`[AutoAssignment] Rule ${rule.id} has invalid conditions format`);
          continue;
        }
      } catch {
        log.warn(`[AutoAssignment] Rule ${rule.id} has unparseable conditions`);
        continue;
      }

      // Evaluate conditions
      if (!evaluateConditions(conditions, entityData)) {
        continue;
      }

      // Parse action JSON
      let action: AssignmentAction = {};
      try {
        action = JSON.parse(rule.action || '{}');
      } catch {
        log.warn(`[AutoAssignment] Rule ${rule.id} has unparseable action, using defaults`);
      }

      // Resolve assignee
      const assignToType = rule.assignToType as AssignToType;
      const assignedUserId = await resolveAssignee(assignToType, rule.assignToId, organizationId);

      // Update rule trigger stats
      await db.autoAssignmentRule.update({
        where: { id: rule.id },
        data: {
          lastTriggeredAt: new Date(),
          triggerCount: { increment: 1 },
        },
      }).catch((err: Error) => {
        log.warn(`[AutoAssignment] Failed to update trigger stats for rule ${rule.id}:`, { error: err.message });
      });

      // First match wins — return immediately
      return {
        matched: true,
        ruleId: rule.id,
        ruleName: rule.name,
        assignToType,
        assignToId: rule.assignToId,
        action,
        assignedUserId: assignedUserId ?? undefined,
        reason: assignedUserId
          ? `Auto-assigned by rule "${rule.name}" (${triggerType})`
          : `Rule "${rule.name}" matched but no assignee found`,
      };
    }

    // No rule matched
    return null;
  } catch (error) {
    log.error('[AutoAssignment] Error evaluating rules:', error);
    return null;
  }
}

/**
 * Evaluate all matching rules (returns all matches, not first-match-wins).
 * Used for backwards compatibility and the test endpoint.
 *
 * @param triggerType - The event that triggered evaluation
 * @param entityData - The entity data to match conditions against
 * @param organizationId - The organization context
 * @returns Array of assignment results
 */
export async function evaluateAutoAssignmentRules(
  triggerType: TriggerType,
  entityData: Record<string, unknown>,
  organizationId: string | null
): Promise<AutoAssignmentResult[]> {
  try {
    const where: Record<string, unknown> = {
      triggerType,
      isActive: true,
      deletedAt: null,
    };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const rules = await db.autoAssignmentRule.findMany({
      where,
      orderBy: { priority: 'desc' },
    });

    if (rules.length === 0) return [];

    const results: AutoAssignmentResult[] = [];

    for (const rule of rules) {
      let conditions: AssignmentCondition[];
      try {
        conditions = JSON.parse(rule.conditions || '[]');
        if (!Array.isArray(conditions)) {
          log.warn(`[AutoAssignment] Rule ${rule.id} has invalid conditions format`);
          continue;
        }
      } catch {
        log.warn(`[AutoAssignment] Rule ${rule.id} has unparseable conditions`);
        continue;
      }

      if (!evaluateConditions(conditions, entityData)) {
        continue;
      }

      let action: AssignmentAction = {};
      try {
        action = JSON.parse(rule.action || '{}');
      } catch {
        // Use defaults
      }

      const assignToType = rule.assignToType as AssignToType;
      const assignedUserId = await resolveAssignee(assignToType, rule.assignToId, organizationId);

      results.push({
        matched: true,
        ruleId: rule.id,
        ruleName: rule.name,
        assignToType,
        assignToId: rule.assignToId,
        action,
        assignedUserId: assignedUserId ?? undefined,
        reason: assignedUserId
          ? `Auto-assigned by rule "${rule.name}" (${triggerType})`
          : `Rule "${rule.name}" matched but no assignee found`,
      });

      await db.autoAssignmentRule.update({
        where: { id: rule.id },
        data: {
          lastTriggeredAt: new Date(),
          triggerCount: { increment: 1 },
        },
      }).catch((err: Error) => {
        log.warn(`[AutoAssignment] Failed to update trigger stats for rule ${rule.id}:`, { error: err.message });
      });
    }

    return results;
  } catch (error) {
    log.error('[AutoAssignment] Error evaluating rules:', error);
    return [];
  }
}

// ============================================
// Apply Auto-Assignment
// ============================================

/**
 * Apply auto-assignment to a task after creation.
 * Uses first-match-wins logic.
 * Assigns the task, logs to activity log, and sends a notification.
 *
 * @param taskId - The ID of the newly created task
 * @param taskData - The task data to evaluate conditions against
 * @param organizationId - The organization context
 * @param ctx - Auth context of the user who created the task
 * @returns The assigned user ID, or null if no rule matched
 */
export async function applyAutoAssignment(
  taskId: string,
  taskData: Record<string, unknown>,
  organizationId: string | null,
  ctx: AuthContext
): Promise<string | null> {
  const match = await evaluateRules('task_created', taskData, organizationId);

  if (!match || !match.assignedUserId) return null;

  // Apply the assignment — update the task
  await db.task.update({
    where: { id: taskId },
    data: {
      assigneeId: match.assignedUserId,
      ...(match.action.setPriority ? { priority: match.action.setPriority } : {}),
    },
  }).catch((err: Error) => {
    log.warn(`[AutoAssignment] Failed to update task ${taskId} with auto-assignment:`, { error: err.message });
  });

  // Log the auto-assignment for audit trail
  log.info(`[AutoAssignment] Task auto-assigned: taskId=${taskId}, rule="${match.ruleName}", assignee=${match.assignedUserId}, triggeredBy=${ctx.userId}`);

  // Create an audit log entry
  try {
    await createAuditEntry({
      action: 'AUTO_ASSIGN',
      entityType: 'Task',
      entityId: taskId,
      userId: ctx.userId,
      organizationId,
      newValues: {
        assigneeId: match.assignedUserId,
        ruleId: match.ruleId,
        ruleName: match.ruleName,
        assignToType: match.assignToType,
        action: match.action,
      },
      details: match.reason,
    });
  } catch {
    // Audit logging failure should not block the assignment
  }

  // Send notification to the assigned user (if action.notify is not explicitly false)
  if (match.action.notify !== false) {
    try {
      const taskTitle = String(taskData.title || '');
      const taskTitleEn = String(taskData.titleEn || taskData.title || '');
      await notificationService.notifyTaskAssigned(
        match.assignedUserId,
        taskTitle,
        taskTitleEn,
        String(taskData.projectId || undefined),
      );
    } catch (err: unknown) {
      log.warn(`[AutoAssignment] Failed to send notification to assignee ${match.assignedUserId}:`, { error: err instanceof Error ? err.message : String(err) });
    }
  }

  return match.assignedUserId;
}

/**
 * Apply auto-assignment to a project after creation.
 */
export async function applyAutoAssignmentForProject(
  projectData: Record<string, unknown>,
  organizationId: string | null,
  ctx: AuthContext
): Promise<string | null> {
  const match = await evaluateRules('project_created', projectData, organizationId);

  if (!match || !match.assignedUserId) return null;

  log.info(`[AutoAssignment] Project auto-assigned: rule="${match.ruleName}", assignee=${match.assignedUserId}, triggeredBy=${ctx.userId}`);

  try {
    await createAuditEntry({
      action: 'AUTO_ASSIGN',
      entityType: 'Project',
      entityId: String(projectData.id || ''),
      userId: ctx.userId,
      organizationId,
      newValues: {
        assigneeId: match.assignedUserId,
        ruleId: match.ruleId,
        ruleName: match.ruleName,
      },
      details: match.reason,
    });
  } catch {
    // Audit logging failure should not block the assignment
  }

  // Send notification
  if (match.action.notify !== false) {
    try {
      await notificationService.create({
        userId: match.assignedUserId,
        type: 'PROJECT_UPDATE',
        titleAr: 'مشروع جديد',
        titleEn: 'New Project',
        messageAr: `تم تعيين مشروع لك تلقائياً بواسطة القاعدة "${match.ruleName}"`,
        messageEn: `A project has been auto-assigned to you by rule "${match.ruleName}"`,
        priority: 'MEDIUM',
        organizationId: organizationId ?? undefined,
      });
    } catch (err: unknown) {
      log.warn(`[AutoAssignment] Failed to send notification to assignee ${match.assignedUserId}:`, { error: err instanceof Error ? err.message : String(err) });
    }
  }

  return match.assignedUserId;
}

// ============================================
// Test / Dry-Run
// ============================================

/**
 * Test a rule against sample data (dry run).
 * Returns whether the rule would match and what assignment it would produce.
 */
export async function testAutoAssignmentRule(
  ruleId: string,
  sampleData: Record<string, unknown>,
  organizationId: string | null
): Promise<AutoAssignmentResult | { matched: false; reason: string }> {
  const rule = await db.autoAssignmentRule.findUnique({
    where: { id: ruleId },
  });

  if (!rule) {
    return { matched: false, reason: 'القاعدة غير موجودة' };
  }

  let conditions: AssignmentCondition[];
  try {
    conditions = JSON.parse(rule.conditions || '[]');
  } catch {
    return { matched: false, reason: 'شروط القاعدة غير صالحة' };
  }

  const matchesConditions = evaluateConditions(conditions, sampleData);

  if (!matchesConditions) {
    return { matched: false, reason: 'الشروط لا تتطابق مع البيانات المقدمة' };
  }

  let action: AssignmentAction = {};
  try {
    action = JSON.parse(rule.action || '{}');
  } catch {
    // Use defaults
  }

  const assignToType = rule.assignToType as AssignToType;
  const assignedUserId = await resolveAssignee(assignToType, rule.assignToId, organizationId);

  return {
    matched: true,
    ruleId: rule.id,
    ruleName: rule.name,
    assignToType,
    assignToId: rule.assignToId,
    action,
    assignedUserId: assignedUserId ?? undefined,
    reason: assignedUserId
      ? `سيتم التعيين إلى المستخدم ${assignedUserId} (قاعدة "${rule.name}")`
      : `القاعدة تطابقت لكن لم يتم العثور على مستخدم للتعيين`,
  };
}
