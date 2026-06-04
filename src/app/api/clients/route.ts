import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeObject, sanitizeEmail } from '@/lib/security/sanitize';
import { clientSchema } from '@/lib/validations';
import { orgFilter, orgCreate, requireVerifiedPermission } from '../utils/auth';
import { errorResponse } from '../utils/response';
import { Permission } from '@/lib/auth/types';
import { cacheGetOrSet, cacheDeletePattern } from '@/lib/cache/redis';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

/**
 * @openapi
 * /api/clients:
 *   get:
 *     tags: [Clients]
 *     summary: List clients
 *     description: Retrieve a paginated list of clients scoped to the user's organization. Results include project, invoice, and contract counts. Requires CLIENT_READ permission.
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
 *           default: 50
 *         description: Items per page
 *       - name: projectId
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter clients by project ID
 *     responses:
 *       200:
 *         description: Paginated list of clients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       company:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       address:
 *                         type: string
 *                       taxNumber:
 *                         type: string
 *                       creditLimit:
 *                         type: number
 *                       paymentTerms:
 *                         type: string
 *                       _count:
 *                         type: object
 *                         properties:
 *                           projects: { type: integer }
 *                           invoices: { type: integer }
 *                           contracts: { type: integer }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Missing CLIENT_READ permission
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
    const rbac = await requireVerifiedPermission(request, Permission.CLIENT_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(user) };

    if (projectId) {
      where.projects = { some: { id: projectId } };
    }

    // Build cache key from query parameters
    const cacheKey = `clients:${user.organizationId || 'global'}:${page}:${limit}:${projectId || ''}`;

    const result = await cacheGetOrSet(
      cacheKey,
      async () => {
        const whereClause = Object.keys(where).length > 0 ? where : undefined;
        const [clients, total] = await Promise.all([
          db.client.findMany({
            where: whereClause,
            include: {
              _count: {
                select: {
                  projects: true,
                  invoices: true,
                  contracts: true,
                },
              },
            },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          db.client.count({ where: whereClause }),
        ]);
        return { clients, total };
      },
      60 // Cache client list for 60 seconds
    );

    return NextResponse.json({ data: result.clients, pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) } });
  } catch (error) {
    log.error("Error fetching clients:", error);
    return errorResponse("Failed to fetch clients", "SERVER_ERROR", 500);
  }
}

/**
 * @openapi
 * /api/clients:
 *   post:
 *     tags: [Clients]
 *     summary: Create client
 *     description: Create a new client. Requires CLIENT_CREATE permission. Input is validated with Zod and sanitized. Cache is invalidated after creation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Client name
 *                 example: "مؤسسة الراشد الهندسية"
 *               company:
 *                 type: string
 *                 description: Company name
 *                 example: "Al Rashid Engineering LLC"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Client email
 *                 example: "info@alrashid.ae"
 *               phone:
 *                 type: string
 *                 description: Phone number
 *                 example: "+971-7-222-3333"
 *               address:
 *                 type: string
 *                 description: Physical address
 *               taxNumber:
 *                 type: string
 *                 description: Tax registration number
 *               creditLimit:
 *                 type: number
 *                 description: Credit limit in AED
 *                 example: 500000
 *               paymentTerms:
 *                 type: string
 *                 description: Payment terms (e.g. Net 30)
 *                 example: "Net 30"
 *     responses:
 *       201:
 *         description: Client created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Created client with relation counts
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Missing CLIENT_CREATE permission
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
    const rbac = await requireVerifiedPermission(request, Permission.CLIENT_CREATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const rawBody = await request.json();
    const validation = clientSchema.safeParse(rawBody);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, "VALIDATION_ERROR", 400);
    }
    const body = sanitizeObject(validation.data);
    const validatedData = validation.data;
    const sanitizedEmail = validatedData.email ? sanitizeEmail(validatedData.email) : "";

    const client = await db.client.create({
      data: {
        name: validatedData.name,
        company: validatedData.company || "",
        email: sanitizedEmail,
        phone: validatedData.phone || "",
        address: validatedData.address || "",
        taxNumber: validatedData.taxNumber || "",
        creditLimit: validatedData.creditLimit ? parseFloat(validatedData.creditLimit) : 0,
        paymentTerms: validatedData.paymentTerms || "",
        ...orgCreate(user),
        createdById: user.userId,
      },
      include: {
        _count: {
          select: {
            projects: true,
            invoices: true,
            contracts: true,
          },
        },
      },
    });

    // Invalidate client cache after mutation
    await cacheDeletePattern(`clients:${user.organizationId || 'global'}:*`);
    // Also invalidate dashboard cache
    await cacheDeletePattern(`dashboard:${user.organizationId || 'global'}:*`);

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    log.error("Error creating client:", error);
    return errorResponse("Failed to create client", "SERVER_ERROR", 500);
  }
}
