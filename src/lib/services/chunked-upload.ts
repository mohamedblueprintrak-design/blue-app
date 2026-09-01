import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getRedis } from "@/lib/cache/redis";
import { log } from "@/lib/logger";

export interface ChunkUploadSession {
  sessionId: string;
  fileName: string;
  totalChunks: number;
  totalSize: number;
  mimeType: string;
  receivedChunks: number[];
  createdAt: number;
}

const memorySessions = new Map<string, ChunkUploadSession>();
const UPLOAD_BASE_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), "uploads");
const TEMP_DIR = path.join(UPLOAD_BASE_DIR, "temp");
const FINAL_DIR = path.join(UPLOAD_BASE_DIR, "documents");
const SESSION_TTL_SECONDS = 7200; // 2 hours

function ensureDirs() {
  if (!fs.existsSync(UPLOAD_BASE_DIR)) fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  if (!fs.existsSync(FINAL_DIR)) fs.mkdirSync(FINAL_DIR, { recursive: true });
}

function getRedisSessionKey(sessionId: string): string {
  return `chunk_upload_session:${sessionId}`;
}

export async function initChunkUploadSession(
  fileName: string,
  totalChunks: number,
  totalSize: number,
  mimeType: string
): Promise<ChunkUploadSession> {
  ensureDirs();
  const sessionId = crypto.randomUUID();
  const session: ChunkUploadSession = {
    sessionId,
    fileName: path.basename(fileName),
    totalChunks,
    totalSize,
    mimeType,
    receivedChunks: [],
    createdAt: Date.now(),
  };

  const sessionTempDir = path.join(TEMP_DIR, sessionId);
  if (!fs.existsSync(sessionTempDir)) {
    fs.mkdirSync(sessionTempDir, { recursive: true });
  }

  const redis = await getRedis();
  if (redis) {
    try {
      await redis.setEx(getRedisSessionKey(sessionId), SESSION_TTL_SECONDS, JSON.stringify(session));
    } catch (err) {
      log.warn("[ChunkedUpload] Redis setex failed, falling back to in-memory store", { error: err instanceof Error ? err.message : String(err) });
      memorySessions.set(sessionId, session);
    }
  } else {
    memorySessions.set(sessionId, session);
  }

  return session;
}

export async function getUploadSession(sessionId: string): Promise<ChunkUploadSession | null> {
  const redis = await getRedis();
  if (redis) {
    try {
      const data = await redis.get(getRedisSessionKey(sessionId));
      if (data) {
        return JSON.parse(data) as ChunkUploadSession;
      }
    } catch (err) {
      log.warn("[ChunkedUpload] Redis get failed, checking memory store", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  return memorySessions.get(sessionId) || null;
}

async function saveUploadSession(session: ChunkUploadSession): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.setEx(getRedisSessionKey(session.sessionId), SESSION_TTL_SECONDS, JSON.stringify(session));
      return;
    } catch (err) {
      log.warn("[ChunkedUpload] Redis update failed, updating memory store", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  memorySessions.set(session.sessionId, session);
}

async function deleteUploadSession(sessionId: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.del(getRedisSessionKey(sessionId));
    } catch (err) {
      log.warn("[ChunkedUpload] Redis del failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }
  memorySessions.delete(sessionId);
}

export async function processChunk(
  sessionId: string,
  chunkIndex: number,
  buffer: Buffer
): Promise<{ session: ChunkUploadSession; isComplete: boolean; filePath?: string; relativeUrl?: string }> {
  ensureDirs();
  const session = await getUploadSession(sessionId);
  if (!session) {
    throw new Error("Upload session not found or expired");
  }

  const sessionTempDir = path.join(TEMP_DIR, sessionId);
  const chunkFilePath = path.join(sessionTempDir, `chunk_${chunkIndex}`);
  await fs.promises.writeFile(chunkFilePath, buffer);

  if (!session.receivedChunks.includes(chunkIndex)) {
    session.receivedChunks.push(chunkIndex);
  }

  await saveUploadSession(session);

  if (session.receivedChunks.length === session.totalChunks) {
    const sanitizedFileName = `${Date.now()}_${session.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const finalFilePath = path.join(FINAL_DIR, sanitizedFileName);
    const writeStream = fs.createWriteStream(finalFilePath);

    for (let i = 0; i < session.totalChunks; i++) {
      const partPath = path.join(sessionTempDir, `chunk_${i}`);
      const chunkData = await fs.promises.readFile(partPath);
      writeStream.write(chunkData);
      await fs.promises.unlink(partPath).catch(() => {});
    }

    writeStream.end();

    await fs.promises.rmdir(sessionTempDir).catch(() => {});
    await deleteUploadSession(sessionId);

    const relativeUrl = `/api/documents/download?file=${encodeURIComponent(sanitizedFileName)}`;

    return {
      session,
      isComplete: true,
      filePath: finalFilePath,
      relativeUrl,
    };
  }

  return {
    session,
    isComplete: false,
  };
}
