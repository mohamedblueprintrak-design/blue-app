// @ts-check
import { db, isDatabaseAvailable } from '@/lib/db';

// Extended database client type for models not yet in the Prisma schema
interface WorkflowPhaseRecord {
  id: string;
  phaseType: string;
  phaseCategory: string;
  status: string;
  order: number;
  dependsOnId: string | null;
  projectId: string;
  dependsOn?: WorkflowPhaseRecord | null;
  project: {
    managerId: string | null;
    workflowPhases: WorkflowPhaseRecord[];
  };
}

type ExtendedPrismaClient = typeof db & {
  workflowPhase: {
    findUnique: (args: { where: { id: string }; include: Record<string, unknown> }) => Promise<WorkflowPhaseRecord | null>;
    findMany: (args: { where: Record<string, unknown>; include: Record<string, unknown>; orderBy?: Record<string, string> }) => Promise<WorkflowPhaseRecord[]>;
  };
};
const extDb = db as ExtendedPrismaClient;

/**
 * Phase Dependency Service
 * Validates and enforces engineering workflow dependencies:
 *
 * Rules:
 * 1. Structural cannot start before Architectural Client Approval is COMPLETED
 * 2. Municipality submission cannot happen without Final Drawings being COMPLETED
 * 3. MEP cannot start before Architectural is at least IN_PROGRESS
 * 4. CONSTRUCTION phases cannot start without at least ONE government approval COMPLETED
 * 5. CONTRACTING phases cannot start without PROJECT_MANAGER assignment on the project
 * 6. Any phase with dependsOnId requires the parent phase to be COMPLETED
 * 7. Invoice cannot be issued for a phase that hasn't started
 */

interface ValidationResult {
  allowed: boolean;
  reason?: string;
  blockedBy?: string;
}

interface PhaseDependencyNode {
  phase: {
    id: string;
    phaseType: string;
    phaseCategory: string;
    status: string;
    order: number;
  };
  blocked: boolean;
  blockedBy: string[];
  canStart: boolean;
  dependencyChain: string[];
}

interface PhaseViolation {
  phaseId: string;
  phaseType: string;
  violations: string[];
}

/**
 * Check if a phase transition is allowed based on dependencies
 */
export async function validatePhaseTransition(
  phaseId: string,
  targetStatus: string
): Promise<ValidationResult> {
  if (!await isDatabaseAvailable()) {
    return { allowed: true };
  }

  const phase = await extDb.workflowPhase.findUnique({
    where: { id: phaseId },
    include: {
      project: {
        include: {
          workflowPhases: true,
          MANAGER: { select: { id: true } },
        },
      },
      dependsOn: true,
    },
  });

  if (!phase) {
    return { allowed: false, reason: 'Phase not found' };
  }

  // Only enforce dependencies when transitioning TO in_progress
  if (targetStatus !== 'IN_PROGRESS') {
    return { allowed: true };
  }

  // Rule 6: Check direct dependency (dependsOnId) — parent must be COMPLETED
  if (phase.dependsOnId) {
    const dependency = phase.dependsOn;
    if (dependency && dependency.status !== 'COMPLETED') {
      return {
        allowed: false,
        reason: `Cannot start until "${dependency.phaseType}" is completed`,
        blockedBy: dependency.phaseType,
      };
    }
  }

  // Rule 1: Structural phases require Architectural Client Approval
  if (phase.phaseCategory === 'STRUCTURAL') {
    const archClientApproval = phase.project.workflowPhases.find(
      p => p.phaseType === 'CLIENT_APPROVAL' && p.phaseCategory === 'ARCHITECTURAL'
    );
    if (archClientApproval && archClientApproval.status !== 'COMPLETED') {
      return {
        allowed: false,
        reason: 'Structural work requires Architectural Client Approval to be completed first',
        blockedBy: 'Architectural Client Approval',
      };
    }
  }

  // Rule 2: Government submissions require Final Drawings
  if (phase.phaseCategory === 'GOVERNMENT') {
    const finalDrawings = phase.project.workflowPhases.find(
      p => p.phaseType === 'FINAL_DRAWINGS' && p.phaseCategory === 'ARCHITECTURAL'
    );
    if (finalDrawings && finalDrawings.status !== 'COMPLETED') {
      return {
        allowed: false,
        reason: 'Government submissions require Final Drawings to be completed first',
        blockedBy: 'Final Drawings',
      };
    }
  }

  // Rule 3: MEP requires Architectural at least IN_PROGRESS
  if (phase.phaseCategory === 'MEP') {
    const archPhases = phase.project.workflowPhases.filter(
      p => p.phaseCategory === 'ARCHITECTURAL'
    );
    const hasInProgress = archPhases.some(p => p.status === 'IN_PROGRESS' || p.status === 'COMPLETED');
    if (!hasInProgress && archPhases.length > 0) {
      return {
        allowed: false,
        reason: 'MEP work requires Architectural phase to be in progress at minimum',
        blockedBy: 'Architectural phases',
      };
    }
  }

  // Rule 4: CONSTRUCTION phases require at least ONE government approval COMPLETED
  if (phase.phaseCategory === 'CONSTRUCTION') {
    const govPhases = phase.project.workflowPhases.filter(
      p => p.phaseCategory === 'GOVERNMENT'
    );
    const hasCompletedApproval = govPhases.some(p => p.status === 'COMPLETED');
    if (govPhases.length > 0 && !hasCompletedApproval) {
      return {
        allowed: false,
        reason: 'Construction phases require at least one government approval to be completed first',
        blockedBy: 'Government Approvals',
      };
    }
  }

  // Rule 5: CONTRACTING phases require PROJECT_MANAGER assignment on the project
  if (phase.phaseCategory === 'CONTRACTING') {
    if (!phase.project.managerId) {
      return {
        allowed: false,
        reason: 'Contracting phases require a Project Manager to be assigned to the project',
        blockedBy: 'Project Manager Assignment',
      };
    }
  }

  return { allowed: true };
}

/**
 * Get all phases that are blocked by dependencies
 */
export async function getBlockedPhases(projectId: string) {
  if (!await isDatabaseAvailable()) return [];

  const phases = await extDb.workflowPhase.findMany({
    where: { projectId },
    include: { dependsOn: true },
  });

  const blocked: Array<{ phaseId: string; phaseType: string; blockedBy: string }> = [];

  for (const phase of phases) {
    if (phase.status === 'NOT_STARTED' && phase.dependsOnId) {
      const dependency = phase.dependsOn;
      if (dependency && dependency.status !== 'COMPLETED') {
        blocked.push({
          phaseId: phase.id,
          phaseType: phase.phaseType,
          blockedBy: dependency.phaseType,
        });
      }
    }
  }

  return blocked;
}

/**
 * Get a full dependency graph for all phases in a project.
 * Each phase includes: { phase, blocked, blockedBy, canStart, dependencyChain }
 * Useful for frontend to show which phases are blocked and why.
 */
export async function getPhaseDependencies(
  projectId: string
): Promise<PhaseDependencyNode[]> {
  if (!await isDatabaseAvailable()) return [];

  const phases = await extDb.workflowPhase.findMany({
    where: { projectId },
    include: {
      dependsOn: true,
      project: {
        include: {
          MANAGER: { select: { id: true } },
          workflowPhases: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  });

  const result: PhaseDependencyNode[] = [];

  for (const phase of phases) {
    const blockedBy: string[] = [];
    const dependencyChain: string[] = [];
    let blocked = false;

    // Rule 6: Direct dependency check
    if (phase.dependsOnId && phase.dependsOn && phase.dependsOn.status !== 'COMPLETED') {
      blockedBy.push(phase.dependsOn.phaseType);
      dependencyChain.push(`Direct: ${phase.dependsOn.phaseType} (${phase.dependsOn.status})`);
      blocked = true;
    }

    // Rule 1: Structural → Architectural Client Approval
    if (phase.phaseCategory === 'STRUCTURAL') {
      const archApproval = phase.project.workflowPhases.find(
        p => p.phaseType === 'CLIENT_APPROVAL' && p.phaseCategory === 'ARCHITECTURAL'
      );
      if (archApproval && archApproval.status !== 'COMPLETED') {
        blockedBy.push('Architectural Client Approval');
        dependencyChain.push(`Structural Rule: Client Approval is ${archApproval.status}`);
        blocked = true;
      }
    }

    // Rule 2: Government → Final Drawings
    if (phase.phaseCategory === 'GOVERNMENT') {
      const finalDrawings = phase.project.workflowPhases.find(
        p => p.phaseType === 'FINAL_DRAWINGS' && p.phaseCategory === 'ARCHITECTURAL'
      );
      if (finalDrawings && finalDrawings.status !== 'COMPLETED') {
        blockedBy.push('Final Drawings');
        dependencyChain.push(`Government Rule: Final Drawings is ${finalDrawings.status}`);
        blocked = true;
      }
    }

    // Rule 3: MEP → Architectural IN_PROGRESS
    if (phase.phaseCategory === 'MEP') {
      const archPhases = phase.project.workflowPhases.filter(
        p => p.phaseCategory === 'ARCHITECTURAL'
      );
      const hasProgress = archPhases.some(p => p.status === 'IN_PROGRESS' || p.status === 'COMPLETED');
      if (!hasProgress && archPhases.length > 0) {
        blockedBy.push('Architectural phases');
        dependencyChain.push('MEP Rule: No Architectural phase is in progress');
        blocked = true;
      }
    }

    // Rule 4: Construction → At least one Government approval completed
    if (phase.phaseCategory === 'CONSTRUCTION') {
      const govPhases = phase.project.workflowPhases.filter(
        p => p.phaseCategory === 'GOVERNMENT'
      );
      const hasApproval = govPhases.some(p => p.status === 'COMPLETED');
      if (govPhases.length > 0 && !hasApproval) {
        blockedBy.push('Government Approvals');
        dependencyChain.push('Construction Rule: No government approval completed');
        blocked = true;
      }
    }

    // Rule 5: Contracting → Project Manager assigned
    if (phase.phaseCategory === 'CONTRACTING') {
      if (!phase.project.managerId) {
        blockedBy.push('Project Manager Assignment');
        dependencyChain.push('Contracting Rule: No Project Manager assigned');
        blocked = true;
      }
    }

    result.push({
      phase: {
        id: phase.id,
        phaseType: phase.phaseType,
        phaseCategory: phase.phaseCategory,
        status: phase.status,
        order: phase.order,
      },
      blocked,
      blockedBy: [...new Set(blockedBy)],
      canStart: !blocked || phase.status === 'IN_PROGRESS' || phase.status === 'COMPLETED',
      dependencyChain,
    });
  }

  return result;
}

/**
 * Validate ALL phases in a project for violations.
 * Returns array of { phaseId, phaseType, violations: string[] }
 */
export async function validateAllPhaseTransitions(
  projectId: string
): Promise<PhaseViolation[]> {
  if (!await isDatabaseAvailable()) return [];

  const phases = await extDb.workflowPhase.findMany({
    where: { projectId },
    include: {
      project: {
        include: {
          MANAGER: { select: { id: true } },
          workflowPhases: true,
        },
      },
      dependsOn: true,
    },
    orderBy: { order: 'asc' },
  });

  const violations: PhaseViolation[] = [];

  for (const phase of phases) {
    const phaseViolations: string[] = [];

    // Rule 6: Direct dependency
    if (phase.dependsOnId && phase.dependsOn && phase.dependsOn.status !== 'COMPLETED') {
      if (phase.status === 'IN_PROGRESS') {
        phaseViolations.push(
          `Phase is IN_PROGRESS but depends on "${phase.dependsOn.phaseType}" which is ${phase.dependsOn.status}. Expected: COMPLETED.`
        );
      }
    }

    // Rule 1: Structural → Architectural Client Approval
    if (phase.phaseCategory === 'STRUCTURAL' && phase.status === 'IN_PROGRESS') {
      const archApproval = phase.project.workflowPhases.find(
        p => p.phaseType === 'CLIENT_APPROVAL' && p.phaseCategory === 'ARCHITECTURAL'
      );
      if (archApproval && archApproval.status !== 'COMPLETED') {
        phaseViolations.push(
          `Structural phase is IN_PROGRESS but Architectural Client Approval is ${archApproval.status}. Expected: COMPLETED.`
        );
      }
    }

    // Rule 2: Government → Final Drawings
    if (phase.phaseCategory === 'GOVERNMENT' && phase.status === 'IN_PROGRESS') {
      const finalDrawings = phase.project.workflowPhases.find(
        p => p.phaseType === 'FINAL_DRAWINGS' && p.phaseCategory === 'ARCHITECTURAL'
      );
      if (finalDrawings && finalDrawings.status !== 'COMPLETED') {
        phaseViolations.push(
          `Government phase is IN_PROGRESS but Final Drawings is ${finalDrawings.status}. Expected: COMPLETED.`
        );
      }
    }

    // Rule 3: MEP → Architectural IN_PROGRESS
    if (phase.phaseCategory === 'MEP' && phase.status === 'IN_PROGRESS') {
      const archPhases = phase.project.workflowPhases.filter(
        p => p.phaseCategory === 'ARCHITECTURAL'
      );
      const hasProgress = archPhases.some(p => p.status === 'IN_PROGRESS' || p.status === 'COMPLETED');
      if (!hasProgress && archPhases.length > 0) {
        phaseViolations.push(
          'MEP phase is IN_PROGRESS but no Architectural phase is in progress or completed.'
        );
      }
    }

    // Rule 4: Construction → Government approval
    if (phase.phaseCategory === 'CONSTRUCTION' && phase.status === 'IN_PROGRESS') {
      const govPhases = phase.project.workflowPhases.filter(
        p => p.phaseCategory === 'GOVERNMENT'
      );
      const hasApproval = govPhases.some(p => p.status === 'COMPLETED');
      if (govPhases.length > 0 && !hasApproval) {
        phaseViolations.push(
          'Construction phase is IN_PROGRESS but no government approval has been completed.'
        );
      }
    }

    // Rule 5: Contracting → Project Manager
    if (phase.phaseCategory === 'CONTRACTING' && phase.status === 'IN_PROGRESS') {
      if (!phase.project.managerId) {
        phaseViolations.push(
          'Contracting phase is IN_PROGRESS but no Project Manager is assigned to the project.'
        );
      }
    }

    if (phaseViolations.length > 0) {
      violations.push({
        phaseId: phase.id,
        phaseType: phase.phaseType,
        violations: phaseViolations,
      });
    }
  }

  return violations;
}
