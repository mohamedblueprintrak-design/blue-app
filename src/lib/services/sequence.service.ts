import { db } from '@/lib/db';
import { log } from '@/lib/logger';

export class SequenceService {
  /**
   * Safely gets the next sequence value for a given name/org.
   * Uses Prisma's $transaction to ensure atomicity and prevent race conditions.
   * 
   * @param sequenceName Name of the sequence (e.g. "INVOICE", "CONTRACT")
   * @param organizationId Organization ID (optional for global sequences)
   * @returns The next integer in the sequence
   */
  async getNextValue(sequenceName: string, organizationId: string | null = null): Promise<number> {
    try {
      // Upsert within a transaction ensures it's created if missing, or incremented safely
      // Note: SQLite might lock the whole DB, but in Postgres this is highly efficient.
      const sequence = await db.$transaction(async (tx) => {
        const seq = await tx.sequence.upsert({
          where: {
            name_organizationId: {
              name: sequenceName,
              organizationId: organizationId ?? '', // Fallback for null
            },
          },
          update: {
            value: { increment: 1 },
          },
          create: {
            name: sequenceName,
            value: 1,
            organizationId,
          },
        });
        return seq;
      });

      return sequence.value;
    } catch (error) {
      log.error(`Failed to get next sequence for ${sequenceName}`, error);
      throw new Error(`Could not generate sequence for ${sequenceName}`);
    }
  }

  /**
   * Generates a formatted document number.
   * Example: INV-2023-00001
   */
  async generateDocumentNumber(
    prefix: string,
    sequenceName: string,
    organizationId: string | null = null,
    digits: number = 5
  ): Promise<string> {
    const year = new Date().getFullYear();
    const sequenceValue = await this.getNextValue(sequenceName, organizationId);
    
    const paddedValue = String(sequenceValue).padStart(digits, '0');
    return `${prefix}-${year}-${paddedValue}`;
  }
}

export const sequenceService = new SequenceService();
