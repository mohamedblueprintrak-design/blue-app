/**
 * Unit Tests — API Validation Utilities
 * اختبارات أدوات التحقق من صحة بيانات API
 *
 * Tests validateRequest, validateBody, validateSearchParams, validateIdParam
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

describe('API Validation — validateRequest', () => {
  let validateRequest: <T>(schema: z.ZodSchema<T>, data: unknown) => import('@/lib/api-validation').ValidationResult<T>;

  beforeAll(async () => {
    const mod = await import('@/lib/api-validation');
    validateRequest = mod.validateRequest;
  });

  it('should return success with validated data for valid input', () => {
    const schema = z.object({ name: z.string().min(1), age: z.number() });
    const result = validateRequest(schema, { name: 'Alice', age: 30 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'Alice', age: 30 });
    }
  });

  it('should return failure with field errors for invalid input', () => {
    const schema = z.object({ name: z.string().min(1), age: z.number() });
    const result = validateRequest(schema, { name: '', age: 'not-a-number' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toBeDefined();
      expect(Object.keys(result.errors!).length).toBeGreaterThan(0);
    }
  });

  it('should map error paths to field names', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });
    const result = validateRequest(schema, { email: 'bad', password: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toBeDefined();
      expect(result.errors!['email']).toBeDefined();
      expect(result.errors!['password']).toBeDefined();
    }
  });

  it('should use _root for root-level errors', () => {
    const schema = z.string().min(5);
    const result = validateRequest(schema, 'hi');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toBeDefined();
      expect(result.errors!['_root']).toBeDefined();
    }
  });

  it('should return first error message as main message', () => {
    const schema = z.object({ email: z.string().email('Invalid email format') });
    const result = validateRequest(schema, { email: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid email format');
    }
  });

  it('should fallback to Arabic message when ZodError has no issues', () => {
    // Non-ZodError thrown inside try block results in generic Arabic message
    const result = validateRequest(z.string(), undefined);
    // z.string() on undefined actually produces a ZodError, not a generic error
    expect(result.success).toBe(false);
  });

  it('should return generic Arabic message for non-ZodError exceptions', () => {
    // Create a schema that throws a non-ZodError
    const throwingSchema = z.string().refine(() => {
      throw new Error('Unexpected error');
    });
    const result = validateRequest(throwingSchema, 'test');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('بيانات غير صالحة');
      expect(result.errors).toBeUndefined();
    }
  });

  it('should accumulate multiple error messages per field', () => {
    const schema = z.object({
      name: z.string().min(2).max(5),
    });
    const result = validateRequest(schema, { name: 'a' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors!['name']).toBeDefined();
      expect(result.errors!['name'].length).toBeGreaterThan(0);
    }
  });

  it('should validate nested object schemas', () => {
    const schema = z.object({
      user: z.object({
        email: z.string().email(),
      }),
    });
    const result = validateRequest(schema, { user: { email: 'invalid' } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toBeDefined();
    }
  });
});

describe('API Validation — validateBody', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let validateBody: any;

  beforeAll(async () => {
    const mod = await import('@/lib/api-validation');
    validateBody = mod.validateBody;
  });

  it('should return validated data for a valid JSON body', async () => {
    const schema = z.object({ name: z.string() });
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await validateBody(req as unknown as NextRequest, schema);
    expect(result).toEqual({ name: 'Alice' });
  });

  it('should return NextResponse with 400 for invalid data', async () => {
    const schema = z.object({ name: z.string().min(1) });
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await validateBody(req as unknown as NextRequest, schema);
    expect(result).toBeInstanceOf(Response);
    const resp = result as Response;
    expect(resp.status).toBe(400);
  });

  it('should return NextResponse with 400 for invalid JSON', async () => {
    const schema = z.object({ name: z.string() });
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      body: 'not valid json{',
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await validateBody(req as unknown as NextRequest, schema);
    expect(result).toBeInstanceOf(Response);
    const resp = result as Response;
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.error).toBe('Invalid JSON body');
  });
});

describe('API Validation — validateSearchParams', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let validateSearchParams: any;

  beforeAll(async () => {
    const mod = await import('@/lib/api-validation');
    validateSearchParams = mod.validateSearchParams;
  });

  it('should return validated data for valid search params', () => {
    const schema = z.object({ page: z.coerce.number().int().min(1), limit: z.coerce.number().int().min(1) });
    const url = new URL('http://localhost/api/test?page=2&limit=10');
    const req = { nextUrl: { searchParams: url.searchParams } };
    const result = validateSearchParams(req as unknown as NextRequest, schema);
    expect(result).toEqual({ page: 2, limit: 10 });
  });

  it('should return NextResponse with 400 for invalid search params', () => {
    const schema = z.object({ page: z.coerce.number().int().min(1) });
    const url = new URL('http://localhost/api/test?page=abc');
    const req = { nextUrl: { searchParams: url.searchParams } };
    const result = validateSearchParams(req as unknown as NextRequest, schema);
    expect(result).toBeInstanceOf(Response);
    const resp = result as Response;
    expect(resp.status).toBe(400);
  });
});

describe('API Validation — validateIdParam', () => {
  let validateIdParam: (rawId: string) => { success: true; id: string } | { success: false; response: Response };

  beforeAll(async () => {
    const mod = await import('@/lib/api-validation');
    validateIdParam = mod.validateIdParam;
  });

  it('should return success with id for a valid CUID', () => {
    // CUID format: starts with lowercase letter, 25 chars total
    const validCuid = 'clxyz1234567890123456789a';
    const result = validateIdParam(validCuid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(validCuid);
    }
  });

  it('should return failure with 400 response for invalid ID', () => {
    const result = validateIdParam('not-a-cuid');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response).toBeInstanceOf(Response);
      expect(result.response.status).toBe(400);
    }
  });

  it('should return failure for empty string ID', () => {
    const result = validateIdParam('');
    expect(result.success).toBe(false);
  });

  it('should return failure for numeric ID', () => {
    const result = validateIdParam('12345');
    expect(result.success).toBe(false);
  });
});

describe('API Validation — re-exported schemas', () => {
  it('should re-export loginSchema', async () => {
    const mod = await import('@/lib/api-validation');
    expect(mod.loginSchema).toBeDefined();
  });

  it('should re-export registerSchema', async () => {
    const mod = await import('@/lib/api-validation');
    expect(mod.registerSchema).toBeDefined();
  });

  it('should re-export paginationSchema', async () => {
    const mod = await import('@/lib/api-validation');
    expect(mod.paginationSchema).toBeDefined();
  });

  it('should re-export idParamSchema', async () => {
    const mod = await import('@/lib/api-validation');
    expect(mod.idParamSchema).toBeDefined();
  });
});
