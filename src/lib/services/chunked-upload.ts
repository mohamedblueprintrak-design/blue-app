import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface ChunkUploadSession {
  sessionId: string;
  fileName: string;
  totalChunks: number;
  totalSize: number;
  mimeType: string;
  receivedChunks: Set<number>;
  createdAt: number;
}

const sessions = new Map<string, ChunkUploadSession>();
const UPLOAD_BASE_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), "uploads");
const TEMP_DIR = path.join(UPLOAD_BASE_DIR, "temp");
const FINAL_DIR = path.join(UPLOAD_BASE_DIR, "documents");

function ensureDirs() {
  if (!fs.existsSync(UPLOAD_BASE_DIR)) fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  if (!fs.existsSync(FINAL_DIR)) fs.mkdirSync(FINAL_DIR, { recursive: true });
}

export function initChunkUploadSession(fileName: string, totalChunks: number, totalSize: number, mimeType: string): ChunkUploadSession {
  ensureDirs();
  const sessionId = crypto.randomUUID();
  const session: ChunkUploadSession = {
    sessionId,
    fileName: path.basename(fileName),
    totalChunks,
    totalSize,
    mimeType,
    receivedChunks: new Set<number>(),
    createdAt: Date.now(),
  };

  const sessionTempDir = path.join(TEMP_DIR, sessionId);
  if (!fs.existsSync(sessionTempDir)) {
    fs.mkdirSync(sessionTempDir, { recursive: true });
  }

  sessions.set(sessionId, session);
  return session;
}

export async function processChunk(sessionId: string, chunkIndex: number, buffer: Buffer): Promise<{ session: ChunkUploadSession; isComplete: boolean; filePath?: string; relativeUrl?: string }> {
  ensureDirs();
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error("Upload session not found or expired");
  }

  const sessionTempDir = path.join(TEMP_DIR, sessionId);
  const chunkFilePath = path.join(sessionTempDir, `chunk_${chunkIndex}`);
  await fs.promises.writeFile(chunkFilePath, buffer);

  session.receivedChunks.add(chunkIndex);

  if (session.receivedChunks.size === session.totalChunks) {
    // Assemble all chunks into final file
    const sanitizedFileName = `${Date.now()}_${session.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const finalFilePath = path.join(FINAL_DIR, sanitizedFileName);
    const writeStream = fs.createWriteStream(finalFilePath);

    for (let i = 0; i < session.totalChunks; i++) {
      const partPath = path.join(sessionTempDir, `chunk_${i}`);
      const chunkData = await fs.promises.readFile(partPath);
      writeStream.write(chunkData);
      // Delete part after writing
      await fs.promises.unlink(partPath).catch(() => {});
    }

    writeStream.end();

    // Remove temp directory for session
    await fs.promises.rmdir(sessionTempDir).catch(() => {});
    sessions.delete(sessionId);

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

export function getUploadSession(sessionId: string): ChunkUploadSession | undefined {
  return sessions.get(sessionId);
}
