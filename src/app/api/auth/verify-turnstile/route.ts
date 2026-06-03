import { NextRequest, NextResponse } from "next/server";

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

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

    // Graceful degradation: if secret key is not configured, always succeed
    if (!TURNSTILE_SECRET_KEY) {
      return NextResponse.json({ success: true });
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
