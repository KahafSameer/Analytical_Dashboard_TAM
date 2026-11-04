import "server-only";

import { google } from "googleapis";
import {
  normalizeSheetRows,
  WorkbookDataError,
  type SheetRecord,
} from "@/lib/excel";
import type { DashboardData } from "@/lib/types";

export class GoogleSheetsDataError extends Error {
  constructor(
    public readonly code:
      | "configuration"
      | "authentication"
      | "permission"
      | "empty-sheet"
      | "unavailable",
  ) {
    super(code);
    this.name = "GoogleSheetsDataError";
  }
}

const CACHE_TTL_MS = 20_000;
let cached: DashboardData | undefined;
let cachedAt = 0;
let pending: Promise<DashboardData> | undefined;

function getCredentials() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim();
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  if (!spreadsheetId || !clientEmail || !privateKey) {
    throw new GoogleSheetsDataError("configuration");
  }
  return { spreadsheetId, clientEmail, privateKey };
}

function getErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as { code?: unknown; response?: { status?: unknown }; status?: unknown };
  const status = candidate.response?.status ?? candidate.status ?? candidate.code;
  return typeof status === "number" || typeof status === "string" ? Number(status) : undefined;
}

async function fetchDashboardData(): Promise<DashboardData> {
  const { spreadsheetId, clientEmail, privateKey } = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const metadata = await sheets.spreadsheets.get(
      { spreadsheetId, fields: "sheets.properties.title" },
      { timeout: 12_000 },
    );
    const sheetName = metadata.data.sheets?.[0]?.properties?.title;
    if (!sheetName) throw new GoogleSheetsDataError("empty-sheet");

    const escapedSheetName = sheetName.replaceAll("'", "''");
    const response = await sheets.spreadsheets.values.get(
      {
        spreadsheetId,
        range: `'${escapedSheetName}'!A:ZZ`,
        valueRenderOption: "UNFORMATTED_VALUE",
      },
      { timeout: 12_000 },
    );
    const rows = response.data.values;
    if (!rows?.length) throw new GoogleSheetsDataError("empty-sheet");

    const headers = rows[0].map((value) => String(value ?? "").trim());
    const records: SheetRecord[] = rows.slice(1).map((cells) =>
      Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? null])),
    );
    const normalized = normalizeSheetRows(headers, records, sheetName);
    return { ...normalized, fetchedAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof GoogleSheetsDataError || error instanceof WorkbookDataError) throw error;
    const status = getErrorStatus(error);
    if (status === 401) throw new GoogleSheetsDataError("authentication");
    if (status === 403 || status === 404) throw new GoogleSheetsDataError("permission");
    throw new GoogleSheetsDataError("unavailable");
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;
  if (pending) return pending;

  pending = fetchDashboardData()
    .then((data) => {
      cached = data;
      cachedAt = Date.now();
      return data;
    })
    .finally(() => {
      pending = undefined;
    });

  return pending;
}

export function getDashboardDataErrorMessage(error: unknown) {
  if (error instanceof GoogleSheetsDataError) {
    if (error.code === "configuration") return "Google Sheets is not configured. Add the required server environment variables.";
    if (error.code === "authentication") return "Google Sheets credentials were not accepted. Check the service account configuration.";
    if (error.code === "permission") return "The service account cannot access the configured spreadsheet. Share it with the service account email.";
    if (error.code === "empty-sheet") return "The configured spreadsheet’s first worksheet is empty.";
  }
  if (error instanceof WorkbookDataError) {
    if (error.code === "missing-project-column") return "The spreadsheet is missing a project name column.";
    if (error.code === "missing-financial-columns") return "The spreadsheet is missing supported financial columns.";
    if (error.code === "missing-projects") return "No valid projects were found in the spreadsheet.";
  }
  return "Google Sheets could not be reached. Check the spreadsheet and try again.";
}
