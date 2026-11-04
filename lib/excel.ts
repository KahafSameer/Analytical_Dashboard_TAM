import * as XLSX from "xlsx";
import type { Site } from "@/lib/types";

type SheetRecord = Record<string, unknown>;

const field = (row: SheetRecord, ...names: string[]) => {
  const keys = Object.keys(row);
  const key = names
    .map((name) => keys.find((candidate) =>
      candidate.trim().replace(/\s+/g, " ").toLowerCase() === name.replace(/\s+/g, " ").toLowerCase(),
    ))
    .find(Boolean);
  return key ? row[key] : undefined;
};

const hasField = (row: SheetRecord, ...names: string[]) =>
  Object.keys(row).some((candidate) =>
    names.some((name) => candidate.trim().replace(/\s+/g, " ").toLowerCase() === name.replace(/\s+/g, " ").toLowerCase()),
  );

const numberField = (row: SheetRecord, ...names: string[]) => {
  const value = Number(field(row, ...names));
  return Number.isFinite(value) ? value : 0;
};

const makeId = (name: string, index: number) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project"}-${index}`;

const categoryFor = (name: string) => {
  const text = name.toLowerCase();
  if (/heritage|baradari|mosque|restor/.test(text)) return "Heritage";
  if (/museum|cultur/.test(text)) return "Culture & museums";
  if (/eco|forest|resort/.test(text)) return "Eco tourism";
  if (/chairlift|glass bridge|sky walk|adventure/.test(text)) return "Adventure tourism";
  if (/app|portal|digital/.test(text)) return "Digital tourism";
  return "Visitor infrastructure";
};

export async function parseExcelWorkbook(file: File): Promise<Site[]> {
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    throw new Error("unsupported-format");
  }
  if (file.size > 20 * 1024 * 1024) throw new Error("file-too-large");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("empty-workbook");

  const records = XLSX.utils.sheet_to_json<SheetRecord>(firstSheet, { defval: null });
  const validRecords = records.filter((row) => {
    const name = field(row, "Name", "Project Name", "Scheme Name");
    return typeof name === "string" && name.trim().length > 0;
  });
  if (!validRecords.length) throw new Error("missing-projects");

  return validRecords.map((row, index) => {
    const name = String(field(row, "Name", "Project Name", "Scheme Name")).trim();
    const description = String(field(row, "Description") ?? name).trim();
    const approvedCost = numberField(row, "Total Approval Cost", "Approved Cost");
    const utilized = numberField(row, "Total Funds Utilization All Fys In Millions", "Funds Utilized");
    const allocation = numberField(row, "Total Funds Allocation In Millions", "Allocated");
    const release = numberField(row, "Total FD Release In Millions", "Released");
    const sourceProgress = field(row, "Project Overall Financial Progress %", "Financial Progress");
    const progress = sourceProgress === undefined || sourceProgress === null
      ? (approvedCost ? utilized / approvedCost : 0)
      : Number(sourceProgress) || 0;
    const region = String(field(row, "Province", "Region") ?? "Region not specified");
    const district = String(field(row, "District", "Location") ?? region);
    const years = [
      {
        label: "2024–25",
        allocation: ["Funds Allocation 2024-2025 In Millions"],
        release: ["FD Release 2024-2025 In Millions"],
        utilized: ["Funds Utilized 2024-2025 In Millions"],
      },
      {
        label: "2025–26",
        allocation: ["Funds Allocation 2025-2026 In Millions"],
        release: ["FD Release 2025-2026 In Millions"],
        utilized: ["Funds Utilized 2025-2026 In Millions"],
      },
      {
        label: "2026–27",
        allocation: ["Funds Allocation 2026-2027 In Millions"],
        release: ["FD Release 2026-2027 In Millions"],
        utilized: ["Funds Utilized 2026-2027 In Millions"],
      },
    ].filter((year) =>
      [year.allocation, year.release, year.utilized].some((names) => hasField(row, ...names)),
    ).map((year) => ({
      label: year.label,
      allocation: numberField(row, ...year.allocation),
      release: numberField(row, ...year.release),
      utilized: numberField(row, ...year.utilized),
    }));
    return {
      id: makeId(name, index + 1),
      code: String(field(row, "GS No", "Project ID") ?? ""),
      name,
      description,
      district,
      region,
      category: categoryFor(name),
      image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1100&q=85",
      gestationPeriod: String(field(row, "Gestation Period") ?? ""),
      approvedCost,
      allocated: allocation,
      released: release,
      utilized,
      overallProgress: Math.max(0, Math.min(1, progress)),
      currentYearProgress: numberField(row, "Project CFY Financial Progress %"),
      fiscalYears: years,
      imported: true,
    };
  });
}

export function readImportedSites(): Site[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem("tourism-insights:imported-sites");
    return value ? (JSON.parse(value) as Site[]) : [];
  } catch {
    return [];
  }
}

export function saveImportedSites(imported: Site[]) {
  window.localStorage.setItem("tourism-insights:imported-sites", JSON.stringify(imported));
  window.dispatchEvent(new Event("tourism-insights:imported-sites"));
}
