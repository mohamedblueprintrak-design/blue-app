import { NextRequest, NextResponse } from "next/server";
import { initChunkUploadSession, processChunk, getUploadSession } from "@/lib/services/chunked-upload";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { requireVerifiedPermission, orgCreate } from "@/app/api/utils/auth";
import { Permission } from "@/lib/auth/types";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireVerifiedPermission(request, Permission.DOCUMENT_CREATE);
    if ("error" in authResult) return authResult.error;
    const ctx = authResult.user;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { action, fileName, totalChunks, totalSize, mimeType } = body;

      if (action === "init") {
        if (!fileName || !totalChunks || !totalSize) {
          return NextResponse.json({ error: "Missing required initialization fields" }, { status: 400 });
        }

        const session = initChunkUploadSession(fileName, totalChunks, totalSize, mimeType || "application/octet-stream");
        return NextResponse.json({ success: true, sessionId: session.sessionId, totalChunks: session.totalChunks });
      }

      return NextResponse.json({ error: "Invalid JSON action" }, { status: 400 });
    }

    // Multipart or raw chunk upload
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    const chunkIndexStr = url.searchParams.get("chunkIndex");
    const projectId = url.searchParams.get("projectId");

    if (!sessionId || chunkIndexStr === null) {
      return NextResponse.json({ error: "Missing sessionId or chunkIndex in query parameters" }, { status: 400 });
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await processChunk(sessionId, chunkIndex, buffer);

    if (result.isComplete && result.filePath) {
      const session = result.session;
      let docRecord = null;

      if (projectId) {
        docRecord = await db.document.create({
          data: {
            name: session.fileName,
            filePath: result.relativeUrl || "",
            fileSize: session.totalSize,
            fileType: session.mimeType,
            category: "ENGINEERING_DRAWING",
            version: 1,
            uploadedById: ctx.userId,
            ...orgCreate(ctx),
            projectId,
          },
        }).catch((err) => {
          log.error("Failed to record document in DB:", err);
          return null;
        });
      }

      return NextResponse.json({
        success: true,
        isComplete: true,
        fileUrl: result.relativeUrl,
        documentId: docRecord?.id,
      });
    }

    return NextResponse.json({
      success: true,
      isComplete: false,
      receivedChunks: Array.from(result.session.receivedChunks),
    });
  } catch (error: any) {
    log.error("Error in chunked upload handler:", error);
    return NextResponse.json({ error: error.message || "Failed to process upload" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = getUploadSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    sessionId: session.sessionId,
    fileName: session.fileName,
    totalChunks: session.totalChunks,
    receivedCount: session.receivedChunks.size,
    receivedChunks: Array.from(session.receivedChunks),
  });
}
