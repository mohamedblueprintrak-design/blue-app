import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeObject } from '@/lib/security/sanitize';
import { taskSchema } from '@/lib/validations';
import { orgFilter, orgCreate, requireVerifiedPermission } from '../utils/auth';
import { insensitiveContains } from '../utils/db';
import { errorResponse } from '../utils/response';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '../utils/pagination';
import { cacheGetOrSet } from '@/lib/cache/redis';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { applyAutoAssignment } from '@/lib/services/auto-assignment.service';

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: List tasks
 *     description: Retrieve a paginated list of top-level tasks scoped to the user's organization. Includes project, assignee, subtask progress, and comment count. Requires TASK_READ permission.
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search by task title or description
 *       - name: projectId
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter tasks by project ID
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED]
 *         description: Filter by task status
 *       - name: assigneeId
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by assignee user ID
 *       - name: priority
 *         in: query
 *         schema:
 *           type: string
 *           enum: [LOW, NORMAL, HIGH, URGENT]
 *         description: Filter by priority
 *     responses:
 *       200:
 *         description: Paginated list of tasks with subtask progress
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       status:
 *                         type: string
 *                       priority:
 *                         type: string
 *                       progress:
 *                         type: integer
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       dueDate:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       project:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           name: { type: string }
 *                           nameEn: { type: string }
 *                           number: { type: string }
 *                       assignee:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id: { type: string }
 *                           name: { type: string }
 *                           email: { type: string }
 *                           avatar: { type: string }
 *                       commentCount:
 *                         type: integer
 *                       _count:
 *                         type: object
 *                         properties:
 *                           subtasks: { type: integer }
 *                           completedSubtasks: { type: integer }
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Missing TASK_READ permission
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting — API limiter (100 req/min per IP)
    const { result: rlResult } = await withRateLimit(request, 'api');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.TASK_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const assigneeId = searchParams.get("assigneeId");
    const priority = searchParams.get("priority");
    const { page, limit, search } = parsePaginationParams(searchParams);

    const where: Record<string, unknown> = {
      parentId: null, // Only top-level tasks
      ...orgFilter(user),
    };

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (priority) where.priority = priority;

    // Search filter
    if (search) {
      where.OR = [
        { title: insensitiveContains(search) },
        { description: insensitiveContains(search) },
      ];
    }

    const cacheKey = `tasks:${user.organizationId || 'global'}:${page}:${limit}:${search}:${projectId}:${status}:${assigneeId}:${priority}`;

    const { tasks, total } = await cacheGetOrSet(
      cacheKey,
      async () => {
    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          project: {
            select: { id: true, name: true, nameEn: true, number: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          subtasks: {
            where: { status: "DONE" },
            select: { id: true },
          },
          _count: {
            select: { comments: true, subtasks: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: calculateSkip(page, limit),
        take: limit,
      }),
      db.task.count({ where }),
    ]);
    return { tasks, total };
      },
      30 // Cache task list for 30 seconds
    );

    // Calculate subtask completion for each task
    const tasksWithSubtaskCount = tasks.map((task) => {
      return {
        ...task,
        commentCount: task._count.comments,
        _count: {
          subtasks: task._count.subtasks,
          completedSubtasks: task.subtasks.length,
        },
      };
    });

    return NextResponse.json({ tasks: tasksWithSubtaskCount, pagination: buildPaginationMeta(page, limit, total) });
  } catch (error) {
    log.error("Error fetching tasks:", error);
    return errorResponse("Failed to fetch tasks", "SERVER_ERROR", 500);
  }
}

/**
 * @openapi
 * /api/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create task
 *     description: Create a new task. Requires TASK_CREATE permission. Input is validated with Zod and sanitized. Supports subtask creation via separate endpoint.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *                 example: "Review structural drawings"
 *               description:
 *                 type: string
 *                 description: Task description
 *               projectId:
 *                 type: string
 *                 description: Project ID to associate with
 *               assigneeId:
 *                 type: string
 *                 nullable: true
 *                 description: User ID of the assignee
 *               priority:
 *                 type: string
 *                 enum: [LOW, NORMAL, HIGH, URGENT]
 *                 default: NORMAL
 *               status:
 *                 type: string
 *                 enum: [TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED]
 *                 default: TODO
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Task start date
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 description: Task due date
 *               taskType:
 *                 type: string
 *                 enum: [STANDARD, GOVERNMENTAL]
 *                 default: STANDARD
 *                 description: Task type
 *               isGovernmental:
 *                 type: boolean
 *                 default: false
 *                 description: Shorthand for setting taskType to GOVERNMENTAL
 *               slaDays:
 *                 type: string
 *                 description: SLA duration in days
 *               progress:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 0
 *                 description: Initial progress percentage
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Created task with project and assignee details
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Missing TASK_CREATE permission
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.TASK_CREATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    // Zod validation for task fields
    const validation = taskSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, "VALIDATION_ERROR", 400);
    }
    const validatedData = validation.data;

    // progress is not part of the schema but may be passed
    const { progress } = body as Record<string, unknown>;

    const {
      title,
      description,
      projectId,
      assigneeId,
      priority,
      status,
      startDate,
      dueDate,
      taskType,
      isGovernmental,
      slaDays,
    } = validatedData;

    // Convert isGovernmental boolean to taskType if taskType not provided
    const resolvedTaskType = taskType || (isGovernmental ? 'GOVERNMENTAL' : 'STANDARD');

    const task = await db.task.create({
      data: {
        title,
        description: description || "",
        projectId: projectId || null,
        assigneeId: assigneeId || null,
        priority: (priority || "NORMAL"),
        status: (status || "TODO"),
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        taskType: resolvedTaskType,
        slaDays: slaDays ? parseInt(slaDays) : null,
        progress: typeof progress === 'number' ? progress : (parseInt(String(progress)) || 0),
        ...orgCreate(user),
        createdById: user.userId,
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true, type: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        subtasks: true,
      },
    });

    // Apply auto-assignment if no assignee was explicitly provided
    if (!assigneeId) {
      try {
        // Build entity data for rule evaluation from the task and its project
        const entityData: Record<string, unknown> = {
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          taskType: task.taskType,
          projectId: task.projectId,
          projectType: task.project?.type || null,
          createdById: task.createdById,
        };

        const autoAssigneeId = await applyAutoAssignment(
          task.id,
          entityData,
          user.organizationId,
          user
        );

        if (autoAssigneeId) {
          // Re-fetch the task with the updated assignee to include in response
          const updatedTask = await db.task.findUnique({
            where: { id: task.id },
            include: {
              project: {
                select: { id: true, name: true, nameEn: true, number: true },
              },
              assignee: {
                select: { id: true, name: true, email: true, avatar: true },
              },
              subtasks: true,
            },
          });
          return NextResponse.json(updatedTask, { status: 201 });
        }
      } catch (autoAssignError) {
        // Auto-assignment failure should not block task creation
        log.warn('[TaskCreate] Auto-assignment failed:', { error: String(autoAssignError) });
      }
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    log.error("Error creating task:", error);
    return errorResponse("Failed to create task", "SERVER_ERROR", 500);
  }
}
