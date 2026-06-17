import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting — prevents abuse of outbound Cloudflare API calls
    const { result } = await withRateLimit(request, 'auth');
    const blocked = rateLimitResponse(result);
    if (blocked) return blocked;

    const body = await request.json();
    const { token } = body as { token?: string };

    // Fail-closed in production if secret key is not configured
    if (!TURNSTILE_SECRET_KEY) {
      if (process.env.NODE_ENV === 'development' && process.env.BYPASS_CAPTCHA === 'true') {
        console.warn('Turnstile bypassed in development due to BYPASS_CAPTCHA=true');
        return NextResponse.json({ success: true });
      }
      return NextResponse.json(
        { success: false, error: "Captcha not configured" },
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

    const turnstileResult = (await verifyResponse.json()) as TurnstileVerifyResponse;

    return NextResponse.json({ success: turnstileResult.success });
  } catch {
    return NextResponse.json(
      { success: false, error: "Captcha verification failed" },
      { status: 500 }
    );
  }
}
