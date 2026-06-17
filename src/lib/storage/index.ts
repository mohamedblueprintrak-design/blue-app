/**
 * File Storage Module
 *
 * Provides a unified interface for file storage supporting both
 * local filesystem and S3-compatible storage (AWS S3, MinIO, DigitalOcean Spaces).
 *
 * Configuration is driven by the STORAGE_TYPE environment variable:
 *   - "local" (default): Store files on the local filesystem
 *   - "s3": Store files in an S3-compatible bucket
 */

import { StorageProvider } from './types';
export type { StorageProvider };

/**
 * Factory function that returns the appropriate storage provider
 * based on the STORAGE_TYPE environment variable.
 */
import { LocalStorageProvider } from './local';
import { S3StorageProvider } from './s3';
import { v4 as uuidv4 } from 'uuid';

let providerInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (providerInstance) return providerInstance;

  const type = process.env.STORAGE_TYPE || 'local';
  if (type === 's3') {
    providerInstance = new S3StorageProvider();
  } else {
    providerInstance = new LocalStorageProvider();
  }
  return providerInstance;
}

/**
 * Generate a storage key with date-based directory structure.
 * Format: {year}/{month}/{day}/{uuid}-{filename}
 */
export function generateStorageKey(filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const uniqueId = uuidv4();

  // Sanitize filename — remove path separators and special chars
  const safeName = filename
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_');

  return `${year}/${month}/${day}/${uniqueId}-${safeName}`;
}

// Re-export providers for direct usage
