import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseWorkbook, WorkbookDataError, type WorkbookResult } from "@/lib/excel";

export const MASTER_WORKBOOK_PATH = join(
  process.cwd(),
  "Scheme Details for DAT 11-03-2026.xlsx",
);

let masterWorkbook: WorkbookResult | undefined;

export function getMasterWorkbook(): WorkbookResult {
  if (masterWorkbook) return masterWorkbook;
  let bytes: Buffer;
  try {
    bytes = readFileSync(MASTER_WORKBOOK_PATH);
  } catch {
    throw new WorkbookDataError("source-unavailable");
  }
  masterWorkbook = parseWorkbook(bytes);
  return masterWorkbook;
}

export function getSites() {
  return getMasterWorkbook().sites;
}
