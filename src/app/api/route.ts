import { NextResponse } from "next/server";

// Removed test "Hello, world!" endpoint for production security.
// Root /api route now returns 404 to avoid information leakage.
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
