/**
 * S3-Compatible Storage Provider
 *
 * Supports AWS S3, MinIO, DigitalOcean Spaces, and any S3-compatible storage.
 * Configured via environment variables:
 *   - S3_ENDPOINT: Custom endpoint (for MinIO, DO Spaces, etc.)
 *   - S3_BUCKET: Bucket name
 *   - S3_REGION: Region
 *   - S3_ACCESS_KEY: Access key ID
 *   - S3_SECRET_KEY: Secret access key
 */

import { StorageProvider } from './types';
import { log } from '@/lib/logger';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { verifyFileContent } from '@/lib/security/magic-bytes';

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

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || 'us-east-1';
    const accessKey = process.env.S3_ACCESS_KEY;
    const secretKey = process.env.S3_SECRET_KEY;
    this.bucket = process.env.S3_BUCKET || 'blueprint-erp';

    if (!accessKey || !secretKey) {
      throw new Error(
        'S3 storage requires S3_ACCESS_KEY and S3_SECRET_KEY environment variables'
      );
    }

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      // For MinIO and other S3-compatible services
      forcePathStyle: !!endpoint,
    });

    log.info('[S3Storage] Initialized', {
      bucket: this.bucket,
      region,
      endpoint: endpoint || 'AWS S3 default',
    });
  }

  /**
   * Validate content type against strict allowlist
   * SECURITY FIX (CWE-434): Strict allowlist ONLY — no broad wildcard fallbacks.
   */
  private validateContentType(contentType: string): void {
    if (!contentType || typeof contentType !== 'string') {
      throw new Error('Content type is required');
    }

    const baseContentType = contentType.split(';')[0].trim().toLowerCase();

    if (BLOCKED_MIME_TYPES.some(blocked => baseContentType === blocked)) {
      throw new Error(`File type blocked for security: ${baseContentType}`);
    }

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

    if (!ALLOWED_TYPES.includes(baseContentType)) {
      throw new Error(`File type not allowed: ${baseContentType}`);
    }
  }

  /**
   * Upload a file to S3
   * @param key - The S3 object key
   * @param data - The file data as a Buffer
   * @param contentType - The MIME type of the file
   * @returns The S3 object key
   */
  async upload(key: string, data: Buffer, contentType: string): Promise<string> {
    try {
      // SECURITY: Validate content type against strict allowlist (CWE-434)
      this.validateContentType(contentType);

      // SECURITY: Validate magic bytes (CWE-434)
      const mimeError = verifyFileContent(data, contentType, '');
      if (mimeError) {
        throw new Error(`Magic bytes validation failed: ${mimeError}`);
      }

      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (data.length > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      }

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        ServerSideEncryption: 'aws:kms',
      });

      await this.client.send(command);

      log.info('[S3Storage] File uploaded', {
        key,
        size: data.length,
        contentType,
        bucket: this.bucket,
      });

      return key;
    } catch (error) {
      log.error('[S3Storage] Failed to upload file:', error, { key, bucket: this.bucket });
      throw new Error(
        `Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Download a file from S3
   * @param key - The S3 object key
   * @returns The file data as a Buffer
   */
  async download(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error(`Empty response body for key: ${key}`);
      }

      // Convert the stream to a Buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as AsyncIterable<Uint8Array>;

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      log.info('[S3Storage] File downloaded', { key, size: buffer.length });

      return buffer;
    } catch (error) {
      log.error('[S3Storage] Failed to download file:', error, { key, bucket: this.bucket });
      throw new Error(
        `Failed to download file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a file from S3
   * @param key - The S3 object key
   */
  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);

      log.info('[S3Storage] File deleted', { key, bucket: this.bucket });
    } catch (error) {
      log.error('[S3Storage] Failed to delete file:', error, { key, bucket: this.bucket });
      throw new Error(
        `Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a pre-signed URL for temporary access to a file
   * @param key - The S3 object key
   * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
   * @returns A pre-signed URL string
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });

      log.info('[S3Storage] Signed URL generated', { key, expiresIn });

      return url;
    } catch (error) {
      log.error('[S3Storage] Failed to generate signed URL:', error, { key });
      throw new Error(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a file exists in S3
   * @param key - The S3 object key
   * @returns Whether the file exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      // HeadObject returns 404 if the object doesn't exist
      if (
        error instanceof Error &&
        (error.name === 'NotFound' || error.name === '404' || error.message.includes('404'))
      ) {
        return false;
      }
      log.error('[S3Storage] Error checking file existence:', error, { key });
      return false;
    }
  }
}
