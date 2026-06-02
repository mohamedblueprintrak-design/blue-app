import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';
import type { WorkflowStepSeverity, NotificationType, ProjectType } from '@/types/db-enums';

// ==================== TYPES ====================

export interface WorkflowStageData {
  id: string;
  workflowId: string;
  templateStageId: string | null;
  name: string;
  nameEn: string;
  order: number;
  status: string;
  startDate: Date | null;
  dueDate: Date | null;
  completedDate: Date | null;
  assigneeId: string | null;
  notes: string;
  steps: WorkflowStepData[];
}

export interface WorkflowStepData {
  id: string;
  stageId: string;
  templateStepId: string | null;
  name: string;
  nameEn: string;
  order: number;
  status: string;
  assigneeId: string | null;
  assignedRole: string;
  startDate: Date | null;
  dueDate: Date | null;
  completedDate: Date | null;
  action: string;
  notes: string;
  returnReason: string;
  severity: string;
}

export interface WorkflowProgress {
  totalStages: number;
  completedStages: number;
  totalSteps: number;
  completedSteps: number;
  progress: number;
  currentStageIndex: number;
}

// ==================== CORE FUNCTIONS ====================

/**
 * Initialize a workflow for a project from a template
 */
export async function initWorkflow(projectId: string, templateId?: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error('Project not found');

  // Check if workflow already exists
  const existing = await db.projectWorkflow.findUnique({ where: { projectId } });
  if (existing) throw new Error('Workflow already exists for this project');

  // Find template
  let template: { id: string; stages: Array<{ id: string; name: string | null; nameEn: string | null; order: number; durationDays?: unknown; steps: unknown; [key: string]: unknown }> } | null = null;
  if (templateId) {
    template = await db.workflowTemplate.findUnique({
      where: { id: templateId },
      include: {
        stages: { orderBy: { order: 'asc' }, include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });
  } else {
    template = await db.workflowTemplate.findFirst({
      where: { projectType: project.type, isActive: true },
      include: {
        stages: { orderBy: { order: 'asc' }, include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });
  }

  if (!template || template.stages.length === 0) {
    throw new Error('No suitable workflow template found');
  }

  // Create the workflow with all stages and steps
  const workflow = await db.projectWorkflow.create({
    data: {
      projectId,
      templateId: template.id,
      status: 'ACTIVE',
      progress: 0,
      stages: {
        create: template.stages.map((stage, stageIdx) => ({
          templateStageId: stage.id,
          name: stage.name ?? undefined,
          nameEn: stage.nameEn ?? undefined,
          order: stage.order,
          status: stageIdx === 0 ? 'PENDING' : 'SKIPPED',
          startDate: stageIdx === 0 ? new Date() : null,
          dueDate: stageIdx === 0
            ? new Date(Date.now() + (stage.durationDays as number) * 24 * 60 * 60 * 1000)
            : null,
          steps: {
            create: (stage.steps as Array<{ id: string; name: string; nameEn: string; order: number; assignedRole: string; daysToComplete: number; description?: string; descriptionEn?: string }>).map((step, stepIdx) => ({
              templateStepId: step.id,
              name: step.name,
              nameEn: step.nameEn,
              order: step.order,
              assignedRole: step.assignedRole,
              status: stageIdx === 0 && stepIdx === 0 ? 'UNLOCKED' : 'SKIPPED',
              dueDate: stageIdx === 0 && stepIdx === 0 && step.daysToComplete > 0
                ? new Date(Date.now() + step.daysToComplete * 24 * 60 * 60 * 1000)
                : null,
            })),
          },
        })),
      },
    },
    include: {
      stages: {
        orderBy: { order: 'asc' },
        include: { steps: { orderBy: { order: 'asc' } } },
      },
    },
  });

  // Set the first step as pending
  if (workflow.stages.length > 0 && workflow.stages[0].steps.length > 0) {
    const firstStep = workflow.stages[0].steps[0];
    await db.workflowStep.update({
      where: { id: firstStep.id },
      data: { status: 'UNLOCKED' },
    });
  }

  // Update project progress
  await updateProjectProgress(workflow.id);

  return workflow;
}

/**
 * Advance workflow to next stage when current completes
 * SECURITY FIX (CWE-362): Wrapped in a transaction to prevent race conditions
 * when multiple concurrent calls attempt to advance the same workflow.
 * Now accepts an optional transaction client `tx` to participate in a parent
 * transaction (prevents transaction breakout from executeStepAction).
 */
export async function advanceWorkflow(workflowId: string, tx?: Parameters<Parameters<typeof db.$transaction>[0]>[0]) {
  return await db.$transaction(async (innerTx) => {
    // Use the provided transaction client, or the inner transaction if no parent
    const txx = tx || innerTx;

    const workflow = await txx.projectWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        stages: { orderBy: { order: 'asc' }, include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });

    if (!workflow) throw new Error('Workflow not found');
    if (workflow.status === 'ARCHIVED') return workflow;

    const stages = workflow.stages;
    const currentStageIndex = stages.findIndex(
      (s) => s.status === 'IN_PROGRESS' || s.status === 'PENDING'
    );

    if (currentStageIndex === -1) {
      // All stages are done
      await txx.projectWorkflow.update({
        where: { id: workflowId },
        data: { status: 'ARCHIVED', completedAt: new Date(), progress: 100 },
      });
      return await txx.projectWorkflow.findUnique({ where: { id: workflowId }, include: { stages: { include: { steps: true } } } });
    }

    const currentStage = stages[currentStageIndex];
    const nextStage = stages[currentStageIndex + 1];

    if (!nextStage) {
      // No more stages
      await txx.projectWorkflow.update({
        where: { id: workflowId },
        data: { status: 'ARCHIVED', completedAt: new Date(), progress: 100 },
      });
      return await txx.projectWorkflow.findUnique({ where: { id: workflowId }, include: { stages: { include: { steps: true } } } });
    }

    // Complete current stage and activate next (atomic within transaction)
    await txx.workflowStage.update({
      where: { id: currentStage.id },
      data: { status: 'COMPLETED', completedDate: new Date() },
    });

    await txx.workflowStage.update({
      where: { id: nextStage.id },
      data: {
        status: 'IN_PROGRESS',
        startDate: new Date(),
        dueDate: nextStage.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Unlock first step of next stage
    if (nextStage.steps.length > 0) {
      await txx.workflowStep.update({
        where: { id: nextStage.steps[0].id },
        data: { status: 'UNLOCKED' },
      });
    }

    await txx.projectWorkflow.update({
      where: { id: workflowId },
      data: { currentStageId: nextStage.id },
    });

    // Update progress within the same transaction
    const progress = await getWorkflowProgressInner(workflowId, txx);
    await txx.projectWorkflow.update({
      where: { id: workflowId },
      data: { progress: progress.progress },
    });

    // Send notification (best-effort, outside transaction is fine for notifications)
    if (nextStage.steps.length > 0 && nextStage.steps[0].assignedRole) {
      const assignees = await txx.user.findMany({
        where: { role: nextStage.steps[0].assignedRole as UserRole, isActive: true },
      });
      for (const assignee of assignees) {
        await sendNotification(
          assignee.id,
          workflow.projectId,
          'PROJECT_UPDATE',
          `خطوة جديدة في المشروع`,
          `المرحلة "${nextStage.name}" بدأت - الخطوة: "${nextStage.steps[0].name}"`,
          nextStage.id // FIX: relatedEntityId now set to stage ID
        );
      }
    }

    return await txx.projectWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        stages: { orderBy: { order: 'asc' }, include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });
  }, {
    maxWait: 5000,
    timeout: 10000,
    isolationLevel: 'Serializable', // Prevent phantom reads during concurrent advances
  });
}

/**
 * Execute a step action
 */
export async function executeStepAction(
  stepId: string,
  action: 'approve' | 'complete' | 'reject' | 'request_changes' | 'start',
  userId: string,
  data?: { notes?: string; returnReason?: string; severity?: string },
  organizationId?: string | null
) {
  // SECURITY: Use transaction to prevent race conditions when multiple users
  // try to execute actions on the same step concurrently
  return await db.$transaction(async (tx) => {
    const step = await tx.workflowStep.findUnique({
      where: { id: stepId },
      include: {
        stage: {
          include: {
            workflow: true,
            steps: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!step) throw new Error('Step not found');

    // SECURITY check: Ensure organization matches in multi-tenant mode
    if (process.env.MULTI_TENANT === 'true' && organizationId) {
      const stepOrgId = step.stage.workflow.organizationId;
      if (stepOrgId && stepOrgId !== organizationId) {
        throw new Error('Access denied: This workflow step does not belong to your organization');
      }
    }


    if (action === 'start') {
      await tx.workflowStep.update({
        where: { id: stepId },
        data: { status: 'IN_PROGRESS', startDate: new Date(), assigneeId: userId },
      });
      return step;
    }

    if (action === 'approve' || action === 'complete') {
      await tx.workflowStep.update({
        where: { id: stepId },
        data: {
          status: 'COMPLETED',
          completedDate: new Date(),
          action,
          notes: data?.notes || '',
        },
      });

      // Re-fetch stage steps within the transaction to get latest state
      const stageSteps = await tx.workflowStep.findMany({
        where: { stageId: step.stageId },
        orderBy: { order: 'asc' },
      });

      const allCompleted = stageSteps.every(
        (s) => s.status === 'COMPLETED' || s.status === 'SKIPPED'
      );

      if (allCompleted) {
        await tx.workflowStage.update({
          where: { id: step.stageId },
          data: { status: 'COMPLETED', completedDate: new Date() },
        });

        // Advance workflow — pass transaction client to prevent transaction breakout (CWE-362)
        await advanceWorkflow(step.stage.workflowId, tx);
      } else {
        // Unlock next step in the stage
        const nextStepIdx = stageSteps.findIndex((s) => s.id === stepId);
        const nextStep = stageSteps[nextStepIdx + 1];
        if (nextStep && (nextStep.status === 'SKIPPED' || nextStep.status === 'UNLOCKED')) {
          await tx.workflowStep.update({
            where: { id: nextStep.id },
            data: { status: 'UNLOCKED' },
          });
        }
      }

      await updateProjectProgress(step.stage.workflowId);
    }

    if (action === 'reject' || action === 'request_changes') {
      await tx.workflowStep.update({
        where: { id: stepId },
        data: {
          status: 'UNLOCKED',
          action,
          notes: data?.notes || '',
          returnReason: data?.returnReason || '',
          severity: (data?.severity as WorkflowStepSeverity) || 'NORMAL',
        },
      });

      // Notify previous step's assignee
      const stageSteps = step.stage.steps;
      const stepIdx = stageSteps.findIndex((s) => s.id === stepId);
      if (stepIdx > 0) {
        const prevStep = stageSteps[stepIdx - 1];
        if (prevStep.assigneeId) {
          await sendNotification(
            prevStep.assigneeId,
            step.stage.workflow.projectId,
            'APPROVAL_NEEDED',
            `طلب تعديلات على الخطوة`,
            `الخطوة "${step.name}" تم رفضها - السبب: ${data?.returnReason || 'بدون سبب'}`,
            stepId // FIX: relatedEntityId set to step ID
          );
        }
      }
    }

    return await tx.workflowStep.findUnique({ where: { id: stepId } });
  }, {
    // Retry on write conflicts from concurrent transactions
    maxWait: 5000,
    timeout: 10000,
  });
}

/**
 * Assign a step to a user
 * FIX (CWE-362): Wrapped in transaction to prevent race conditions in concurrent assignments
 */
export async function assignStep(stepId: string, userId: string) {
  return await db.$transaction(async (tx) => {
    const step = await tx.workflowStep.findUnique({ where: { id: stepId } });
    if (!step) throw new Error('Step not found');

    return await tx.workflowStep.update({
      where: { id: stepId },
      data: { assigneeId: userId, status: 'UNLOCKED' },
    });
  });
}

/**
 * Calculate workflow progress
 */
export async function getWorkflowProgress(workflowId: string): Promise<WorkflowProgress> {
  const workflow = await db.projectWorkflow.findUnique({
    where: { id: workflowId },
    include: {
      stages: { orderBy: { order: 'asc' }, include: { steps: { orderBy: { order: 'asc' } } } },
    },
  });

  if (!workflow) {
    return { totalStages: 0, completedStages: 0, totalSteps: 0, completedSteps: 0, progress: 0, currentStageIndex: -1 };
  }

  const stages = workflow.stages;
  const totalStages = stages.length;
  const completedStages = stages.filter((s) => s.status === 'COMPLETED').length;
  const totalSteps = stages.reduce((sum, s) => sum + s.steps.length, 0);
  const completedSteps = stages.reduce(
    (sum, s) => sum + s.steps.filter((st) => st.status === 'COMPLETED').length,
    0
  );
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const currentStageIndex = stages.findIndex(
    (s) => s.status === 'IN_PROGRESS' || s.status === 'PENDING'
  );

  return { totalStages, completedStages, totalSteps, completedSteps, progress, currentStageIndex };
}

/**
 * Calculate workflow progress (inner version that accepts a transaction client)
 */
async function getWorkflowProgressInner(workflowId: string, tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]): Promise<WorkflowProgress> {
  const workflow = await tx.projectWorkflow.findUnique({
    where: { id: workflowId },
    include: {
      stages: { orderBy: { order: 'asc' }, include: { steps: { orderBy: { order: 'asc' } } } },
    },
  });

  if (!workflow) {
    return { totalStages: 0, completedStages: 0, totalSteps: 0, completedSteps: 0, progress: 0, currentStageIndex: -1 };
  }

  const stages = workflow.stages;
  const totalStages = stages.length;
  const completedStages = stages.filter((s) => s.status === 'COMPLETED').length;
  const totalSteps = stages.reduce((sum, s) => sum + s.steps.length, 0);
  const completedSteps = stages.reduce(
    (sum, s) => sum + s.steps.filter((st) => st.status === 'COMPLETED').length,
    0
  );
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const currentStageIndex = stages.findIndex(
    (s) => s.status === 'IN_PROGRESS' || s.status === 'PENDING'
  );

  return { totalStages, completedStages, totalSteps, completedSteps, progress, currentStageIndex };
}

/**
 * Update project workflow progress
 * FIX: Now uses transaction-aware inner function
 */
async function updateProjectProgress(workflowId: string) {
  const progress = await getWorkflowProgress(workflowId);
  await db.projectWorkflow.update({
    where: { id: workflowId },
    data: { progress: progress.progress },
  });
}

/**
 * Send a notification
 * FIX: relatedEntityId is now required instead of hardcoded empty string
 */
async function sendNotification(userId: string, projectId: string, type: NotificationType, title: string, message: string, relatedEntityId?: string) {
  try {
    await db.notification.create({
      data: {
        userId,
        projectId,
        type,
        title,
        message,
        relatedEntityType: 'workflow',
        relatedEntityId: relatedEntityId || projectId, // Default to projectId if not specified
      },
    });
  } catch {
    // Notification creation is best-effort
  }
}

/**
 * Create a workflow template with stages and steps
 */
export async function createWorkflowTemplate(data: {
  name: string;
  nameEn?: string;
  projectType?: ProjectType;
  description?: string;
  stages: Array<{
    name: string;
    nameEn?: string;
    order: number;
    durationDays?: number;
    isParallel?: boolean;
    steps: Array<{
      name: string;
      nameEn?: string;
      order: number;
      assignedRole?: string;
      isRequired?: boolean;
      requiresApproval?: boolean;
      autoComplete?: boolean;
      daysToComplete?: number;
    }>;
  }>;
}) {
  return await db.workflowTemplate.create({
    data: {
      name: data.name,
      nameEn: data.nameEn || '',
      projectType: data.projectType || '',
      description: data.description || '',
      stages: {
        create: data.stages.map((stage) => ({
          name: stage.name,
          nameEn: stage.nameEn || '',
          order: stage.order,
          durationDays: stage.durationDays || 0,
          isParallel: stage.isParallel || false,
          steps: {
            create: (stage.steps || []).map((step) => ({
              name: step.name,
              nameEn: step.nameEn || '',
              order: step.order,
              assignedRole: step.assignedRole || '',
              isRequired: step.isRequired !== false,
              requiresApproval: step.requiresApproval || false,
              autoComplete: step.autoComplete || false,
              daysToComplete: step.daysToComplete || 0,
            })),
          },
        })),
      },
    },
    include: { stages: { include: { steps: true } } },
  });
}

/**
 * Seed default workflow templates for each project type
 */
export async function seedDefaultWorkflowTemplates() {
  // Role constants matching organizational structure:
  // gm          - المدير العام (General Manager) → reviews everything
  // office_manager - مدير المكتب (Office Manager) → manages administrative work
  // arch_head    - رئيس القسم المعماري (Architectural Head) → reviews architectural design
  // struct_head  - رئيس القسم الإنشائي (Structural Head) → reviews structural design
  // project_manager - مدير مشاريع (Project Manager) → manages projects, assigns tasks
  // engineer     - المهندسين (Engineers) → do the actual work
  // secretary    - السكرتارية (Secretary) → handles client creation, documentation
  // mep_head     - رئيس قسم الكهروميكانيك (MEP Supervisor) → reviews MEP design

  const templates = [
    {
      name: 'قالب المشروع المتكامل - رأس الخيمة',
      nameEn: 'Comprehensive Project Template - RAK',
      projectType: 'VILLA',
      description: 'قالب شامل يغطي جميع مراحل المشروع من التسجيل حتى التسليم',
      stages: [
        // ===== 1. Client Registration =====
        {
          name: 'تسجيل العميل',
          nameEn: 'Client Registration',
          order: 1,
          durationDays: 1,
          steps: [
            { name: 'تسجيل بيانات العميل', nameEn: 'Register Client Data', order: 1, assignedRole: 'SECRETARY', daysToComplete: 1 },
            { name: 'مراجعة بيانات العميل', nameEn: 'Review Client Data', order: 2, assignedRole: 'office_manager', requiresApproval: true, daysToComplete: 1 },
          ],
        },
        // ===== 2. Project Setup =====
        {
          name: 'إعداد المشروع',
          nameEn: 'Project Setup',
          order: 2,
          durationDays: 2,
          steps: [
            { name: 'إنشاء ملف المشروع وتعيين الفريق', nameEn: 'Create Project File & Assign Team', order: 1, assignedRole: 'PROJECT_MANAGER', daysToComplete: 1 },
            { name: 'اعتماد إعداد المشروع', nameEn: 'Approve Project Setup', order: 2, assignedRole: 'office_manager', requiresApproval: true, daysToComplete: 1 },
          ],
        },
        // ===== 3. Architectural Design =====
        {
          name: 'التصميم المعماري',
          nameEn: 'Architectural Design',
          order: 3,
          durationDays: 14,
          steps: [
            { name: 'إعداد المخططات المعمارية', nameEn: 'Prepare Architectural Drawings', order: 1, assignedRole: 'ENGINEER', daysToComplete: 7 },
            { name: 'مراجعة التصميم المعماري', nameEn: 'Review Architectural Design', order: 2, assignedRole: 'arch_head', requiresApproval: true, daysToComplete: 3 },
            { name: 'الموافقة النهائية على التصميم المعماري', nameEn: 'Final Approval - Architectural Design', order: 3, assignedRole: 'office_manager', requiresApproval: true, daysToComplete: 2 },
          ],
        },
        // ===== 4. Structural Design =====
        {
          name: 'التصميم الإنشائي',
          nameEn: 'Structural Design',
          order: 4,
          durationDays: 10,
          steps: [
            { name: 'إعداد التصميم الإنشائي', nameEn: 'Prepare Structural Design', order: 1, assignedRole: 'ENGINEER', daysToComplete: 5 },
            { name: 'مراجعة التصميم الإنشائي', nameEn: 'Review Structural Design', order: 2, assignedRole: 'struct_head', requiresApproval: true, daysToComplete: 3 },
            { name: 'الموافقة النهائية على التصميم الإنشائي', nameEn: 'Final Approval - Structural Design', order: 3, assignedRole: 'office_manager', requiresApproval: true, daysToComplete: 2 },
          ],
        },
        // ===== 5. MEP Design =====
        {
          name: 'التصميم الكهروميكانيكي',
          nameEn: 'MEP Design',
          order: 5,
          durationDays: 7,
          steps: [
            { name: 'إعداد التصميم الكهروميكانيكي', nameEn: 'Prepare MEP Design', order: 1, assignedRole: 'ENGINEER', daysToComplete: 4 },
            { name: 'مراجعة التصميم الكهروميكانيكي', nameEn: 'Review MEP Design', order: 2, assignedRole: 'mep_head', requiresApproval: true, daysToComplete: 2 },
            { name: 'الموافقة النهائية على التصميم الكهروميكانيكي', nameEn: 'Final Approval - MEP Design', order: 3, assignedRole: 'office_manager', requiresApproval: true, daysToComplete: 1 },
          ],
        },
        // ===== 6. Civil Defense Review =====
        {
          name: 'مراجعة الدفاع المدني',
          nameEn: 'Civil Defense Review',
          order: 6,
          durationDays: 5,
          steps: [
            { name: 'إعداد مستندات الدفاع المدني', nameEn: 'Prepare Civil Defense Documents', order: 1, assignedRole: 'ENGINEER', daysToComplete: 2 },
            { name: 'مراجعة مستندات الدفاع المدني', nameEn: 'Review Civil Defense Documents', order: 2, assignedRole: 'arch_head', requiresApproval: true, daysToComplete: 1 },
            { name: 'تقديم واعتماد طلب الدفاع المدني', nameEn: 'Submit & Approve Civil Defense Request', order: 3, assignedRole: 'office_manager', requiresApproval: true, daysToComplete: 2 },
          ],
        },
        // ===== 7. Municipality Submission =====
        {
          name: 'تقديم البلدية',
          nameEn: 'Municipality Submission',
          order: 7,
          durationDays: 10,
          steps: [
            { name: 'تجهيز ملف البلدية', nameEn: 'Prepare Municipality File', order: 1, assignedRole: 'SECRETARY', daysToComplete: 2 },
            { name: 'مراجعة ملف البلدية', nameEn: 'Review Municipality File', order: 2, assignedRole: 'PROJECT_MANAGER', requiresApproval: true, daysToComplete: 1 },
            { name: 'تقديم الملف للبلدية', nameEn: 'Submit File to Municipality', order: 3, assignedRole: 'office_manager', daysToComplete: 1 },
            { name: 'متابعة الطلب البلدي', nameEn: 'Follow Up Municipality Request', order: 4, assignedRole: 'PROJECT_MANAGER', daysToComplete: 6 },
          ],
        },
        // ===== 8. Specifications & BOQ =====
        {
          name: 'المواصفات وجدول الكميات',
          nameEn: 'Specifications & BOQ',
          order: 8,
          durationDays: 7,
          steps: [
            { name: 'إعداد المواصفات وجدول الكميات', nameEn: 'Prepare Specs & BOQ', order: 1, assignedRole: 'ENGINEER', daysToComplete: 4 },
            { name: 'مراجعة المواصفات وجدول الكميات', nameEn: 'Review Specs & BOQ', order: 2, assignedRole: 'PROJECT_MANAGER', requiresApproval: true, daysToComplete: 2 },
            { name: 'اعتماد المواصفات وجدول الكميات', nameEn: 'Approve Specs & BOQ', order: 3, assignedRole: 'office_manager', requiresApproval: true, daysToComplete: 1 },
          ],
        },
        // ===== 9. Contractor Selection =====
        {
          name: 'اختيار المقاول',
          nameEn: 'Contractor Selection',
          order: 9,
          durationDays: 7,
          steps: [
            { name: 'طلب عروض الأسعار وفرز المقاولين', nameEn: 'Request Quotes & Screen Contractors', order: 1, assignedRole: 'PROJECT_MANAGER', daysToComplete: 3 },
            { name: 'تقييم العروض واختيار المقاول', nameEn: 'Evaluate Bids & Select Contractor', order: 2, assignedRole: 'office_manager', requiresApproval: true, daysToComplete: 2 },
            { name: 'الموافقة النهائية - اختيار المقاول', nameEn: 'GM Final Approval - Contractor', order: 3, assignedRole: 'gm', requiresApproval: true, daysToComplete: 2 },
          ],
        },
        // ===== 10. Construction Supervision =====
        {
          name: 'الإشراف على التنفيذ',
          nameEn: 'Construction Supervision',
          order: 10,
          durationDays: 30,
          steps: [
            { name: 'الإشراف الميداني وتقارير الزيارات', nameEn: 'Field Supervision & Visit Reports', order: 1, assignedRole: 'ENGINEER', daysToComplete: 20 },
            { name: 'مراجعة تقارير الإشراف', nameEn: 'Review Supervision Reports', order: 2, assignedRole: 'PROJECT_MANAGER', requiresApproval: true, daysToComplete: 3 },
            { name: 'اعتماد تقارير الإشراف', nameEn: 'Approve Supervision Reports', order: 3, assignedRole: 'office_manager', requiresApproval: true, daysToComplete: 2 },
          ],
        },
        // ===== 11. Project Handover =====
        {
          name: 'تسليم المشروع',
          nameEn: 'Project Handover',
          order: 11,
          durationDays: 5,
          steps: [
            { name: 'التحقق من اكتمال الأعمال', nameEn: 'Verify Work Completion', order: 1, assignedRole: 'ENGINEER', daysToComplete: 1 },
            { name: 'مراجعة ملف التسليم', nameEn: 'Review Handover File', order: 2, assignedRole: 'PROJECT_MANAGER', requiresApproval: true, daysToComplete: 1 },
            { name: 'توقيع التسليم', nameEn: 'Sign Handover', order: 3, assignedRole: 'office_manager', requiresApproval: true, daysToComplete: 1 },
            { name: 'الموافقة النهائية - إغلاق المشروع', nameEn: 'GM Final Approval - Project Close', order: 4, assignedRole: 'gm', requiresApproval: true, daysToComplete: 2 },
          ],
        },
      ],
    },
  ];

  let count = 0;
  for (const tpl of templates) {
    const existing = await db.workflowTemplate.findFirst({
      where: { projectType: tpl.projectType as ProjectType, name: tpl.name },
    });
    if (!existing) {
      await createWorkflowTemplate(tpl as Parameters<typeof createWorkflowTemplate>[0]);
      count++;
    }
  }

  return count;
}
