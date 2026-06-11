import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgCreate, requireVerifiedPermission } from "@/app/api/utils/auth";
import { errorResponse } from "@/app/api/utils/response";
import { Permission } from "@/lib/auth/types";
import { clientSchema } from "@/lib/validations";
import { cacheDeletePattern } from "@/lib/cache/redis";
import { log } from "@/lib/logger";
import { sanitizeObject, sanitizeEmail } from "@/lib/security/sanitize";
import ExcelJS from "exceljs";

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication & Permission check
    const rbac = await requireVerifiedPermission(request, Permission.CLIENT_CREATE);
    if ("error" in rbac) return rbac.error;
    const user = rbac.user;

    // 2. Parse request body (Multipart FormData)
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return errorResponse("No file provided", "VALIDATION_ERROR", 400);
    }

    const filename = file.name.toLowerCase();
    const isCsv = filename.endsWith(".csv");
    const isExcel = filename.endsWith(".xlsx") || filename.endsWith(".xls");

    if (!isCsv && !isExcel) {
      return errorResponse("Invalid file type. Only CSV and Excel (.xlsx, .xls) are supported.", "VALIDATION_ERROR", 400);
    }

    const buffer = await file.arrayBuffer();
    const rows: Record<string, unknown>[] = [];

    // 3. Process Excel
    if (isExcel) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(new Uint8Array(Buffer.from(buffer)).buffer as ArrayBuffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        return errorResponse("The excel sheet is empty", "VALIDATION_ERROR", 400);
      }

      // Read header row (row 1)
      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell) => {
        headers.push(String(cell.value || "").trim().toLowerCase());
      });

      // Read data rows
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        
        const rowData: Record<string, unknown> = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            // Excel cells might contain objects (like hyperlinks or rich text), get text representation
            let val: unknown = cell.value;
            if (val && typeof val === "object") {
              if ("text" in (val as object)) val = (val as { text: string }).text;
              else if ("result" in (val as object)) val = (val as { result: unknown }).result;
            }
            rowData[header] = val;
          }
        });
        rows.push(rowData);
      });
    } 
    // 4. Process CSV
    else {
      const text = new TextDecoder("utf-8").decode(buffer);
      const csvLines = text.split(/\r?\n/);
      if (csvLines.length < 2) {
        return errorResponse("The CSV file is empty", "VALIDATION_ERROR", 400);
      }

      // Simple CSV parser
      const parseCsvLine = (line: string) => {
        const result = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCsvLine(csvLines[0]).map(h => h.toLowerCase());
      for (let i = 1; i < csvLines.length; i++) {
        const line = csvLines[i].trim();
        if (!line) continue;
        const vals = parseCsvLine(line);
        const rowData: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          if (header) {
            let val = vals[index] || "";
            // Remove wrapping quotes if any
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1);
            }
            rowData[header] = val;
          }
        });
        rows.push(rowData);
      }
    }

    // 5. Map fields to Schema & Insert into DB
    const MAX_ROWS = 500;
    if (rows.length > MAX_ROWS) {
      return errorResponse(`Maximum ${MAX_ROWS} rows allowed`, "VALIDATION_ERROR", 400);
    }

    // Normalize field mapping (handles common variants of headers)
    const mapField = (row: Record<string, unknown>, keys: string[]): string => {
      for (const k of keys) {
        const lowerKey = k.toLowerCase();
        const val = row[lowerKey];
        if (val !== undefined && val !== null) {
          return String(val).trim();
        }
      }
      return "";
    };

    // First pass: validate all rows before any DB writes
    const validClients: { data: Record<string, unknown>; rowIndex: number }[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      const mappedRow = {
        name: mapField(row, ["name", "الاسم", "client name", "اسم العميل"]),
        company: mapField(row, ["company", "الشركة", "اسم الشركة", "company name"]),
        email: mapField(row, ["email", "البريد الالكتروني", "البريد الإلكتروني", "email address"]),
        phone: mapField(row, ["phone", "الهاتف", "رقم الهاتف", "mobile", "phone number"]),
        address: mapField(row, ["address", "العنوان", "address details"]),
        taxNumber: mapField(row, ["taxnumber", "tax number", "الرقم الضريبي", "trn"]),
        creditLimit: mapField(row, ["creditlimit", "credit limit", "الحد الائتماني"]),
        paymentTerms: mapField(row, ["paymentterms", "payment terms", "شروط الدفع"]),
        serviceType: mapField(row, ["servicetype", "service type", "نوع الخدمة"]),
        serviceNotes: mapField(row, ["servicenotes", "service notes", "ملاحظات الخدمة"]),
      };

      // Perform validation
      const validation = clientSchema.safeParse(mappedRow);
      
      if (!validation.success) {
        errors.push({
          row: i + 2, // 1-based index including header
          error: validation.error.issues[0].message,
        });
        continue;
      }

      const valid = sanitizeObject(validation.data);
      const sanitizedEmail = valid.email ? sanitizeEmail(valid.email) : "";

      validClients.push({
        data: {
          name: valid.name,
          company: valid.company || "",
          email: sanitizedEmail,
          phone: valid.phone || "",
          address: valid.address || "",
          taxNumber: valid.taxNumber || "",
          creditLimit: valid.creditLimit ? parseFloat(valid.creditLimit) : 0,
          paymentTerms: valid.paymentTerms || "",
          ...orgCreate(user),
          createdById: user.userId,
        },
        rowIndex: i + 2,
      });
    }

    // Second pass: insert all valid rows in a single transaction for atomicity
    let successCount = 0;
    try {
      await db.$transaction(async (tx) => {
        for (const client of validClients) {
          try {
            await tx.client.create({ data: client.data as Parameters<typeof tx.client.create>[0]['data'] });
            successCount++;
          } catch (err: unknown) {
            log.error("Failed to insert client row during import:", err instanceof Error ? err : new Error(String(err)));
            errors.push({
              row: client.rowIndex,
              error: "Database error: " + (err instanceof Error ? err.message : "Failed to save"),
            });
          }
        }
      });
    } catch (txError) {
      log.error("Transaction error during client import:", txError);
      return errorResponse("An error occurred during import processing", "SERVER_ERROR", 500);
    }

    // 6. Cache invalidation
    if (successCount > 0) {
      await cacheDeletePattern(`clients:${user.organizationId || 'global'}:*`);
      await cacheDeletePattern(`dashboard:${user.organizationId || 'global'}:*`);
    }

    return NextResponse.json({
      success: true,
      successCount,
      failureCount: errors.length,
      errors,
    });

  } catch (error) {
    log.error("Import clients error:", error);
    return errorResponse("An error occurred during import processing", "SERVER_ERROR", 500);
  }
}
