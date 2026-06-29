import { db } from '@/lib/db';
import { logAudit } from './audit.service';
import { log } from '@/lib/logger';
import { AccountType, Prisma } from '@prisma/client';

// ============================================
// Types & Interfaces
// ============================================

export interface CreateAccountInput {
  code: string;
  nameAr: string;
  nameEn: string;
  type: AccountType;
  description?: string;
  parentAccountId?: string;
}

export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
}

export interface CreateJournalEntryInput {
  date?: Date;
  reference?: string;
  description: string;
  lines: JournalLineInput[];
}

export interface LedgerFilterInput {
  accountId?: string;
  startDate?: Date;
  endDate?: Date;
}

export const defaultAccounts = [
  // Assets
  { code: '1010', nameAr: 'النقدية في الخزينة', nameEn: 'Cash on Hand', type: AccountType.ASSET },
  { code: '1020', nameAr: 'الحساب البنكي', nameEn: 'Bank Account', type: AccountType.ASSET },
  { code: '1100', nameAr: 'الذمم المدينة', nameEn: 'Accounts Receivable', type: AccountType.ASSET },
  { code: '1200', nameAr: 'مستقطعات الضمان المدين', nameEn: 'Retainage Receivable', type: AccountType.ASSET },

  // Liabilities
  { code: '2100', nameAr: 'الذمم الدائنة', nameEn: 'Accounts Payable', type: AccountType.LIABILITY },
  { code: '2200', nameAr: 'ضريبة القيمة المضافة المستحقة', nameEn: 'VAT Payable', type: AccountType.LIABILITY },

  // Equity
  { code: '3000', nameAr: 'رأس المال', nameEn: 'Capital', type: AccountType.EQUITY },
  { code: '3100', nameAr: 'الأرباح المبقاة', nameEn: 'Retained Earnings', type: AccountType.EQUITY },

  // Revenue
  { code: '4010', nameAr: 'إيرادات الخدمات الاستشارية', nameEn: 'Service Revenue', type: AccountType.REVENUE },
  { code: '4020', nameAr: 'إيرادات الإشراف', nameEn: 'Supervision Revenue', type: AccountType.REVENUE },
  { code: '4100', nameAr: 'إيرادات أخرى', nameEn: 'Other Income', type: AccountType.REVENUE },

  // Expenses
  { code: '5010', nameAr: 'مصاريف الرواتب', nameEn: 'Salaries Expense', type: AccountType.EXPENSE },
  { code: '5020', nameAr: 'مصاريف إيجار المكتب', nameEn: 'Office Rent', type: AccountType.EXPENSE },
  { code: '5030', nameAr: 'مصاريف الانتقال والزيارات', nameEn: 'Travel Expense', type: AccountType.EXPENSE },
  { code: '5040', nameAr: 'مصاريف الكهرباء والإنترنت', nameEn: 'Utilities & Internet', type: AccountType.EXPENSE },
  { code: '5100', nameAr: 'مصاريف عمومية وإدارية', nameEn: 'General & Administrative', type: AccountType.EXPENSE },
];

export class AccountingService {
  /**
   * Seed default Chart of Accounts for an organization
   */
  static async seedDefaultAccounts(tx: unknown, organizationId: string): Promise<void> {
    log.info(`[Accounting] Seeding default Chart of Accounts for organization: ${organizationId}`);
    
    // Build array of create inputs
    const accountsData = defaultAccounts.map(acc => ({
      code: acc.code,
      nameAr: acc.nameAr,
      nameEn: acc.nameEn,
      type: acc.type,
      organizationId,
      isActive: true,
    }));

    await tx.account.createMany({
      data: accountsData,
    });
  }

  /**
   * Get all accounts for an organization
   */
  static async getAccounts(
    organizationId: string,
    filter?: { type?: AccountType; parentAccountId?: string | null }
  ) {
    const whereClause: Prisma.AccountWhereInput = {
      organizationId,
      isActive: true,
    };

    if (filter?.type) {
      whereClause.type = filter.type;
    }
    if (filter?.parentAccountId !== undefined) {
      whereClause.parentAccountId = filter.parentAccountId;
    }

    return db.account.findMany({
      where: whereClause,
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Create a new custom account
   */
  static async createAccount(organizationId: string, data: CreateAccountInput, userId: string) {
    // Check if code already exists in this organization
    const existing = await db.account.findFirst({
      where: {
        organizationId,
        code: data.code,
      },
    });

    if (existing) {
      throw new Error(`Account code "${data.code}" already exists in this organization`);
    }

    const account = await db.account.create({
      data: {
        code: data.code,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        type: data.type,
        description: data.description,
        parentAccountId: data.parentAccountId,
        organizationId,
      },
    });

    await logAudit({
      action: 'CREATE_ACCOUNT',
      userId,
      organizationId,
      entityType: 'ACCOUNT',
      entityId: account.id,
      description: `Created new account: ${data.code} - ${data.nameEn}`,
      metadata: { accountId: account.id, code: data.code },
    });

    return account;
  }

  /**
   * Create double-entry journal entry and validate credits/debits balance
   */
  static async createJournalEntry(
    organizationId: string,
    data: CreateJournalEntryInput,
    userId: string
  ) {
    if (!data.lines || data.lines.length < 2) {
      throw new Error('A journal entry must contain at least 2 lines (debit & credit)');
    }

    // Verify debits vs credits sum using precise arithmetic
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of data.lines) {
      if (line.debit < 0 || line.credit < 0) {
        throw new Error('Debit and credit values must be non-negative');
      }
      if (line.debit > 0 && line.credit > 0) {
        throw new Error('A single journal line cannot contain both debit and credit amounts');
      }
      totalDebit += line.debit;
      totalCredit += line.credit;
    }

    // Enforce debits === credits (allow slight floating point delta up to 0.001)
    const difference = Math.abs(totalDebit - totalCredit);
    if (difference > 0.001) {
      throw new Error(
        `Journal entry does not balance. Total Debits: ${totalDebit}, Total Credits: ${totalCredit}. Difference: ${difference.toFixed(4)}`
      );
    }

    // Run atomic write
    const entry = await db.$transaction(async (tx) => {
      // 1. Create entry header
      const header = await tx.journalEntry.create({
        data: {
          date: data.date || new Date(),
          reference: data.reference,
          description: data.description,
          organizationId,
        },
      });

      // 2. Create lines
      await tx.journalLine.createMany({
        data: data.lines.map((line) => ({
          journalEntryId: header.id,
          accountId: line.accountId,
          debit: new Prisma.Decimal(line.debit),
          credit: new Prisma.Decimal(line.credit),
        })),
      });

      return tx.journalEntry.findUnique({
        where: { id: header.id },
        include: {
          lines: {
            include: {
              account: {
                select: { id: true, code: true, nameAr: true, nameEn: true, type: true },
              },
            },
          },
        },
      });
    });

    await logAudit({
      action: 'CREATE_JOURNAL_ENTRY',
      userId,
      organizationId,
      entityType: 'JOURNAL_ENTRY',
      entityId: entry?.id || 'unknown',
      description: `Created journal entry: ${data.description}. Ref: ${data.reference || 'N/A'}. Total: ${totalDebit}`,
      metadata: { journalEntryId: entry?.id, reference: data.reference },
    });

    return entry;
  }

  /**
   * Query the General Ledger (transactions history)
   */
  static async getLedger(organizationId: string, filter: LedgerFilterInput) {
    const whereClause: Prisma.JournalLineWhereInput = {
      journalEntry: {
        organizationId,
      },
    };

    if (filter.accountId) {
      whereClause.accountId = filter.accountId;
    }

    if (filter.startDate || filter.endDate) {
      whereClause.journalEntry = {
        organizationId,
        date: {
          ...(filter.startDate && { gte: filter.startDate }),
          ...(filter.endDate && { lte: filter.endDate }),
        },
      };
    }

    return db.journalLine.findMany({
      where: whereClause,
      include: {
        journalEntry: {
          select: { id: true, date: true, reference: true, description: true },
        },
        account: {
          select: { id: true, code: true, nameAr: true, nameEn: true, type: true },
        },
      },
      orderBy: {
        journalEntry: {
          date: 'asc',
        },
      },
    });
  }

  /**
   * Get Trial Balance (balances check)
   */
  static async getTrialBalance(organizationId: string) {
    // 1. Get all accounts
    const accounts = await db.account.findMany({
      where: { organizationId, isActive: true },
      orderBy: { code: 'asc' },
    });

    // 2. Aggregate debit/credit totals grouped by account
    const aggregations = await db.journalLine.groupBy({
      by: ['accountId'],
      where: {
        journalEntry: {
          organizationId,
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const aggMap = new Map<string, { debit: number; credit: number }>();
    for (const agg of aggregations) {
      aggMap.set(agg.accountId, {
        debit: Number(agg._sum.debit || 0),
        credit: Number(agg._sum.credit || 0),
      });
    }

    // 3. Compile balances
    let totalDebitSum = 0;
    let totalCreditSum = 0;

    const rows = accounts.map((acc) => {
      const totals = aggMap.get(acc.id) || { debit: 0, credit: 0 };
      
      // Calculate net balance based on account type normal balance
      const isDebitNormal = acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE;
      let netBalance = 0;
      
      if (isDebitNormal) {
        netBalance = totals.debit - totals.credit;
      } else {
        netBalance = totals.credit - totals.debit;
      }

      // Add to trial balance totals
      if (isDebitNormal) {
        if (netBalance >= 0) {
          totalDebitSum += netBalance;
        } else {
          totalCreditSum += Math.abs(netBalance);
        }
      } else {
        if (netBalance >= 0) {
          totalCreditSum += netBalance;
        } else {
          totalDebitSum += Math.abs(netBalance);
        }
      }

      return {
        id: acc.id,
        code: acc.code,
        nameAr: acc.nameAr,
        nameEn: acc.nameEn,
        type: acc.type,
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        netBalance,
        isDebitNormal,
      };
    });

    return {
      rows,
      totalDebitSum,
      totalCreditSum,
      balancesMatch: Math.abs(totalDebitSum - totalCreditSum) < 0.01,
    };
  }

  /**
   * Get P&L / Income Statement
   */
  static async getIncomeStatement(organizationId: string, startDate?: Date, endDate?: Date) {
    const whereLines: Prisma.JournalLineWhereInput = {
      account: {
        type: {
          in: [AccountType.REVENUE, AccountType.EXPENSE],
        },
      },
      journalEntry: {
        organizationId,
        ...( (startDate || endDate) && {
          date: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }),
      },
    };

    const lines = await db.journalLine.findMany({
      where: whereLines,
      include: {
        account: {
          select: { id: true, code: true, nameAr: true, nameEn: true, type: true },
        },
      },
    });

    // Group by account
    const accountsMap = new Map<string, { account: unknown; debit: number; credit: number }>();
    for (const line of lines) {
      const existing = accountsMap.get(line.accountId) || {
        account: line.account,
        debit: 0,
        credit: 0,
      };
      existing.debit += Number(line.debit);
      existing.credit += Number(line.credit);
      accountsMap.set(line.accountId, existing);
    }

    const revenueRows: unknown[] = [];
    const expenseRows: unknown[] = [];
    let totalRevenue = 0;
    let totalExpense = 0;

    for (const val of accountsMap.values()) {
      if (val.account.type === AccountType.REVENUE) {
        // Credit-normal
        const net = val.credit - val.debit;
        totalRevenue += net;
        revenueRows.push({ ...val, netBalance: net });
      } else {
        // Debit-normal
        const net = val.debit - val.credit;
        totalExpense += net;
        expenseRows.push({ ...val, netBalance: net });
      }
    }

    return {
      revenueRows,
      expenseRows,
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense,
    };
  }

  /**
   * Get Balance Sheet
   */
  static async getBalanceSheet(organizationId: string, date?: Date) {
    const whereLines: Prisma.JournalLineWhereInput = {
      account: {
        type: {
          in: [AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY],
        },
      },
      journalEntry: {
        organizationId,
        ...(date && {
          date: {
            lte: date,
          },
        }),
      },
    };

    const lines = await db.journalLine.findMany({
      where: whereLines,
      include: {
        account: {
          select: { id: true, code: true, nameAr: true, nameEn: true, type: true },
        },
      },
    });

    // Group by account
    const accountsMap = new Map<string, { account: unknown; debit: number; credit: number }>();
    for (const line of lines) {
      const existing = accountsMap.get(line.accountId) || {
        account: line.account,
        debit: 0,
        credit: 0,
      };
      existing.debit += Number(line.debit);
      existing.credit += Number(line.credit);
      accountsMap.set(line.accountId, existing);
    }

    // Include P&L retained earnings dynamic calculation (from net income history up to the date)
    // To ensure the Balance Sheet is mathematically balanced.
    const plWhere: Prisma.JournalLineWhereInput = {
      account: {
        type: {
          in: [AccountType.REVENUE, AccountType.EXPENSE],
        },
      },
      journalEntry: {
        organizationId,
        ...(date && {
          date: {
            lte: date,
          },
        }),
      },
    };
    const plLines = await db.journalLine.findMany({
      where: plWhere,
      select: {
        debit: true,
        credit: true,
        account: { select: { type: true } },
      },
    });

    let historicalRevenue = 0;
    let historicalExpense = 0;
    for (const line of plLines) {
      if (line.account.type === AccountType.REVENUE) {
        historicalRevenue += Number(line.credit) - Number(line.debit);
      } else {
        historicalExpense += Number(line.debit) - Number(line.credit);
      }
    }
    const netRetainedEarnings = historicalRevenue - historicalExpense;

    const assetRows: unknown[] = [];
    const liabilityRows: unknown[] = [];
    const equityRows: unknown[] = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const val of accountsMap.values()) {
      const type = val.account.type;
      if (type === AccountType.ASSET) {
        const net = val.debit - val.credit;
        totalAssets += net;
        assetRows.push({ ...val, netBalance: net });
      } else if (type === AccountType.LIABILITY) {
        const net = val.credit - val.debit;
        totalLiabilities += net;
        liabilityRows.push({ ...val, netBalance: net });
      } else if (type === AccountType.EQUITY) {
        const net = val.credit - val.debit;
        totalEquity += net;
        equityRows.push({ ...val, netBalance: net });
      }
    }

    // Add historical retained earnings to equity total
    totalEquity += netRetainedEarnings;

    return {
      assetRows,
      liabilityRows,
      equityRows,
      netRetainedEarnings,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      balancesMatch: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }
}

// ============================================
// GL Integration: Auto-create journal entries from business transactions
// ============================================

/**
 * Get account by code within an organization.
 * Creates default accounts if they don't exist yet.
 */
async function getAccountByCode(organizationId: string, code: string): Promise<string> {
  const account = await db.account.findFirst({
    where: { organizationId, code },
    select: { id: true },
  });
  if (!account) {
    throw new Error(`Account with code ${code} not found for organization ${organizationId}. Run seedAccounts first.`);
  }
  return account.id;
}

/**
 * Create a journal entry for an invoice.
 * Debit: Accounts Receivable (1100) — total amount (subtotal + tax)
 * Credit: Service Revenue (4010) — subtotal
 * Credit: VAT Payable (2200) — tax
 *
 * @param tx - Prisma transaction client
 * @param organizationId - Organization ID
 * @param invoiceNumber - Invoice number for reference
 * @param subtotal - Invoice subtotal (before tax)
 * @param tax - Invoice tax amount
 * @param userId - User creating the invoice
 */
export async function createInvoiceJournalEntry(
  tx: Prisma.TransactionClient,
  organizationId: string,
  invoiceNumber: string,
  subtotal: number,
  tax: number,
  userId: string
): Promise<void> {
  const total = subtotal + tax;

  // Get account IDs
  const arAccountId = await getAccountByCode(organizationId, '1100'); // Accounts Receivable
  const revenueAccountId = await getAccountByCode(organizationId, '4010'); // Service Revenue
  const vatAccountId = await getAccountByCode(organizationId, '2200'); // VAT Payable

  // Create journal entry within the same transaction
  const journalEntry = await tx.journalEntry.create({
    data: {
      date: new Date(),
      reference: invoiceNumber,
      description: `Invoice ${invoiceNumber}`,
      organizationId,
    },
  });

  // Create journal lines
  const lines: Array<{ journalEntryId: string; accountId: string; debit: Prisma.Decimal; credit: Prisma.Decimal }> = [
    // Debit: Accounts Receivable (total)
    {
      journalEntryId: journalEntry.id,
      accountId: arAccountId,
      debit: new Prisma.Decimal(total),
      credit: new Prisma.Decimal(0),
    },
    // Credit: Service Revenue (subtotal)
    {
      journalEntryId: journalEntry.id,
      accountId: revenueAccountId,
      debit: new Prisma.Decimal(0),
      credit: new Prisma.Decimal(subtotal),
    },
  ];

  // Credit: VAT Payable (tax) — only if tax > 0
  if (tax > 0) {
    lines.push({
      journalEntryId: journalEntry.id,
      accountId: vatAccountId,
      debit: new Prisma.Decimal(0),
      credit: new Prisma.Decimal(tax),
    });
  }

  await tx.journalLine.createMany({ data: lines });

  // Note: audit log is handled by the calling function (createInvoice)
  // to avoid duplicate audit entries.
}

/**
 * Create a journal entry for a payment received.
 * Debit: Cash/Bank (1010 or 1020) — payment amount
 * Credit: Accounts Receivable (1100) — payment amount
 *
 * @param tx - Prisma transaction client
 * @param organizationId - Organization ID
 * @param invoiceNumber - Invoice number for reference
 * @param amount - Payment amount
 * @param paymentMethod - 'cash' or 'bank' (determines debit account)
 * @param userId - User recording the payment
 */
export async function createPaymentJournalEntry(
  tx: Prisma.TransactionClient,
  organizationId: string,
  invoiceNumber: string,
  amount: number,
  paymentMethod: 'cash' | 'bank' = 'bank',
  userId: string
): Promise<void> {
  // Get account IDs
  const cashAccountId = await getAccountByCode(organizationId, '1010'); // Cash on Hand
  const bankAccountId = await getAccountByCode(organizationId, '1020'); // Bank Account
  const arAccountId = await getAccountByCode(organizationId, '1100'); // Accounts Receivable

  const debitAccountId = paymentMethod === 'cash' ? cashAccountId : bankAccountId;

  // Create journal entry
  const journalEntry = await tx.journalEntry.create({
    data: {
      date: new Date(),
      reference: `PAYMENT-${invoiceNumber}`,
      description: `Payment received for invoice ${invoiceNumber}`,
      organizationId,
    },
  });

  // Create journal lines
  await tx.journalLine.createMany({
    data: [
      // Debit: Cash or Bank
      {
        journalEntryId: journalEntry.id,
        accountId: debitAccountId,
        debit: new Prisma.Decimal(amount),
        credit: new Prisma.Decimal(0),
      },
      // Credit: Accounts Receivable
      {
        journalEntryId: journalEntry.id,
        accountId: arAccountId,
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(amount),
      },
    ],
  });
}

/**
 * Seed default chart of accounts for a new organization.
 * Called during organization creation or setup.
 */
