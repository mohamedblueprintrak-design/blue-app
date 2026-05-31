/**
 * Export utility for converting data arrays to CSV and triggering download.
 * Supports custom column headers and Arabic text.
 */

interface ColumnDef {
  key: string;
  label: string;
}

/**
 * Convert an array of objects to a CSV string and trigger a browser download.
 *
 * @param data    - Array of row objects
 * @param filename - Name of the downloaded file (without .csv extension)
 * @param columns  - Optional ordered list of { key, label } to control column order and headers
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns?: ColumnDef[]
): void {
  if (!data || data.length === 0) return;

  // Determine columns: use explicit columns or infer keys from the first row
  const cols: ColumnDef[] = columns && columns.length > 0
    ? columns
    : Object.keys(data[0]).map((key) => ({ key, label: key }));

  // Build header row
  const header = cols.map((c) => csvEscape(String(c.label))).join(",");

  // Build data rows
  const rows = data.map((row) =>
    cols
      .map((col) => {
        const value = row[col.key];
        if (value === null || value === undefined) return "";
        if (typeof value === "object") return csvEscape(JSON.stringify(value));
        return csvEscape(String(value));
      })
      .join(",")
  );

  // Combine all rows with BOM for proper Arabic display in Excel
  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].join("\r\n");

  // Create blob and trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape a CSV cell value: wrap in quotes if it contains commas, quotes, or newlines.
 */
function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
