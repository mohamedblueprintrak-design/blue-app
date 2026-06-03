import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeObject } from '@/lib/security/sanitize';
import { projectSchema } from '@/lib/validations';
import { orgFilter, orgCreate, requireVerifiedPermission } from '../utils/auth';
import { errorResponse } from '../utils/response';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '../utils/pagination';
import { cacheGetOrSet, cacheDeletePattern } from '@/lib/cache/redis';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

/**
 * @openapi
 * /api/projects:
 *   get:
 *     tags: [Projects]
 *     summary: List projects
 *     description: Retrieve a paginated list of projects with optional search and filtering. Results are scoped to the user's organization and cached for 30 seconds. Requires PROJECT_READ permission.
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search by project name (Arabic/English), number, location, or client name
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [ACTIVE, COMPLETED, DELAYED, ON_HOLD, CANCELLED]
 *         description: Filter by project status
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [VILLA, BUILDING, TOWER, COMPOUND, INFRASTRUCTURE, INTERIOR, LANDSCAPE]
 *         description: Filter by project type
 *     responses:
 *       200:
 *         description: Paginated list of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       number:
 *                         type: string
 *                       name:
 *                         type: string
 *                       nameEn:
 *                         type: string
 *                       status:
 *                         type: string
 *                       type:
 *                         type: string
 *                       budget:
 *                         type: number
 *                       progress:
 *                         type: number
 *                       location:
 *                         type: string
 *                       client:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           name: { type: string }
 *                           company: { type: string }
 *                       contractor:
 *                         type: object
 *                         nullable: true
 *                       _count:
 *                         type: object
 *                         properties:
 *                           tasks: { type: integer }
 *                           stages: { type: integer }
 *                           invoices: { type: integer }
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Missing PROJECT_READ permission
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const { page, limit } = parsePaginationParams(searchParams);

    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(user) };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameEn: { contains: search } },
        { number: { contains: search } },
        { location: { contains: search } },
        { client: { name: { contains: search } } },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (type && type !== "all") {
      where.type = type;
    }

    // Build cache key from query parameters
    const cacheKey = `projects:${user.organizationId || 'global'}:${page}:${limit}:${search}:${status}:${type}`;

    const { projects, total } = await cacheGetOrSet(
      cacheKey,
      async () => {
        const [projects, total] = await Promise.all([
          db.project.findMany({
            where,
            include: {
              client: {
                select: { id: true, name: true, company: true },
              },
              contractor: {
                select: { id: true, name: true, companyName: true, category: true },
              },
              assignments: {
                select: { userId: true, role: true },
              },
              _count: {
                select: { tasks: true, stages: true, invoices: true },
              },
            },
            orderBy: { updatedAt: "desc" },
            skip: calculateSkip(page, limit),
            take: limit,
          }),
          db.project.count({ where }),
        ]);
        return { projects, total };
      },
      30 // Cache project list for 30 seconds
    );

    return NextResponse.json({
      projects,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    log.error("Error fetching projects:", error);
    return errorResponse("Failed to fetch projects", "SERVER_ERROR", 500);
  }
}

/**
 * @openapi
 * /api/projects:
 *   post:
 *     tags: [Projects]
 *     summary: Create project
 *     description: Create a new project. Requires PROJECT_CREATE permission. Input is validated and sanitized. Cache is invalidated after creation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [number, name, clientId]
 *             properties:
 *               number:
 *                 type: string
 *                 description: Unique project number
 *                 example: "PRJ-2025-001"
 *               name:
 *                 type: string
 *                 description: Project name (Arabic)
 *                 example: "فيلا محمد الرشيدي"
 *               nameEn:
 *                 type: string
 *                 description: Project name (English)
 *                 example: "Mohammed Al Rashid Villa"
 *               clientId:
 *                 type: string
 *                 description: Client ID
 *               contractorId:
 *                 type: string
 *                 nullable: true
 *                 description: Contractor ID
 *               location:
 *                 type: string
 *                 description: Project location
 *                 example: "Al Hamra, RAK"
 *               plotNumber:
 *                 type: string
 *                 description: Plot number
 *               type:
 *                 type: string
 *                 enum: [VILLA, BUILDING, TOWER, COMPOUND, INFRASTRUCTURE, INTERIOR, LANDSCAPE]
 *                 default: VILLA
 *               budget:
 *                 type: number
 *                 description: Project budget in company currency
 *                 example: 2500000
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Project start date
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Project end date
 *               description:
 *                 type: string
 *                 description: Project description
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 description: GPS latitude coordinate
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 description: GPS longitude coordinate
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Created project with client and contractor details
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Missing PROJECT_CREATE permission
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
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_CREATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const rawBody = await request.json();

    // SECURITY: Validate first, then sanitize.
    // Sanitizing before validation can corrupt legitimate data (e.g., < becomes &lt;)
    // which would then pass validation but store corrupted content.
    const validation = projectSchema.safeParse(rawBody);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, "VALIDATION_ERROR", 400);
    }
    const validatedData = validation.data;

    // Sanitize validated data before storage
    const sanitizedData = sanitizeObject(validatedData);

    // SECURITY: createdById comes from JWT, not request body
    // Extract coordinates from raw body with type validation
    const rawLat = (rawBody as Record<string, unknown>).latitude;
    const rawLng = (rawBody as Record<string, unknown>).longitude;
    const latitude = typeof rawLat === 'number' && rawLat >= -90 && rawLat <= 90 ? rawLat : null;
    const longitude = typeof rawLng === 'number' && rawLng >= -180 && rawLng <= 180 ? rawLng : null;

    const {
      number,
      name,
      nameEn,
      clientId,
      contractorId,
      location,
      plotNumber,
      type,
      budget,
      startDate,
      endDate,
      description,
    } = sanitizedData;

    // Type-safe project type conversion — ensures value matches Prisma enum
    const projectType = (type || "VILLA") as Parameters<typeof db.project.create>[0]['data']['type'];

    const project = await db.project.create({
      data: {
        number,
        name,
        nameEn: nameEn || "",
        clientId,
        contractorId: contractorId || null,
        location: location || "",
        latitude: typeof latitude === 'number' ? latitude : null,
        longitude: typeof longitude === 'number' ? longitude : null,
        plotNumber: plotNumber || "",
        type: projectType,
        budget: typeof budget === 'string' ? parseFloat(budget) : (budget || 0),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        description: description || "",
        ...orgCreate(user),
        createdById: user.userId,
      },
      include: {
        client: {
          select: { id: true, name: true, company: true },
        },
        contractor: {
          select: { id: true, name: true, companyName: true, category: true },
        },
      },
    });

    // Invalidate project cache after mutation
    await cacheDeletePattern(`projects:${user.organizationId || 'global'}:*`);
    // Also invalidate dashboard cache
    await cacheDeletePattern(`dashboard:${user.organizationId || 'global'}:*`);

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    log.error("Error creating project:", error);
    return errorResponse("Failed to create project", "SERVER_ERROR", 500);
  }
}
