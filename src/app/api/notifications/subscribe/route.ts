import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireVerifiedAuth } from "@/app/api/utils/auth";
import { log } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const subscription = await request.json();

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 });
    }

    // Save or update subscription in DB
    await db.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId: ctx.userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        userId: ctx.userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    log.info(`Push subscription saved for user ${ctx.userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Failed to save push subscription", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
