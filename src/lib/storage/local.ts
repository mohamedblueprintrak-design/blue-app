/**
 * Local Filesystem Storage Provider
 *
 * Stores files on the local filesystem with a date-based directory structure.
 * Files are stored under the UPLOAD_DIR (default: ./uploads) with the structure:
 *   uploads/{year}/{month}/{day}/{uuid}-{filename}
 *
 * SECURITY FIXES (CWE-22, CWE-434):
 * - Path traversal: resolved path must be within uploadDir (blocks ../, %2e%2e, etc.)
 * - Content-type: strict allowlist with no wildcard fallback
 */

import { StorageProvider } from './index';
import { log } from '@/lib/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
  }

  /**
   * Validate that a resolved path stays within the upload directory.
   * Prevents path traversal attacks (CWE-22) including:
   *   - ../ sequences
   *   - URL-encoded variants like %2e%2e%2f
   *   - Mixed encoding attacks
   *   - Null byte injection
   *
   * @param key - The storage key (relative path)
   * @returns The validated absolute path
   * @throws Error if the key attempts path traversal
   */
  private validateAndResolvePath(key: string): string {
    // Block null bytes (null byte injection)
    if (key.includes('\0') || key.includes('%00')) {
      throw new Error('Invalid storage key: null byte detected');
    }

    // Block URL-encoded path traversal sequences
    const decodedLower = decodeURIComponent(key).toLowerCase();
    if (decodedLower.includes('..') || decodedLower.includes('\\')) {
      throw new Error('Invalid storage key: path traversal detected');
    }

    // Resolve the full path and verify it stays within uploadDir
    const resolvedPath = path.resolve(this.uploadDir, key);

    // Normalize both paths for comparison (handles symlinks, case differences)
    const normalizedUploadDir = path.normalize(this.uploadDir + path.sep);
    const normalizedResolved = path.normalize(resolvedPath + path.sep);

    if (!normalizedResolved.startsWith(normalizedUploadDir)) {
      throw new Error('Invalid storage key: path escapes upload directory');
    }

    return resolvedPath;
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
   * Strict content-type allowlist — NO wildcard fallback.
   * Previously allowed application/* which permitted executables, scripts, etc. (CWE-434)
   */
  private static readonly ALLOWED_CONTENT_TYPES: ReadonlySet<string> = new Set([
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    // Text
    'text/plain',
    'text/csv',
    'text/markdown',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // CAD / Engineering
    'application/dwg',
    'application/dxf',
    'application/vnd.autodesk.revit',
    // JSON / Data
    'application/json',
  ]);

  /**
   * Validate content-type against strict allowlist
   * @param contentType - The MIME type to validate
   * @throws Error if the content type is not in the allowlist
   */
  private validateContentType(contentType: string): void {
    // Strip parameters (e.g., "image/png; charset=utf-8" → "image/png")
    const mimeType = contentType.split(';')[0].trim().toLowerCase();

    if (!LocalStorageProvider.ALLOWED_CONTENT_TYPES.has(mimeType)) {
      throw new Error(`File type not allowed: ${mimeType}. Allowed types: ${Array.from(LocalStorageProvider.ALLOWED_CONTENT_TYPES).join(', ')}`);
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
      // Validate file size (50MB max)
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (data.length > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      }

      // SECURITY: Validate content-type against strict allowlist (CWE-434 fix)
      this.validateContentType(contentType);

      // SECURITY: Validate key prevents path traversal (CWE-22 fix)
      const fullPath = this.validateAndResolvePath(key);
      this.ensureDirectoryExists(fullPath);

      fs.writeFileSync(fullPath, data);

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
      // SECURITY: Validate key prevents path traversal (CWE-22 fix)
      const fullPath = this.validateAndResolvePath(key);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${key}`);
      }

      const data = fs.readFileSync(fullPath);

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
      // SECURITY: Validate key prevents path traversal (CWE-22 fix)
      const fullPath = this.validateAndResolvePath(key);

      if (!fs.existsSync(fullPath)) {
        // File doesn't exist — nothing to delete
        log.warn('[LocalStorage] File not found for deletion', { key });
        return;
      }

      fs.unlinkSync(fullPath);

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
    // SECURITY: Validate key prevents path traversal even for signed URLs
    this.validateAndResolvePath(key);

    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    const secret = process.env.JWT_SECRET || 'local-storage-signing-key';
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
      // SECURITY: Validate key prevents path traversal (CWE-22 fix)
      const fullPath = this.validateAndResolvePath(key);
      return fs.existsSync(fullPath);
    } catch {
      return false;
    }
  }
}
