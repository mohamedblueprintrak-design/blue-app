/**
 * Backup Service (SQLite + PostgreSQL)
 * خدمة النسخ الاحتياطي - دعم SQLite و PostgreSQL
 *
 * Supports:
 * - SQLite: File copy backup
 * - PostgreSQL: pg_dump backup
 * - Backup retention policy
 * - Backup verification
 * - Safe restore with confirmation
 */

import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { log } from '@/lib/logger';

const execFileAsync = promisify(execFile);

// ============================================
// Types
// ============================================

export interface BackupResult {
  success: boolean;
  backupId: string;
  timestamp: Date;
  size: number;
  duration: number;
  filename: string;
  error?: string;
}

export interface BackupInfo {
  id: string;
  filename: string;
  timestamp: Date;
  size: number;
  status: 'COMPLETED' | 'FAILED';
  type: 'sqlite' | 'postgresql';
}

// ============================================
// Configuration
// ============================================

const DEFAULT_RETENTION_COUNT = 10;
const DATABASE_URL = process.env.DATABASE_URL || '';
const isPostgreSQL = DATABASE_URL.includes('postgresql://') || DATABASE_URL.includes('postgres://');

// ============================================
// Backup Service Class
// ============================================

class BackupService {
  private backupDir: string;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'db', 'backups');
  }

  /**
   * Validate that a file path is within the backup directory.
   * Prevents path traversal attacks (e.g., ../../etc/passwd).
   */
  private validateBackupPath(filename: string): string | null {
    const resolvedPath = path.resolve(this.backupDir, filename);
    const resolvedBackupDir = path.resolve(this.backupDir);
    // Ensure the resolved path starts with the backup directory
    if (!resolvedPath.startsWith(resolvedBackupDir + path.sep) && resolvedPath !== resolvedBackupDir) {
      log.error('[Backup] Path traversal attempt detected:', { filename, resolvedPath, backupDir: resolvedBackupDir });
      return null;
    }
    return resolvedPath;
  }

  /**
   * Ensure the backup directory exists
   */
  private async ensureBackupDir(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  /**
   * Generate a backup filename with timestamp
   */
  private generateFilename(): string {
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
    const ext = isPostgreSQL ? 'sql.gz' : 'db';
    return `blueprint_backup_${dateStr}.${ext}`;
  }

  /**
   * Generate a backup ID from filename
   */
  private generateBackupId(filename: string): string {
    return filename.replace(/\.(db|sql\.gz)$/, '').replace('blueprint_backup_', '');
  }

  /**
   * Create a database backup
   */
  async createBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    const filename = this.generateFilename();
    const backupId = this.generateBackupId(filename);

    try {
      await this.ensureBackupDir();

      let result: BackupResult;

      if (isPostgreSQL) {
        result = await this.createPostgreSQLBackup(filename, backupId, timestamp, startTime);
      } else {
        result = await this.createSQLiteBackup(filename, backupId, timestamp, startTime);
      }

      // Apply retention policy after successful backup
      if (result.success) {
        await this.applyRetentionPolicy();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('[Backup] Error creating backup:', errorMessage);

      return {
        success: false,
        backupId,
        timestamp,
        size: 0,
        duration: Date.now() - startTime,
        filename,
        error: errorMessage,
      };
    }
  }

  /**
   * Create PostgreSQL backup using pg_dump
   */
  private async createPostgreSQLBackup(
    filename: string,
    backupId: string,
    timestamp: Date,
    startTime: number
  ): Promise<BackupResult> {
    const destPath = path.join(this.backupDir, filename);

    try {
      // Parse DATABASE_URL for pg_dump
      const url = new URL(DATABASE_URL);
      const dbName = url.pathname.slice(1);
      const dbUser = url.username;
      const dbHost = url.hostname;
      const dbPort = url.port || '5432';
      const dbPassword = url.password;

      // Set PGPASSWORD environment variable
      const env = { ...process.env, PGPASSWORD: dbPassword };

      // Run pg_dump with gzip compression
      const { stdout, stderr } = await execFileAsync(
        'pg_dump',
        [
          '-h', dbHost,
          '-p', dbPort,
          '-U', dbUser,
          '-d', dbName,
          '--no-owner',
          '--no-privileges',
          '--clean',
          '--if-exists',
          '--format=plain',
        ],
        { env, maxBuffer: 100 * 1024 * 1024 } // 100MB buffer for large DBs
      );

      if (stderr && !stderr.includes('NOTICE')) {
        log.warn('[Backup] pg_dump warnings:', { stderr });
      }

      // Write compressed backup
      const { default: zlib } = await import('zlib');
      const compressed = await new Promise<Buffer>((resolve, reject) => {
        const gzip = zlib.createGzip();
        const chunks: Buffer[] = [];
        gzip.on('data', (chunk: Buffer) => chunks.push(chunk));
        gzip.on('end', () => resolve(Buffer.concat(chunks)));
        gzip.on('error', reject);
        gzip.write(stdout);
        gzip.end();
      });

      await fs.writeFile(destPath, compressed);

      const stats = await fs.stat(destPath);
      log.info(`[Backup] PostgreSQL backup created: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);

      return {
        success: true,
        backupId,
        timestamp,
        size: stats.size,
        duration: Date.now() - startTime,
        filename,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide helpful error message if pg_dump is not installed
      if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
        log.error('[Backup] pg_dump not found. Install PostgreSQL client tools: apt-get install postgresql-client');
        return {
          success: false,
          backupId,
          timestamp,
          size: 0,
          duration: Date.now() - startTime,
          filename,
          error: 'pg_dump not installed. Install PostgreSQL client tools to enable PostgreSQL backups.',
        };
      }

      return {
        success: false,
        backupId,
        timestamp,
        size: 0,
        duration: Date.now() - startTime,
        filename,
        error: errorMessage,
      };
    }
  }

  /**
   * Create SQLite backup using SQLite VACUUM INTO
   */
  private async createSQLiteBackup(
    filename: string,
    backupId: string,
    timestamp: Date,
    startTime: number
  ): Promise<BackupResult> {
    const dbPath = path.join(process.cwd(), 'db', 'custom.db');
    const destPath = path.join(this.backupDir, filename);

    // Check if source database exists
    try {
      await fs.access(dbPath);
    } catch {
      return {
        success: false,
        backupId,
        timestamp,
        size: 0,
        duration: Date.now() - startTime,
        filename,
        error: 'Database file not found',
      };
    }

    try {
      // Ensure destination file does not exist (VACUUM INTO requires the target file to not exist)
      await fs.unlink(destPath).catch(() => {});

      // Use VACUUM INTO to safely clone database even if transactions are active
      const { db } = await import('@/lib/db');
      await db.$executeRawUnsafe(`VACUUM INTO '${destPath.replace(/'/g, "''")}'`);

      // Verify backup was created correctly
      const stats = await fs.stat(destPath);
      if (stats.size === 0) {
        await fs.unlink(destPath).catch(() => {});
        return {
          success: false,
          backupId,
          timestamp,
          size: 0,
          duration: Date.now() - startTime,
          filename,
          error: 'Backup file is empty — backup failed',
        };
      }

      log.info(`[Backup] SQLite safe VACUUM backup created: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);

      return {
        success: true,
        backupId,
        timestamp,
        size: stats.size,
        duration: Date.now() - startTime,
        filename,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('[Backup] SQLite VACUUM backup failed, trying fallback copy:', errorMessage);
      
      try {
        await fs.copyFile(dbPath, destPath);
        const stats = await fs.stat(destPath);
        return {
          success: true,
          backupId,
          timestamp,
          size: stats.size,
          duration: Date.now() - startTime,
          filename,
        };
      } catch (copyErr) {
        return {
          success: false,
          backupId,
          timestamp,
          size: 0,
          duration: Date.now() - startTime,
          filename,
          error: `VACUUM INTO failed: ${errorMessage}. Fallback copy failed: ${copyErr instanceof Error ? copyErr.message : 'Unknown error'}`,
        };
      }
    }
  }

  /**
   * Restore database from a backup file
   * IMPORTANT: Requires explicit confirmation for safety
   */
  async restoreBackup(filename: string, options?: { confirm?: boolean }): Promise<{ success: boolean; error?: string }> {
    // Safety: Require explicit confirmation
    if (!options?.confirm) {
      return { success: false, error: 'Restore requires explicit confirmation. Pass { confirm: true } to proceed.' };
    }

    try {
      // SECURITY: Validate the filename to prevent path traversal
      const backupPath = this.validateBackupPath(filename);
      if (!backupPath) {
        return { success: false, error: 'Invalid backup filename' };
      }

      // Check if backup file exists
      try {
        await fs.access(backupPath);
      } catch {
        return { success: false, error: 'Backup file not found' };
      }

      // Verify the backup file is not empty
      const stats = await fs.stat(backupPath);
      if (stats.size === 0) {
        return { success: false, error: 'Backup file is empty' };
      }

      if (isPostgreSQL) {
        return await this.restorePostgreSQLBackup(backupPath);
      } else {
        return await this.restoreSQLiteBackup(backupPath);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('[Backup] Error restoring backup:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Restore PostgreSQL from backup
   */
  private async restorePostgreSQLBackup(backupPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = new URL(DATABASE_URL);
      const dbName = url.pathname.slice(1);
      const dbUser = url.username;
      const dbHost = url.hostname;
      const dbPort = url.port || '5432';
      const dbPassword = url.password;

      const env = { ...process.env, PGPASSWORD: dbPassword };

      // Decompress the backup
      const { default: zlib } = await import('zlib');
      const compressedData = await fs.readFile(backupPath);
      const decompressed = await new Promise<Buffer>((resolve, reject) => {
        zlib.gunzip(compressedData, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      // Write decompressed SQL to a temporary file for psql to read
      const tempSqlPath = path.join(this.backupDir, `_restore_temp_${Date.now()}.sql`);
      await fs.writeFile(tempSqlPath, decompressed.toString());

      // Run psql to restore from the temp file
      const { stderr } = await execFileAsync(
        'psql',
        ['-h', dbHost, '-p', dbPort, '-U', dbUser, '-d', dbName, '-f', tempSqlPath],
        { env, maxBuffer: 100 * 1024 * 1024 }
      );

      // Clean up temp file
      await fs.unlink(tempSqlPath).catch(() => {});

      if (stderr && !stderr.includes('NOTICE') && !stderr.includes('does not exist')) {
        log.warn('[Backup] psql restore warnings:', { stderr });
      }

      log.info('[Backup] PostgreSQL backup restored successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
        return { success: false, error: 'psql not installed. Install PostgreSQL client tools to enable restore.' };
      }
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Restore SQLite from backup
   */
  private async restoreSQLiteBackup(backupPath: string): Promise<{ success: boolean; error?: string }> {
    const dbPath = path.join(process.cwd(), 'db', 'custom.db');

    try {
      // Create a safety backup of current DB before overwriting
      const safetyBackupPath = `${dbPath}.pre-restore-${Date.now()}`;
      try {
        await fs.copyFile(dbPath, safetyBackupPath);
        log.info(`[Backup] Safety backup created: ${path.basename(safetyBackupPath)}`);
      } catch {
        log.warn('[Backup] Could not create safety backup — proceeding anyway');
      }

      // Copy the backup file over the current database
      await fs.copyFile(backupPath, dbPath);

      // Clean up WAL and SHM files to prevent corruption from stale WAL logs
      await fs.unlink(`${dbPath}-wal`).catch(() => {});
      await fs.unlink(`${dbPath}-shm`).catch(() => {});

      log.info('[Backup] SQLite backup restored successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    try {
      await this.ensureBackupDir();

      const files = await fs.readdir(this.backupDir);
      const backups: BackupInfo[] = [];

      for (const file of files) {
        if (!file.startsWith('blueprint_backup_')) continue;
        if (!file.endsWith('.db') && !file.endsWith('.sql.gz')) continue;

        const filepath = path.join(this.backupDir, file);
        try {
          const stats = await fs.stat(filepath);

          backups.push({
            id: this.generateBackupId(file),
            filename: file,
            timestamp: stats.birthtime,
            size: stats.size,
            status: 'COMPLETED',
            type: file.endsWith('.sql.gz') ? 'postgresql' : 'sqlite',
          });
        } catch {
          // Skip files we can't stat
        }
      }

      // Sort by timestamp descending (newest first)
      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch {
      return [];
    }
  }

  /**
   * Delete a specific backup file
   */
  async deleteBackup(filename: string): Promise<{ success: boolean; error?: string }> {
    try {
      // SECURITY: Validate the filename to prevent path traversal
      const filepath = this.validateBackupPath(filename);
      if (!filepath) {
        return { success: false, error: 'Invalid backup filename' };
      }

      try {
        await fs.access(filepath);
      } catch {
        return { success: false, error: 'Backup file not found' };
      }

      await fs.unlink(filepath);
      log.info(`[Backup] Deleted: ${filename}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Apply retention policy — keep only the last N backups
   */
  private async applyRetentionPolicy(retentionCount: number = DEFAULT_RETENTION_COUNT): Promise<number> {
    try {
      const backups = await this.listBackups();

      if (backups.length <= retentionCount) {
        return 0; // No backups to remove
      }

      const toRemove = backups.slice(retentionCount);
      let removed = 0;

      for (const backup of toRemove) {
        try {
          await fs.unlink(path.join(this.backupDir, backup.filename));
          removed++;
        } catch {
          // Skip files we can't delete
        }
      }

      if (removed > 0) {
        log.info(`[Backup] Retention policy applied: removed ${removed} old backup(s), kept ${retentionCount}`);
      }

      return removed;
    } catch {
      return 0;
    }
  }

  /**
   * Get backup statistics
   */
  async getStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
    dbType: 'sqlite' | 'postgresql';
  }> {
    const backups = await this.listBackups();

    return {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].timestamp : undefined,
      newestBackup: backups.length > 0 ? backups[0].timestamp : undefined,
      dbType: isPostgreSQL ? 'postgresql' : 'sqlite',
    };
  }
}

// Export singleton instance
export const backupService = new BackupService();
