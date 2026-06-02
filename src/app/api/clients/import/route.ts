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
    const rows: any[] = [];

    // 3. Process Excel
    if (isExcel) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(buffer) as any);
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
        
        const rowData: Record<string, any> = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            // Excel cells might contain objects (like hyperlinks or rich text), get text representation
            let val = cell.value;
            if (val && typeof val === "object") {
              if ("text" in val) val = val.text;
              else if ("result" in val) val = val.result;
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
        const rowData: Record<string, any> = {};
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
    let successCount = 0;
    const errors: { row: number; error: string }[] = [];

    // Normalize field mapping (handles common variants of headers)
    const mapField = (row: any, keys: string[]): string => {
      for (const k of keys) {
        const lowerKey = k.toLowerCase();
        if (row[lowerKey] !== undefined && row[lowerKey] !== null) {
          return String(row[lowerKey]).trim();
        }
      }
      return "";
    };

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

      // Perform sanitation
      const sanitized = sanitizeObject(mappedRow);
      
      // Validate with schema
      const validation = clientSchema.safeParse(sanitized);
      if (!validation.success) {
        errors.push({
          row: i + 2, // 1-based index including header
          error: validation.error.issues[0].message,
        });
        continue;
      }

      const valid = validation.data;
      const sanitizedEmail = valid.email ? sanitizeEmail(valid.email) : "";

      try {
        await db.client.create({
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
        });
        successCount++;
      } catch (err: any) {
        log.error("Failed to insert client row during import:", err);
        errors.push({
          row: i + 2,
          error: "Database error: " + (err.message || "Failed to save"),
        });
      }
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
