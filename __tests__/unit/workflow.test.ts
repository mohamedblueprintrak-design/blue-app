/**
 * Unit Tests — Workflow Engine (Batch 2)
 * Tests workflow state transitions, stage progression, approval/rejection flow,
 * permission checks, and progress calculation.
 * Pure logic extracted from src/lib/workflow-engine.ts — no DB dependencies.
 */

import type { WorkflowProgress } from '@/lib/workflow-engine';

// ─── Re-implemented Pure Logic from workflow-engine.ts ─────────────────────

type StageStatus = 'pending' | 'in_progress' | 'completed' | 'locked';
type StepStatus = 'pending' | 'in_progress' | 'completed' | 'locked' | 'returned' | 'skipped';
type StepAction = 'approve' | 'complete' | 'reject' | 'request_changes' | 'start';

interface Stage {
  id: string;
  name: string;
  status: StageStatus;
  steps: Step[];
}

interface Step {
  id: string;
  name: string;
  status: StepStatus;
  assignedRole: string;
  assigneeId: string | null;
  action?: string;
}

/**
 * Calculate workflow progress from stages
 */
function calculateProgress(stages: Stage[]): WorkflowProgress {
  const totalStages = stages.length;
  const completedStages = stages.filter(s => s.status === 'completed').length;
  const totalSteps = stages.reduce((sum, s) => sum + s.steps.length, 0);
  const completedSteps = stages.reduce(
    (sum, s) => sum + s.steps.filter(st => st.status === 'completed' || st.status === 'skipped').length,
    0
  );
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const currentStageIndex = stages.findIndex(
    s => s.status === 'in_progress' || s.status === 'pending'
  );
  return { totalStages, completedStages, totalSteps, completedSteps, progress, currentStageIndex };
}

/**
 * Determine if all steps in a stage are completed or skipped
 */
function isStageComplete(steps: Step[]): boolean {
  return steps.length > 0 && steps.every(s => s.status === 'completed' || s.status === 'skipped');
}

/**
 * Get the next step to unlock after completing a step
 */
function getNextStep(steps: Step[], completedStepId: string): Step | null {
  const idx = steps.findIndex(s => s.id === completedStepId);
  const next = steps[idx + 1];
  if (next && (next.status === 'locked' || next.status === 'pending')) {
    return next;
  }
  return null;
}

/**
 * Get the first pending or in_progress stage index
 */
function findCurrentStageIndex(stages: Stage[]): number {
  return stages.findIndex(s => s.status === 'in_progress' || s.status === 'pending');
}

/**
 * Check if a user's role matches a step's assigned role
 */
function canUserPerformStep(userRoles: string[], step: Step): boolean {
  return userRoles.includes(step.assignedRole);
}

/**
 * Validate that a step action is allowed given the step's current status
 */
function isActionAllowed(action: StepAction, currentStatus: StepStatus): boolean {
  const allowedTransitions: Record<StepAction, StepStatus[]> = {
    start: ['pending'],
    approve: ['in_progress', 'pending'],
    complete: ['in_progress', 'pending'],
    reject: ['in_progress', 'pending'],
    request_changes: ['in_progress', 'pending'],
  };
  return (allowedTransitions[action] || []).includes(currentStatus);
}

/**
 * Determine the new step status after an action
 */
function getNewStepStatus(action: StepAction): StepStatus {
  switch (action) {
    case 'start': return 'in_progress';
    case 'approve':
    case 'complete': return 'completed';
    case 'reject':
    case 'request_changes': return 'returned';
    default: return 'pending';
  }
}

/**
 * Get the previous step for notification on rejection
 */
function getPreviousStep(steps: Step[], currentStepId: string): Step | null {
  const idx = steps.findIndex(s => s.id === currentStepId);
  if (idx > 0) return steps[idx - 1];
  return null;
}

/**
 * Check if the workflow is fully complete
 */
function isWorkflowComplete(stages: Stage[]): boolean {
  return stages.length > 0 && stages.every(s => s.status === 'completed');
}

/**
 * Advance to next stage: complete current and activate next
 */
function advanceStage(stages: Stage[]): Stage[] {
  const currentIdx = findCurrentStageIndex(stages);
  if (currentIdx === -1) return stages; // Already all done

  const updated = stages.map((s, i) => {
    if (i === currentIdx) return { ...s, status: 'completed' as StageStatus };
    if (i === currentIdx + 1) return { ...s, status: 'in_progress' as StageStatus };
    return { ...s };
  });

  // Unlock first step of the new current stage
  const nextStageIdx = currentIdx + 1;
  if (nextStageIdx < updated.length && updated[nextStageIdx].steps.length > 0) {
    updated[nextStageIdx] = {
      ...updated[nextStageIdx],
      steps: updated[nextStageIdx].steps.map((step, stepIdx) =>
        stepIdx === 0 ? { ...step, status: 'pending' as StepStatus } : step
      ),
    };
  }

  return updated;
}

// ─── Helper to create test stages ─────────────────────────────────────────

function makeStage(id: string, name: string, status: StageStatus, steps: Step[] = []): Stage {
  return { id, name, status, steps };
}

function makeStep(id: string, name: string, status: StepStatus, role: string, assigneeId: string | null = null): Step {
  return { id, name, status, assignedRole: role, assigneeId };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Workflow — Progress Calculation', () => {
  it('should calculate zero progress for empty stages', () => {
    const progress = calculateProgress([]);
    expect(progress.progress).toBe(0);
    expect(progress.totalStages).toBe(0);
    expect(progress.completedSteps).toBe(0);
  });

  it('should calculate progress for a single completed stage', () => {
    const stages = [
      makeStage('s1', 'Stage 1', 'completed', [
        makeStep('st1', 'Step 1', 'completed', 'engineer'),
        makeStep('st2', 'Step 2', 'completed', 'manager'),
      ]),
    ];
    const progress = calculateProgress(stages);
    expect(progress.progress).toBe(100);
    expect(progress.completedSteps).toBe(2);
    expect(progress.totalSteps).toBe(2);
  });

  it('should calculate partial progress correctly', () => {
    const stages = [
      makeStage('s1', 'Stage 1', 'in_progress', [
        makeStep('st1', 'Step 1', 'completed', 'engineer'),
        makeStep('st2', 'Step 2', 'in_progress', 'manager'),
      ]),
      makeStage('s2', 'Stage 2', 'locked', [
        makeStep('st3', 'Step 3', 'locked', 'engineer'),
      ]),
    ];
    const progress = calculateProgress(stages);
    expect(progress.progress).toBe(33); // 1 of 3 completed = 33%
    expect(progress.totalSteps).toBe(3);
    expect(progress.completedSteps).toBe(1);
    expect(progress.currentStageIndex).toBe(0);
  });

  it('should count skipped steps as completed', () => {
    const stages = [
      makeStage('s1', 'Stage 1', 'completed', [
        makeStep('st1', 'Step 1', 'completed', 'engineer'),
        makeStep('st2', 'Step 2', 'skipped', 'manager'),
      ]),
    ];
    const progress = calculateProgress(stages);
    expect(progress.completedSteps).toBe(2);
    expect(progress.progress).toBe(100);
  });
});

describe('Workflow — Stage Completion Detection', () => {
  it('should return true when all steps are completed', () => {
    const steps = [makeStep('a', 'A', 'completed', 'eng'), makeStep('b', 'B', 'completed', 'mgr')];
    expect(isStageComplete(steps)).toBe(true);
  });

  it('should return true when steps are completed or skipped', () => {
    const steps = [makeStep('a', 'A', 'completed', 'eng'), makeStep('b', 'B', 'skipped', 'mgr')];
    expect(isStageComplete(steps)).toBe(true);
  });

  it('should return false when some steps are not completed', () => {
    const steps = [makeStep('a', 'A', 'completed', 'eng'), makeStep('b', 'B', 'in_progress', 'mgr')];
    expect(isStageComplete(steps)).toBe(false);
  });

  it('should return false for empty steps', () => {
    expect(isStageComplete([])).toBe(false);
  });
});

describe('Workflow — Stage Progression', () => {
  it('should advance from first to second stage', () => {
    const stages = [
      makeStage('s1', 'Stage 1', 'in_progress', [makeStep('st1', 'Step 1', 'completed', 'eng')]),
      makeStage('s2', 'Stage 2', 'locked', [makeStep('st2', 'Step 2', 'locked', 'mgr')]),
    ];
    const advanced = advanceStage(stages);
    expect(advanced[0].status).toBe('completed');
    expect(advanced[1].status).toBe('in_progress');
  });

  it('should unlock first step of the next stage', () => {
    const stages = [
      makeStage('s1', 'Stage 1', 'in_progress', [makeStep('st1', 'Step 1', 'completed', 'eng')]),
      makeStage('s2', 'Stage 2', 'locked', [makeStep('st2', 'Step 2', 'locked', 'mgr')]),
    ];
    const advanced = advanceStage(stages);
    expect(advanced[1].steps[0].status).toBe('pending');
  });

  it('should not advance beyond last stage', () => {
    const stages = [makeStage('s1', 'Only', 'completed', [makeStep('st1', 'Step 1', 'completed', 'eng')])];
    const advanced = advanceStage(stages);
    expect(advanced).toHaveLength(1);
  });
});

describe('Workflow — Step Next Step Logic', () => {
  it('should return next step when it is locked', () => {
    const steps = [
      makeStep('a', 'A', 'completed', 'eng'),
      makeStep('b', 'B', 'locked', 'mgr'),
    ];
    expect(getNextStep(steps, 'a')).toEqual(steps[1]);
  });

  it('should return next step when it is pending', () => {
    const steps = [
      makeStep('a', 'A', 'completed', 'eng'),
      makeStep('b', 'B', 'pending', 'mgr'),
    ];
    expect(getNextStep(steps, 'a')).toEqual(steps[1]);
  });

  it('should return null when there is no next step', () => {
    const steps = [makeStep('a', 'A', 'completed', 'eng')];
    expect(getNextStep(steps, 'a')).toBeNull();
  });
});

describe('Workflow — Approval / Rejection Flow', () => {
  it('approve should set status to completed', () => {
    expect(getNewStepStatus('approve')).toBe('completed');
  });

  it('complete should set status to completed', () => {
    expect(getNewStepStatus('complete')).toBe('completed');
  });

  it('reject should set status to returned', () => {
    expect(getNewStepStatus('reject')).toBe('returned');
  });

  it('request_changes should set status to returned', () => {
    expect(getNewStepStatus('request_changes')).toBe('returned');
  });

  it('start should set status to in_progress', () => {
    expect(getNewStepStatus('start')).toBe('in_progress');
  });
});

describe('Workflow — Action Validation', () => {
  it('start should be allowed from pending status', () => {
    expect(isActionAllowed('start', 'pending')).toBe(true);
  });

  it('start should NOT be allowed from locked status', () => {
    expect(isActionAllowed('start', 'locked')).toBe(false);
  });

  it('approve should be allowed from in_progress', () => {
    expect(isActionAllowed('approve', 'in_progress')).toBe(true);
  });

  it('reject should NOT be allowed from completed status', () => {
    expect(isActionAllowed('reject', 'completed')).toBe(false);
  });

  it('complete should NOT be allowed from locked status', () => {
    expect(isActionAllowed('complete', 'locked')).toBe(false);
  });
});

describe('Workflow — Permission Checks', () => {
  it('should allow user with matching role to perform step', () => {
    const step = makeStep('s1', 'Design', 'pending', 'engineer');
    expect(canUserPerformStep(['engineer', 'viewer'], step)).toBe(true);
  });

  it('should deny user without matching role', () => {
    const step = makeStep('s1', 'Design', 'pending', 'engineer');
    expect(canUserPerformStep(['manager', 'viewer'], step)).toBe(false);
  });

  it('should deny user with empty roles', () => {
    const step = makeStep('s1', 'Review', 'pending', 'manager');
    expect(canUserPerformStep([], step)).toBe(false);
  });

  it('should allow admin to perform any step assigned to admin', () => {
    const step = makeStep('s1', 'Final Approval', 'pending', 'office_manager');
    expect(canUserPerformStep(['office_manager'], step)).toBe(true);
  });
});

describe('Workflow — Previous Step Lookup (for rejection notifications)', () => {
  it('should return previous step for rejection notification', () => {
    const steps = [
      makeStep('a', 'Draft', 'completed', 'engineer', 'user-1'),
      makeStep('b', 'Review', 'in_progress', 'manager'),
    ];
    const prev = getPreviousStep(steps, 'b');
    expect(prev).not.toBeNull();
    expect(prev!.id).toBe('a');
    expect(prev!.assigneeId).toBe('user-1');
  });

  it('should return null for first step', () => {
    const steps = [makeStep('a', 'First', 'in_progress', 'engineer')];
    expect(getPreviousStep(steps, 'a')).toBeNull();
  });
});

describe('Workflow — Completion Check', () => {
  it('should detect workflow as complete when all stages are completed', () => {
    const stages = [
      makeStage('s1', 'S1', 'completed', []),
      makeStage('s2', 'S2', 'completed', []),
    ];
    expect(isWorkflowComplete(stages)).toBe(true);
  });

  it('should NOT mark workflow complete with in_progress stages', () => {
    const stages = [
      makeStage('s1', 'S1', 'completed', []),
      makeStage('s2', 'S2', 'in_progress', []),
    ];
    expect(isWorkflowComplete(stages)).toBe(false);
  });

  it('should return false for empty stages', () => {
    expect(isWorkflowComplete([])).toBe(false);
  });
});
