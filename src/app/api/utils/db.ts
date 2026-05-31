/**
 * Database provider detection and compatibility utilities.
 * SQLite does not support Prisma's `mode: 'insensitive'` option.
 * This utility provides a cross-provider contains filter.
 */

/** Check if the database is PostgreSQL (supports case-insensitive search) */
export function isPostgreSQL(): boolean {
  const dbUrl = process.env.DATABASE_URL || '';
  return dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
}

/**
 * Build a case-insensitive contains filter that works with both SQLite and PostgreSQL.
 * - PostgreSQL: Uses `mode: 'insensitive'` for true case-insensitive search
 * - SQLite: Falls back to default (case-insensitive for ASCII by default)
 */
export function insensitiveContains(search: string): Record<string, unknown> {
  if (isPostgreSQL()) {
    return { contains: search, mode: 'insensitive' };
  }
  // SQLite is already case-insensitive for ASCII characters by default
  return { contains: search };
}
