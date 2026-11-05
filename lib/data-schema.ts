import type { Site } from "@/lib/types";

export type DataFieldType = "string" | "number" | "date" | "boolean";

export type DataField = {
  id: string;
  label: string;
  type: DataFieldType;
  description: string;
  unit?: string;
  sourceKey?: string;
  fiscalYear?: string;
  fiscalMeasure?: "allocation" | "release" | "utilized";
  calculation?: {
    operation: "difference" | "ratio" | "percent_of";
    left: DataField;
    right: DataField;
  };
};

export type DatasetSchema = {
  fields: DataField[];
  recordLabelField: string;
  recordCount: number;
};

const fixedFields: DataField[] = [
  { id: "name", label: "Project name", type: "string", description: "Name of the tourism or infrastructure project." },
  { id: "projectId", label: "Project ID", type: "string", description: "Source project identifier." },
  { id: "code", label: "Project code", type: "string", description: "Source scheme or project code." },
  { id: "description", label: "Project description", type: "string", description: "Source project description." },
  { id: "image", label: "Project image URL", type: "string", description: "Source-provided image URL." },
  { id: "district", label: "District / location", type: "string", description: "Normalized district or location." },
  { id: "region", label: "Province / region", type: "string", description: "Normalized province or region." },
  { id: "category", label: "Project category", type: "string", description: "Source-provided project category or type." },
  { id: "gestationPeriod", label: "Gestation period", type: "string", description: "Source-reported project gestation period." },
  { id: "approvedCost", label: "Approved cost", type: "number", description: "Approved project cost.", unit: "PKR millions" },
  { id: "allocated", label: "Allocated funds", type: "number", description: "Funds allocated to the project.", unit: "PKR millions" },
  { id: "released", label: "Released funds", type: "number", description: "Funds released to the project.", unit: "PKR millions" },
  { id: "utilized", label: "Utilized funds / expenditure", type: "number", description: "Reported cumulative utilization or expenditure.", unit: "PKR millions" },
  { id: "overallProgress", label: "Financial progress", type: "number", description: "Normalized overall financial progress.", unit: "percent (0-100)" },
  { id: "currentYearProgress", label: "Current-year financial progress", type: "number", description: "Normalized current fiscal-year financial progress.", unit: "percent (0-100)" },
  { id: "utilizationRate", label: "Utilization of allocation", type: "number", description: "Utilized funds divided by allocated funds.", unit: "percent (0-100; may exceed 100)" },
];

const textLikeHeader = /\b(name|code|id|date|year|phone|no\.?)\b/i;
const dateLikeHeader = /\b(date|deadline|due|started|start|completion|completed|approved on|year)\b/i;
const dateLikeValue = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/;
const headerAliases: Record<string, string[]> = {
  projectId: ["project id", "site id", "project code"],
  code: ["gs no"],
  description: ["description"],
  image: ["image", "image url", "photo url"],
  district: ["district", "location"],
  region: ["province", "region"],
  category: ["category", "project type", "site type"],
  gestationPeriod: ["gestation period"],
  approvedCost: ["total approval cost", "approved cost"],
  allocated: ["total funds allocation in millions", "allocated"],
  released: ["total fd release in millions", "released"],
  utilized: ["total funds utilization all fys in millions", "funds utilized"],
  overallProgress: ["project overall financial progress %", "financial progress"],
  currentYearProgress: ["project cfy financial progress %", "current year financial progress"],
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "field";
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function inferFieldType(label: string, values: (string | number | boolean | null)[]): DataFieldType {
  if (dateLikeHeader.test(label) && values.some((value) => typeof value === "string" && dateLikeValue.test(value))) return "date";
  const present = values.filter((value) => value !== null);
  if (present.length && present.every((value) => typeof value === "boolean")) return "boolean";
  if (present.length && present.every((value) => typeof value === "number")) return "number";
  if (present.length && present.every((value) => typeof value === "string" && dateLikeValue.test(value)) && dateLikeHeader.test(label)) return "date";
  if (present.length && present.every((value) => typeof value === "number" || (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))))) {
    return textLikeHeader.test(label) ? "string" : "number";
  }
  return "string";
}

function describeField(label: string, type: DataFieldType) {
  if (type === "date") return `Source-provided date field: ${label}.`;
  if (type === "number") return `Source-provided numeric field: ${label}.`;
  if (type === "boolean") return `Source-provided true/false field: ${label}.`;
  return `Source-provided categorical or text field: ${label}.`;
}

export function discoverDatasetSchema(sites: Site[], sourceHeaders?: string[]): DatasetSchema {
  const headers = sourceHeaders?.map((header) => header.trim().replace(/\s+/g, " ").toLowerCase());
  const headerSet = headers ? new Set(headers) : undefined;
  const hasHeader = (...names: string[]) => headers?.some((header) => names.includes(header)) ?? true;
  const availableFixedFields = fixedFields.filter((field) => {
    if (field.id === "name") return true;
    if (field.id === "utilizationRate") return hasHeader(...headerAliases.allocated) && hasHeader(...headerAliases.utilized);
    if (field.id === "overallProgress") {
      return hasHeader(...headerAliases.overallProgress)
        || (hasHeader(...headerAliases.approvedCost) && hasHeader(...headerAliases.utilized));
    }
    return hasHeader(...(headerAliases[field.id] ?? []));
  });
  const fields = [...availableFixedFields];
  const reservedIds = new Set(fields.map((field) => field.id));
  const sourceKeys = new Set(sites.flatMap((site) => Object.keys(site.sourceFields ?? {})));

  for (const key of sourceKeys) {
    if (!key.trim()) continue;
    if (headerSet && !headerSet.has(key.trim().replace(/\s+/g, " ").toLowerCase())) continue;
    const values = sites.map((site) => site.sourceFields?.[key] ?? null);
    const type = inferFieldType(key, values);
    let id = `sheet_${slug(key)}_${stableHash(key)}`;
    while (reservedIds.has(id)) id = `sheet_${id}`;
    reservedIds.add(id);
    fields.push({
      id,
      label: key.trim(),
      type,
      description: describeField(key.trim(), type),
      sourceKey: key,
      ...(type === "number" && /%|percent|progress|rate/i.test(key) ? { unit: "source-reported numeric scale" } : {}),
    });
  }

  const fiscalYears = [...new Set(sites.flatMap((site) => site.fiscalYears.map((year) => year.label)))];
  for (const year of fiscalYears) {
    for (const measure of ["allocation", "release", "utilized"] as const) {
      fields.push({
        id: `fiscal_${slug(year)}_${measure}`,
        label: `${year} ${measure}`,
        type: "number",
        description: `${measure} reported for fiscal year ${year}.`,
        unit: "PKR millions",
        fiscalYear: year,
        fiscalMeasure: measure,
      });
    }
  }

  return { fields, recordLabelField: "name", recordCount: sites.length };
}

export function getFieldValue(site: Site, field: DataField): string | number | boolean | null {
  if (field.calculation) {
    const left = getFieldValue(site, field.calculation.left);
    const right = getFieldValue(site, field.calculation.right);
    if (typeof left !== "number" || typeof right !== "number") return null;
    if (field.calculation.operation === "difference") return left - right;
    if (right === 0) return null;
    return field.calculation.operation === "ratio" ? left / right : (left / right) * 100;
  }
  if (field.sourceKey) return site.sourceFields?.[field.sourceKey] ?? null;
  if (field.fiscalYear && field.fiscalMeasure) {
    const year = site.fiscalYears.find((entry) => entry.label === field.fiscalYear);
    return year?.[field.fiscalMeasure] ?? null;
  }
  switch (field.id) {
    case "name": return site.name;
    case "projectId": return site.projectId ?? null;
    case "code": return site.code ?? null;
    case "description": return site.description;
    case "image": return site.image;
    case "district": return site.district;
    case "region": return site.region;
    case "category": return site.category;
    case "gestationPeriod": return site.gestationPeriod ?? null;
    case "approvedCost": return site.approvedCost;
    case "allocated": return site.allocated;
    case "released": return site.released;
    case "utilized": return site.utilized;
    case "overallProgress": return site.overallProgress * 100;
    case "currentYearProgress": return (site.currentYearProgress ?? 0) * 100;
    case "utilizationRate": return site.allocated > 0 ? (site.utilized / site.allocated) * 100 : null;
    default: return null;
  }
}

export function publicSchema(schema: DatasetSchema) {
  return {
    recordCount: schema.recordCount,
    fields: schema.fields.map(({ id, label, type, description, unit }) => ({ id, label, type, description, ...(unit ? { unit } : {}) })),
  };
}
