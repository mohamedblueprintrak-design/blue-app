import { NextRequest, NextResponse } from "next/server";

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const isDevelopment = process.env.NODE_ENV === 'development';

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body as { token?: string };

    // SECURITY: If secret key is not configured, behavior depends on environment:
    // - Development: Allow the request with a warning so developers aren't blocked
    // - Production: REJECT the request — CAPTCHA must be properly configured
    if (!TURNSTILE_SECRET_KEY) {
      if (isDevelopment) {
        console.warn('[Turnstile] TURNSTILE_SECRET_KEY not configured — skipping captcha verification in development mode');
        return NextResponse.json({ success: true });
      }
      console.error('[Turnstile] TURNSTILE_SECRET_KEY not configured — rejecting request in production');
      return NextResponse.json(
        { success: false, error: 'CAPTCHA not configured' },
        { status: 500 }
      );
    }

    // If no token was provided, fail
    if (!token || typeof token !== "string" || token.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Captcha token is required" },
        { status: 400 }
      );
    }

    // Verify the token with Cloudflare's siteverify API
    const formData = new URLSearchParams();
    formData.append("secret", TURNSTILE_SECRET_KEY);
    formData.append("response", token);

    // Optionally include the user's IP for improved validation
    const clientIp = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
    if (clientIp) {
      formData.append("remoteip", clientIp.split(",")[0].trim());
    }

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    if (!verifyResponse.ok) {
      return NextResponse.json(
        { success: false, error: "Captcha verification service unavailable" },
        { status: 502 }
      );
    }

    const result = (await verifyResponse.json()) as TurnstileVerifyResponse;

    return NextResponse.json({ success: result.success });
  } catch {
    return NextResponse.json(
      { success: false, error: "Captcha verification failed" },
      { status: 500 }
    );
  }
}
