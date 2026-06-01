/**
 * API Validation Utilities — أدوات التحقق من صحة البيانات في API Routes
 *
 * Provides Zod-based server-side validation for all API endpoints.
 * Ensures incoming data is properly validated before processing,
 * preventing injection attacks and data corruption.
 *
 * Schema definitions are decomposed into:
 *   ./validations/common.schema   — shared helpers, pagination, payment schemas
 *   ./validations/entity.schema   — entity CREATE schemas
 *   ./validations/update.schema   — entity UPDATE schemas
 *   ./validations/auth.schema     — auth schemas
 *   ./validations/project.schema  — project schemas
 *   ./validations/user.schema     — user schemas
 */

import { z, ZodSchema, ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { idParamSchema } from './validations/common.schema';

// ===== Re-export all schema modules =====

export * from './validations/auth.schema';
export * from './validations/project.schema';
export * from './validations/user.schema';
export * from './validations/common.schema';
export * from './validations/entity.schema';
export * from './validations/update.schema';

// ===== Validation Result Types =====

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: string;
  errors?: Record<string, string[]>;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// ===== Core Validation Function =====

/**
 * Validate request data against a Zod schema — يتحقق من صحة البيانات باستخدام مخطط Zod
 */
export function validateRequest<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const path = issue.path.join('.') || '_root';
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      }

      const firstError = error.issues[0];
      const mainMessage = firstError?.message || 'بيانات غير صالحة';

      return {
        success: false,
        error: mainMessage,
        errors: fieldErrors,
      };
    }
    return {
      success: false,
      error: 'بيانات غير صالحة',
    };
  }
}

/**
 * Validate a NextRequest body against a Zod schema — يتحقق من صحة جسم الطلب باستخدام مخطط Zod
 *
 * Returns parsed data or a 400 NextResponse automatically.
 * Usage:
 *   const result = await validateBody(req, mySchema);
 *   if (result instanceof NextResponse) return result; // validation failed
 *   const data = result; // validated data
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<T | NextResponse> {
  try {
    const body = await req.json();
    const result = validateRequest(schema, body);
    if (result.success) return result.data;
    return NextResponse.json(
      { error: result.error, errors: result.errors },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }
}

/**
 * Validate URL search params against a Zod schema — يتحقق من صحة معاملات البحث باستخدام مخطط Zod
 */
export function validateSearchParams<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): T | NextResponse {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const result = validateRequest(schema, params);
    if (result.success) return result.data;
    return NextResponse.json(
      { error: result.error, errors: result.errors },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid search parameters' },
      { status: 400 }
    );
  }
}

/**
 * Validate an ID parameter from a route handler.
 * Returns the validated ID string, or a 400 NextResponse if invalid.
 *
 * Usage:
 *   const rawId = (await params).id;
 *   const idResult = validateIdParam(rawId);
 *   if (!idResult.success) return idResult.response;
 *   const id = idResult.id;
 */
export function validateIdParam(
  rawId: string
): { success: true; id: string } | { success: false; response: NextResponse } {
  const result = validateRequest(idParamSchema, { id: rawId });
  if (result.success) return { success: true, id: result.data.id };
  return {
    success: false,
    response: NextResponse.json(
      { error: result.error, errors: result.errors },
      { status: 400 }
    ),
  };
}
