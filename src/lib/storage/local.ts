/**
 * Local Filesystem Storage Provider
 *
 * Stores files on the local filesystem with a date-based directory structure.
 * Files are stored under the UPLOAD_DIR (default: ./uploads) with the structure:
 *   uploads/{year}/{month}/{day}/{uuid}-{filename}
 */

import { StorageProvider } from './index';
import { log } from '@/lib/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Dangerous MIME types that should NEVER be allowed for upload (CWE-434)
const BLOCKED_MIME_TYPES = [
  'application/x-sh',
  'application/x-executable',
  'application/x-msdos-program',
  'application/x-msdownload',
  'application/x-bat',
  'application/x-csh',
  'application/x-ksh',
  'application/x-shellscript',
  'text/x-php',
  'text/x-python',
  'text/x-perl',
  'text/x-shellscript',
];

export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
  }

  /**
   * Get the absolute path for a storage key
   * SECURITY: Resolves the path and validates it stays within the upload directory
   * to prevent path traversal attacks (e.g., key="../../../etc/passwd")
   *
   * FIX (CWE-22): decodeURIComponent is now called BEFORE the traversal check,
   * preventing bypass via URL-encoded sequences like %2e%2e%2f
   */
  private getFullPath(key: string): string {
    // SECURITY: Decode URI encoding FIRST, then validate and resolve.
    // Previously, decodeURIComponent was called after validateKey, which meant
    // encoded sequences like %2e%2e could bypass the ".." check (CWE-22).
    const decodedKey = decodeURIComponent(key);
    // Now check for traversal on the DECODED key
    if (decodedKey.includes('..') || decodedKey.includes('\\')) {
      throw new Error(`Invalid storage key: path traversal detected`);
    }
    // Normalize the path to resolve any ../ or ./ sequences
    const resolvedPath = path.resolve(this.uploadDir, decodedKey);
    const normalizedUploadDir = path.resolve(this.uploadDir);
    // SECURITY: Ensure the resolved path is within the upload directory
    if (!resolvedPath.startsWith(normalizedUploadDir + path.sep) && resolvedPath !== normalizedUploadDir) {
      throw new Error(`Path traversal detected: key resolves outside upload directory`);
    }
    return resolvedPath;
  }

  /**
   * Validate that a storage key doesn't contain path traversal sequences
   * SECURITY: Decodes URI encoding before checking to prevent bypass via %2e%2e (CWE-22)
   */
  private validateKey(key: string): void {
    // Decode first to catch encoded traversal sequences (e.g., %2e%2e%2f)
    const decodedKey = decodeURIComponent(key);
    if (decodedKey.includes('..') || decodedKey.includes('\\')) {
      throw new Error(`Invalid storage key: path traversal detected`);
    }
  }

  /**
   * Ensure the directory for a given file path exists
   */
  private ensureDirectoryExists(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Validate content type against strict allowlist
   * FIX (CWE-434): Strict allowlist ONLY — no broad wildcard fallbacks.
   * Previously, a secondary check allowed ALL image/* subtypes through,
   * which bypassed the allowlist and permitted dangerous types like
   * image/svg+xml (which can contain embedded JavaScript → XSS).
   *
   * Now the only way a MIME type passes is if its base form
   * (without parameters) is in the explicit ALLOWED_TYPES list.
   * image/svg+xml is intentionally excluded to prevent XSS via SVG.
   */
  private validateContentType(contentType: string): void {
    if (!contentType || typeof contentType !== 'string') {
      throw new Error('Content type is required');
    }

    // Strip parameters (e.g., "image/png; charset=utf-8" → "image/png")
    const baseContentType = contentType.split(';')[0].trim().toLowerCase();

    // Block dangerous types first
    if (BLOCKED_MIME_TYPES.some(blocked => baseContentType === blocked)) {
      throw new Error(`File type blocked for security: ${baseContentType}`);
    }

    // Strict allowlist of permitted MIME types — ONLY these pass
    const ALLOWED_TYPES = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.ms-excel',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-rar-compressed',
      'application/dwg', 'application/dxf',
    ];

    // SECURITY: No wildcard fallback — exact match against allowlist only
    if (!ALLOWED_TYPES.includes(baseContentType)) {
      throw new Error(`File type not allowed: ${baseContentType}`);
    }
  }

  /**
   * Upload a file to local storage
   * @param key - The storage key (relative path like 2025/01/15/uuid-filename.pdf)
   * @param data - The file data as a Buffer
   * @param contentType - The MIME type of the file
   * @returns The storage key (relative path)
   */
  async upload(key: string, data: Buffer, contentType: string): Promise<string> {
    try {
      // SECURITY: Validate key against path traversal
      this.validateKey(key);
      // Validate file size (50MB max)
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (data.length > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      }

      // SECURITY: Validate content type against strict allowlist (CWE-434 fix)
      this.validateContentType(contentType);

      const fullPath = this.getFullPath(key);
      this.ensureDirectoryExists(fullPath);

      // Use async file I/O to avoid blocking the event loop
      const { promises: fsp } = fs;
      await fsp.writeFile(fullPath, data);

      log.info('[LocalStorage] File uploaded', {
        key,
        size: data.length,
        contentType,
      });

      return key;
    } catch (error) {
      log.error('[LocalStorage] Failed to upload file:', error, { key });
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Download a file from local storage
   * @param key - The storage key (relative path)
   * @returns The file data as a Buffer
   */
  async download(key: string): Promise<Buffer> {
    try {
      // SECURITY: Validate key against path traversal
      this.validateKey(key);
      const fullPath = this.getFullPath(key);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${key}`);
      }

      // Use async file I/O
      const { promises: fsp } = fs;
      const data = await fsp.readFile(fullPath);

      log.info('[LocalStorage] File downloaded', { key, size: data.length });

      return data;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('File not found')) {
        throw error;
      }
      log.error('[LocalStorage] Failed to download file:', error, { key });
      throw new Error(
        `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a file from local storage
   * @param key - The storage key (relative path)
   */
  async delete(key: string): Promise<void> {
    try {
      // SECURITY: Validate key against path traversal
      this.validateKey(key);
      const fullPath = this.getFullPath(key);

      if (!fs.existsSync(fullPath)) {
        // File doesn't exist — nothing to delete
        log.warn('[LocalStorage] File not found for deletion', { key });
        return;
      }

      // Use async file I/O
      const { promises: fsp } = fs;
      await fsp.unlink(fullPath);

      log.info('[LocalStorage] File deleted', { key });
    } catch (error) {
      log.error('[LocalStorage] Failed to delete file:', error, { key });
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a signed URL for local storage.
   * Generates a time-limited, HMAC-signed URL that expires after the specified duration.
   *
   * @param key - The storage key (relative path)
   * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
   * @returns A relative URL path with expiration and signature to download the file
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // SECURITY: Validate key against path traversal
    this.validateKey(key);
    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    // SECURITY (CWE-798): Require JWT_SECRET to be set — no hardcoded fallback in production
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required for signed URLs');
    }
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${key}:${expires}`)
      .digest('hex');
    const encodedKey = encodeURIComponent(key);
    return `/api/storage/local?file=${encodedKey}&expires=${expires}&sig=${signature}`;
  }

  /**
   * Check if a file exists in local storage
   * @param key - The storage key (relative path)
   * @returns Whether the file exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      // SECURITY: Validate key against path traversal
      this.validateKey(key);
      const fullPath = this.getFullPath(key);
      return fs.existsSync(fullPath);
    } catch {
      return false;
    }
  }
}
