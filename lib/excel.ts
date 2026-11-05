import * as XLSX from "xlsx";
import type { FiscalYear, Site } from "@/lib/types";

export type SheetRecord = Record<string, unknown>;

export type WorkbookResult = {
  sites: Site[];
  sourceHeaders: string[];
  sheetName: string;
  skippedRows: number;
  invalidAmountCount: number;
};

export class WorkbookDataError extends Error {
  public readonly code: "empty-workbook" | "missing-project-column" | "missing-financial-columns" | "missing-projects" | "source-unavailable";

  constructor(code: WorkbookDataError["code"]) {
    super(code);
    this.code = code;
    this.name = "WorkbookDataError";
  }
}

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1100&q=85";
const normalizeHeader = (header: string) => header.trim().replace(/\s+/g, " ").toLowerCase();
const normalizedAliases = new Set([
  "name", "project name", "site name", "scheme name", "description", "district", "location",
  "province", "region", "category", "project type", "site type", "image", "image url", "photo url",
  "gestation period", "gs no", "project id", "site id", "project code",
  "total approval cost", "approved cost", "total funds allocation in millions", "allocated",
  "total fd release in millions", "released", "total funds utilization all fys in millions",
  "funds utilized", "project overall financial progress %", "financial progress",
  "project cfy financial progress %", "current year financial progress",
]);

function findField(row: SheetRecord, ...aliases: string[]) {
  const keys = Object.keys(row);
  const key = aliases
    .map((alias) => keys.find((candidate) => normalizeHeader(candidate) === normalizeHeader(alias)))
    .find(Boolean);
  return key ? row[key] : undefined;
}

function findYearColumns(headers: string[]) {
  const years = new Map<string, { label: string; allocation?: string; release?: string; utilized?: string }>();

  for (const header of headers) {
    const normalized = header.trim().replace(/\s+/g, " ");
    const match = normalized.match(/\b(20\d{2})\s*[-–—]\s*(20\d{2})\b/);
    if (!match) continue;

    const kind = /allocat/i.test(normalized)
      ? "allocation"
      : /release/i.test(normalized)
        ? "release"
        : /utili[sz]/i.test(normalized)
          ? "utilized"
          : null;
    if (!kind) continue;

    const key = `${match[1]}-${match[2]}`;
    const year = years.get(key) ?? {
      label: `${match[1]}–${match[2].slice(-2)}`,
    };
    year[kind] = header;
    years.set(key, year);
  }

  return [...years.values()];
}

function readAmount(value: unknown): { amount: number; invalid: boolean } {
  if (typeof value === "number") {
    return Number.isFinite(value) ? { amount: value, invalid: false } : { amount: 0, invalid: true };
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return { amount: 0, invalid: false };
    const parsed = Number(text.replace(/,/g, ""));
    return Number.isFinite(parsed) ? { amount: parsed, invalid: false } : { amount: 0, invalid: true };
  }
  if (value === undefined || value === null) return { amount: 0, invalid: false };
  return { amount: 0, invalid: true };
}

function readSourceFields(row: SheetRecord, years: ReturnType<typeof findYearColumns>) {
  const yearHeaders = new Set(years.flatMap((year) => [year.allocation, year.release, year.utilized].filter((value): value is string => Boolean(value))));
  const sourceFields: NonNullable<Site["sourceFields"]> = {};
  for (const [header, value] of Object.entries(row)) {
    const key = normalizeHeader(header);
    if (!header.trim() || normalizedAliases.has(key) || yearHeaders.has(header)) continue;
    if (typeof value === "number" && /\b(date|deadline|due|started|start|completion|completed|approved on)\b/i.test(header) && value > 1) {
      sourceFields[header] = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000).toISOString().slice(0, 10);
      continue;
    }
    if (value === null || value === undefined || value === "") {
      sourceFields[header] = null;
    } else if (typeof value === "string" && !/\b(name|code|id|date|year|phone|no\.?)\b/i.test(header)) {
      const numeric = Number(value.replace(/,/g, "").trim());
      sourceFields[header] = value.trim() && Number.isFinite(numeric) ? numeric : value.trim();
    } else if (typeof value === "string") {
      sourceFields[header] = value.trim();
    } else if (typeof value === "number" || typeof value === "boolean") {
      sourceFields[header] = value;
    }
  }
  return sourceFields;
}

function readProgress(value: unknown, utilized: number, approved: number): number {
  if (typeof value === "string" && value.trim().endsWith("%")) {
    const percentage = Number(value.trim().slice(0, -1));
    if (Number.isFinite(percentage)) return Math.max(0, Math.min(1, percentage / 100));
  }
  if (value !== undefined && value !== null && value !== "") {
    const reported = Number(value);
    if (Number.isFinite(reported)) return Math.max(0, Math.min(1, reported > 1 ? reported / 100 : reported));
  }
  return approved > 0 ? Math.max(0, Math.min(1, utilized / approved)) : 0;
}

function stableSiteId(row: SheetRecord, name: string, district: string, index: number) {
  const code = findField(row, "GS No");
  if (code !== undefined && code !== null && String(code).trim()) {
    return `scheme-${String(code).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`;
  }
  const projectId = findField(row, "Project ID", "Site ID", "Project Code");
  if (projectId !== undefined && projectId !== null && String(projectId).trim()) {
    return `project-${String(projectId).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`;
  }
  const slug = `${name}-${district}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${slug || "project"}-${index + 1}`;
}

function identityFor(row: SheetRecord, site: Site) {
  const gsNumber = findField(row, "GS No");
  if (gsNumber !== undefined && gsNumber !== null && String(gsNumber).trim()) {
    return `gs:${String(gsNumber).trim().toLowerCase()}`;
  }
  const projectId = findField(row, "Project ID", "Site ID", "Project Code");
  if (projectId !== undefined && projectId !== null && String(projectId).trim()) {
    return `id:${String(projectId).trim().toLowerCase()}`;
  }
  return `name:${site.name.trim().toLowerCase()}|${site.district.trim().toLowerCase()}`;
}

function toSite(
  row: SheetRecord,
  index: number,
  years: ReturnType<typeof findYearColumns>,
  reportInvalidAmount: () => void,
): Site | null {
  const rawName = findField(row, "Name", "Project Name", "Site Name", "Scheme Name");
  if (typeof rawName !== "string" || !rawName.trim()) return null;

  const name = rawName.trim();
  const amount = (value: unknown) => {
    const parsed = readAmount(value);
    if (parsed.invalid) reportInvalidAmount();
    return parsed.amount;
  };
  const description = String(findField(row, "Description") ?? name).trim() || name;
  const district = String(findField(row, "District", "Location") ?? "Not specified").trim() || "Not specified";
  const approvedCost = amount(findField(row, "Total Approval Cost", "Approved Cost"));
  const allocated = amount(findField(row, "Total Funds Allocation In Millions", "Allocated"));
  const released = amount(findField(row, "Total FD Release In Millions", "Released"));
  const utilized = amount(findField(row, "Total Funds Utilization All Fys In Millions", "Funds Utilized"));
  const fiscalYears: FiscalYear[] = years.map((year) => ({
    label: year.label,
    allocation: amount(year.allocation ? row[year.allocation] : 0),
    release: amount(year.release ? row[year.release] : 0),
    utilized: amount(year.utilized ? row[year.utilized] : 0),
  }));
  const sourceImage = findField(row, "Image", "Image URL", "Photo URL");
  const image = typeof sourceImage === "string" && /^https:\/\/\S+$/i.test(sourceImage.trim())
    ? sourceImage.trim()
    : DEFAULT_IMAGE;
  const sourceCategory = findField(row, "Category", "Project Type", "Site Type");

  return {
    id: stableSiteId(row, name, district, index),
    projectId: String(findField(row, "Project ID") ?? ""),
    code: String(findField(row, "GS No") ?? ""),
    name,
    description,
    district,
    region: String(findField(row, "Province", "Region") ?? "Not specified").trim() || "Not specified",
    category: typeof sourceCategory === "string" && sourceCategory.trim() ? sourceCategory.trim() : "Unclassified",
    image,
    gestationPeriod: String(findField(row, "Gestation Period") ?? "").trim(),
    approvedCost,
    allocated,
    released,
    utilized,
    overallProgress: readProgress(findField(row, "Project Overall Financial Progress %", "Financial Progress"), utilized, approvedCost),
    currentYearProgress: readProgress(findField(row, "Project CFY Financial Progress %", "Current Year Financial Progress"), 0, 0),
    fiscalYears,
    sourceFields: readSourceFields(row, years),
  };
}

function combineDuplicateRows(existing: Site, incoming: Site): Site {
  const yearTotals = new Map(existing.fiscalYears.map((year) => [year.label, { ...year }]));
  for (const year of incoming.fiscalYears) {
    const total = yearTotals.get(year.label) ?? { ...year, allocation: 0, release: 0, utilized: 0 };
    total.allocation += year.allocation;
    total.release += year.release;
    total.utilized += year.utilized;
    yearTotals.set(year.label, total);
  }

  const approvedCost = existing.approvedCost + incoming.approvedCost;
  const utilized = existing.utilized + incoming.utilized;
  return {
    ...existing,
    approvedCost,
    allocated: existing.allocated + incoming.allocated,
    released: existing.released + incoming.released,
    utilized,
    overallProgress: approvedCost > 0 ? Math.max(0, Math.min(1, utilized / approvedCost)) : 0,
    fiscalYears: [...yearTotals.values()],
    sourceFields: { ...existing.sourceFields, ...incoming.sourceFields },
  };
}

export function normalizeSheetRows(
  headers: string[],
  records: SheetRecord[],
  sheetName: string,
): WorkbookResult {
  if (!headers.some((header) => ["name", "project name", "site name", "scheme name"].includes(normalizeHeader(header)))) {
    throw new WorkbookDataError("missing-project-column");
  }
  const yearColumns = findYearColumns(headers);
  const hasFinancialColumns = headers.some((header) =>
    /total approval cost|approved cost|total funds allocation|total fd release|total funds utilization|financial progress/i.test(header),
  ) || yearColumns.length > 0;
  if (!hasFinancialColumns) throw new WorkbookDataError("missing-financial-columns");

  const grouped = new Map<string, Site>();
  let skippedRows = 0;
  let invalidAmountCount = 0;
  records.forEach((row, index) => {
    const site = toSite(row, index, yearColumns, () => { invalidAmountCount += 1; });
    if (!site) {
      if (Object.values(row).some((value) => value !== null && value !== "")) skippedRows += 1;
      return;
    }
    const identity = identityFor(row, site);
    const existing = grouped.get(identity);
    grouped.set(identity, existing ? combineDuplicateRows(existing, site) : site);
  });

  if (!grouped.size) throw new WorkbookDataError("missing-projects");
  return { sites: [...grouped.values()], sourceHeaders: [...headers], sheetName, skippedRows, invalidAmountCount };
}

export function parseWorkbook(buffer: ArrayBuffer | Uint8Array): WorkbookResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  } catch {
    throw new WorkbookDataError("empty-workbook");
  }
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new WorkbookDataError("empty-workbook");

  const records = XLSX.utils.sheet_to_json<SheetRecord>(sheet, { defval: null });
  const headers = records[0] ? Object.keys(records[0]) : [];
  return normalizeSheetRows(headers, records, sheetName);
}
