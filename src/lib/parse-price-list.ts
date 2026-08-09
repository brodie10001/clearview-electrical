export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  truncated: boolean;
}

const MAX_ROWS = 5000;

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((v) => v !== "")) rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  return { headers: headers ?? [], rows: dataRows };
}

async function parseXlsx(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: string[][] }> {
  // Loaded lazily rather than at module scope -- this module is imported by
  // "./actions" (a "use server" file itself imported from a client
  // component for its other exports), so a top-level import here would
  // pull exceljs's whole dependency graph into that module's initialization
  // path on every request to this route, not just the ones that actually
  // upload a file.
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };

  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const values = (row.values as unknown[]).slice(1);
    rows.push(values.map((v) => (v == null ? "" : String(v).trim())));
  });

  const [headers, ...dataRows] = rows;
  return { headers: headers ?? [], rows: dataRows };
}

// Parses a supplier price-list upload (Excel or CSV) into a header row plus
// row objects keyed by header, for the column-mapping step to work with.
export async function parsePriceListFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();
  const isCsv = name.endsWith(".csv");

  const { headers, rows } = isCsv
    ? parseCsv(await file.text())
    : await parseXlsx(await file.arrayBuffer());

  const cleanHeaders = headers.map((h, i) => h.trim() || `Column ${i + 1}`);
  const truncated = rows.length > MAX_ROWS;
  const limitedRows = truncated ? rows.slice(0, MAX_ROWS) : rows;

  const objectRows = limitedRows
    .filter((r) => r.some((v) => v !== ""))
    .map((r) => {
      const obj: Record<string, string> = {};
      cleanHeaders.forEach((h, i) => {
        obj[h] = (r[i] ?? "").toString().trim();
      });
      return obj;
    });

  return { headers: cleanHeaders, rows: objectRows, truncated };
}
