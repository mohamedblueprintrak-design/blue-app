import { db } from "@/lib/db";
import { AccountingService } from "@/lib/services/accounting.service";
import { AccountType } from "@prisma/client";

describe("Accounting Engine & Double-Entry Ledger", () => {
  const testOrgId = "org-accounting-test";
  const testUserId = "user-accounting-test";

  beforeAll(async () => {
    // Enable SQLite foreign keys if local
    if (process.env.DATABASE_URL?.startsWith("file:")) {
      await db.$executeRaw`PRAGMA foreign_keys = OFF`;
    }

    // Clean up existing test data
    await db.journalLine.deleteMany();
    await db.journalEntry.deleteMany();
    await db.account.deleteMany();
    await db.user.deleteMany();
    await db.organization.deleteMany();

    if (process.env.DATABASE_URL?.startsWith("file:")) {
      await db.$executeRaw`PRAGMA foreign_keys = ON`;
    }

    // Seed test organization & user
    await db.organization.create({
      data: {
        id: testOrgId,
        name: "Test Accounting Org",
        slug: "test-accounting-org",
      },
    });

    await db.user.create({
      data: {
        id: testUserId,
        email: "accountant-test@blueprint.ae",
        password: "hashed_password",
        name: "Test Accountant",
        role: "ACCOUNTANT",
        organizationId: testOrgId,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await db.journalLine.deleteMany();
    await db.journalEntry.deleteMany();
    await db.account.deleteMany();
    await db.user.deleteMany();
    await db.organization.deleteMany();
    await db.$disconnect();
  });

  it("1. should seed default Chart of Accounts for new organization", async () => {
    await db.$transaction(async (tx) => {
      await AccountingService.seedDefaultAccounts(tx, testOrgId);
    });

    const accounts = await AccountingService.getAccounts(testOrgId);
    expect(accounts.length).toBe(16); // 16 default accounts
    expect(accounts.some((acc) => acc.code === "1010")).toBe(true); // Cash
    expect(accounts.some((acc) => acc.code === "2100")).toBe(true); // Accounts Payable
    expect(accounts.some((acc) => acc.code === "4010")).toBe(true); // Service Revenue
  });

  it("2. should allow creating a custom account", async () => {
    const customAcc = await AccountingService.createAccount(
      testOrgId,
      {
        code: "5200",
        nameAr: "مصاريف تسويق",
        nameEn: "Marketing Expense",
        type: AccountType.EXPENSE,
        description: "Custom marketing expenses",
      },
      testUserId
    );

    expect(customAcc.code).toBe("5200");
    expect(customAcc.nameEn).toBe("Marketing Expense");

    const accounts = await AccountingService.getAccounts(testOrgId);
    expect(accounts.length).toBe(17);
  });

  it("3. should reject duplicate account codes in the same organization", async () => {
    await expect(
      AccountingService.createAccount(
        testOrgId,
        {
          code: "1010", // Existing cash code
          nameAr: "صندوق مكرر",
          nameEn: "Duplicate Cash",
          type: AccountType.ASSET,
        },
        testUserId
      )
    ).rejects.toThrow();
  });

  it("4. should post a valid double-entry journal entry", async () => {
    const accounts = await AccountingService.getAccounts(testOrgId);
    const bankAccount = accounts.find((a) => a.code === "1020")!;
    const serviceRevenue = accounts.find((a) => a.code === "4010")!;

    const entry = await AccountingService.createJournalEntry(
      testOrgId,
      {
        description: "Consulting fees received in Bank",
        reference: "INV-2026-001",
        lines: [
          { accountId: bankAccount.id, debit: 5000, credit: 0 },
          { accountId: serviceRevenue.id, debit: 0, credit: 5000 },
        ],
      },
      testUserId
    );

    expect(entry).toBeDefined();
    expect(entry?.lines.length).toBe(2);
    expect(Number(entry?.lines[0].debit)).toBe(5000);
    expect(Number(entry?.lines[1].credit)).toBe(5000);
  });

  it("5. should reject out-of-balance journal entries", async () => {
    const accounts = await AccountingService.getAccounts(testOrgId);
    const bankAccount = accounts.find((a) => a.code === "1020")!;
    const serviceRevenue = accounts.find((a) => a.code === "4010")!;

    await expect(
      AccountingService.createJournalEntry(
        testOrgId,
        {
          description: "Out of balance entry",
          lines: [
            { accountId: bankAccount.id, debit: 5000, credit: 0 },
            { accountId: serviceRevenue.id, debit: 0, credit: 4000 }, // Unequal!
          ],
        },
        testUserId
      )
    ).rejects.toThrow(/does not balance/);
  });

  it("6. should correctly compute Trial Balance, P&L, and Balance Sheet", async () => {
    const accounts = await AccountingService.getAccounts(testOrgId);
    const bankAccount = accounts.find((a) => a.code === "1020")!;
    const _serviceRevenue = accounts.find((a) => a.code === "4010")!;
    const salaryExpense = accounts.find((a) => a.code === "5010")!;
    const marketingExpense = accounts.find((a) => a.code === "5200")!;

    // Post an expense: Salary paid from Bank (Salary 3000 Dr, Bank 3000 Cr)
    await AccountingService.createJournalEntry(
      testOrgId,
      {
        description: "Employee salaries paid",
        lines: [
          { accountId: salaryExpense.id, debit: 3000, credit: 0 },
          { accountId: bankAccount.id, debit: 0, credit: 3000 },
        ],
      },
      testUserId
    );

    // Post another expense: Marketing paid from Bank (Marketing 500 Dr, Bank 500 Cr)
    await AccountingService.createJournalEntry(
      testOrgId,
      {
        description: "Ad campaign",
        lines: [
          { accountId: marketingExpense.id, debit: 500, credit: 0 },
          { accountId: bankAccount.id, debit: 0, credit: 500 },
        ],
      },
      testUserId
    );

    // 1. Trial Balance Validation
    const tb = await AccountingService.getTrialBalance(testOrgId);
    expect(tb.balancesMatch).toBe(true);
    expect(tb.totalDebitSum).toBe(5000); // 5000 (total debit normal check)
    expect(tb.totalCreditSum).toBe(5000);

    // Bank Account dynamic balance: 5000 Dr - 3000 Cr - 500 Cr = 1500 Dr
    const bankRow = tb.rows.find((r) => r.code === "1020")!;
    expect(bankRow.netBalance).toBe(1500);

    // 2. P&L / Income Statement Validation
    // Revenue: 5000, Expenses: 3000 + 500 = 3500. Net Profit: 1500.
    const pl = await AccountingService.getIncomeStatement(testOrgId);
    expect(pl.totalRevenue).toBe(5000);
    expect(pl.totalExpense).toBe(3500);
    expect(pl.netProfit).toBe(1500);

    // 3. Balance Sheet Validation
    // Assets: Bank (1500) = 1500
    // Liabilities: 0
    // Equity: Retained Earnings / Net Profit (1500) = 1500
    // Total Assets (1500) = Total Liabilities + Equity (1500)
    const bs = await AccountingService.getBalanceSheet(testOrgId);
    expect(bs.totalAssets).toBe(1500);
    expect(bs.totalLiabilities).toBe(0);
    expect(bs.totalEquity).toBe(1500);
    expect(bs.balancesMatch).toBe(true);
  });
});
