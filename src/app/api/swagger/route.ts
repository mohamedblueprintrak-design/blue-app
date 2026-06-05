import { NextResponse } from 'next/server';
import { getSwaggerSpec } from '@/lib/swagger';

export async function GET() {
  const spec = getSwaggerSpec();
  return NextResponse.json(spec);
}
