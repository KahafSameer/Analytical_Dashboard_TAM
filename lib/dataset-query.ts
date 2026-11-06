import { getFieldValue, type DataField, type DatasetSchema } from "@/lib/data-schema";
import type { Site } from "@/lib/types";

export type QueryFilter = {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "greater_than_or_equal" | "less_than" | "less_than_or_equal" | "between" | "is_empty" | "is_not_empty";
  value?: string | number | boolean;
  value2?: string | number | boolean;
};

export type DataQueryPlan = {
  output: "records" | "aggregate" | "grouped" | "analysis" | "clarify";
  filters: QueryFilter[];
  filterLogic: "and" | "or";
  groupBy: string[];
  select: string[];
  sort: { field: string; direction: "asc" | "desc" }[];
  limit: number;
  aggregations: {
    id: string;
    field?: string;
    operation: "count" | "sum" | "average" | "min" | "max" | "median";
  }[];
  calculations: {
    id: string;
    operation: "difference" | "ratio" | "percent_of";
    left: string;
    right: string;
  }[];
  unavailableFields: string[];
  clarification?: string;
  scenario?: {
    exclude: "top" | "bottom";
    field: string;
    count: number;
  };
};

export type PlanValidation = {
  plan: DataQueryPlan | null;
  invalidFields: string[];
  error?: string;
};

export type QueryResult = {
  output: DataQueryPlan["output"];
  matchedCount: number;
  totalCount: number;
  selectedCount?: number;
  truncated?: boolean;
  unavailableFields?: string[];
  rows?: Record<string, unknown>[];
  aggregations?: { id: string; field?: string; label: string; operation: string; unit?: string; value: number | null }[];
  groups?: { key: Record<string, unknown>; count: number; values: Record<string, number | null> }[];
  analysis?: {
    numeric: { field: string; count: number; missing: number; sum: number; average: number; median: number; min: number; max: number; lowest: { project: string; value: number }[]; highest: { project: string; value: number }[]; outliers: { project: string; value: number }[] }[];
    categorical: { field: string; count: number; distinct: number; topValues: { value: string; count: number }[] }[];
    dates: { field: string; count: number; earliest: { project: string; value: string }; latest: { project: string; value: string } }[];
  };
};

const operators = new Set<QueryFilter["operator"]>([
  "equals", "not_equals", "contains", "not_contains", "greater_than", "greater_than_or_equal",
  "less_than", "less_than_or_equal", "between", "is_empty", "is_not_empty",
]);
const validOperations = new Set(["count", "sum", "average", "min", "max", "median"]);
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isScalar(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function isFiniteScalar(value: unknown): value is string | number | boolean {
  return isScalar(value) && (typeof value !== "number" || Number.isFinite(value));
}

export function validateDataQueryPlan(value: unknown, schema: DatasetSchema): PlanValidation {
  if (!isPlainObject(value)) return { plan: null, invalidFields: [], error: "Plan must be an object." };
  const fieldIds = new Set(schema.fields.map((field) => field.id));
  const fieldMap = new Map(schema.fields.map((field) => [field.id, field]));
  const invalidFields: string[] = [];
  const rawCalculations = value.calculations ?? [];
  if (!Array.isArray(rawCalculations) || rawCalculations.length > 8) {
    return { plan: null, invalidFields, error: "Invalid calculations." };
  }
  const calculations: DataQueryPlan["calculations"] = [];
  for (const raw of rawCalculations) {
    if (!isPlainObject(raw) ||
      typeof raw.id !== "string" ||
      !/^[a-z][a-z0-9_]{0,39}$/i.test(raw.id) ||
      fieldIds.has(raw.id) ||
      fieldMap.has(raw.id) ||
      !["difference", "ratio", "percent_of"].includes(String(raw.operation)) ||
      typeof raw.left !== "string" ||
      typeof raw.right !== "string") {
      return { plan: null, invalidFields, error: "Invalid calculation." };
    }
    const left = fieldMap.get(raw.left);
    const right = fieldMap.get(raw.right);
    if (!left) invalidFields.push(raw.left);
    if (!right && raw.right !== raw.left) invalidFields.push(raw.right);
    if (!left || !right) continue;
    if (left.type !== "number" || right.type !== "number") {
      return { plan: null, invalidFields, error: "Calculations require numeric fields." };
    }
    const calculation = {
      id: raw.id,
      operation: raw.operation as DataQueryPlan["calculations"][number]["operation"],
      left: raw.left,
      right: raw.right,
    };
    calculations.push(calculation);
    fieldMap.set(raw.id, {
      id: raw.id,
      label: `${left.label} ${calculation.operation} ${right.label}`,
      type: "number",
      description: "Safe derived value computed from the selected numeric fields.",
      calculation: { operation: calculation.operation, left, right },
      ...(left.unit === right.unit && left.unit ? { unit: left.unit } : {}),
    });
  }
  const validField = (field: unknown) => {
    if (typeof field !== "string" || !fieldMap.has(field)) {
      if (typeof field === "string" && !invalidFields.includes(field)) invalidFields.push(field);
      return false;
    }
    return true;
  };

  const output = value.output;
  if (!["records", "aggregate", "grouped", "analysis", "clarify"].includes(String(output))) {
    return { plan: null, invalidFields, error: "Unsupported query output." };
  }
  const rawCollections = [
    value.filters ?? [],
    value.groupBy ?? [],
    value.select ?? [],
    value.sort ?? [],
    value.aggregations ?? [],
    value.unavailableFields ?? [],
  ];
  if (!rawCollections.every(Array.isArray)) {
    return { plan: null, invalidFields, error: "Query collections must be arrays." };
  }
  const [rawFilters, rawGroupBy, rawSelect, rawSort, rawAggregations, rawUnavailableFields] = rawCollections as unknown[][];
  if (rawFilters.length > 12 || rawGroupBy.length > 2 || rawSelect.length > 40 || rawSort.length > 4 || rawAggregations.length > 8) {
    return { plan: null, invalidFields, error: "Query plan exceeds supported bounds." };
  }
  if (rawUnavailableFields.length > 8 || rawUnavailableFields.some((field) => typeof field !== "string" || field.length > 100)) {
    return { plan: null, invalidFields, error: "Invalid unavailable-field annotations." };
  }

  const filters: QueryFilter[] = [];
  for (const raw of rawFilters) {
    if (!isPlainObject(raw) || !validField(raw.field) || typeof raw.operator !== "string" || !operators.has(raw.operator as QueryFilter["operator"])) {
      return { plan: null, invalidFields, error: "Invalid filter." };
    }
    if (!["is_empty", "is_not_empty"].includes(raw.operator) && !isFiniteScalar(raw.value)) {
      return { plan: null, invalidFields, error: "Filter values must be finite scalar values." };
    }
    if (raw.operator === "between" && !isFiniteScalar(raw.value2)) {
      return { plan: null, invalidFields, error: "Between filters need two scalar bounds." };
    }
    filters.push({
      field: raw.field as string,
      operator: raw.operator as QueryFilter["operator"],
      ...(isScalar(raw.value) ? { value: raw.value } : {}),
      ...(isScalar(raw.value2) ? { value2: raw.value2 } : {}),
    });
  }

  const groupBy: string[] = [];
  for (const field of rawGroupBy) {
    if (!validField(field)) continue;
    if (typeof field === "string" && !groupBy.includes(field)) groupBy.push(field);
  }
  const select: string[] = [];
  for (const field of rawSelect) {
    if (!validField(field)) continue;
    if (typeof field === "string" && !select.includes(field)) select.push(field);
  }

  const aggregations: DataQueryPlan["aggregations"] = [];
  const aggregationIds = new Set<string>();
  for (const raw of rawAggregations) {
    if (!isPlainObject(raw) || typeof raw.id !== "string" || !/^[a-z][a-z0-9_]{0,39}$/i.test(raw.id) || aggregationIds.has(raw.id) || fieldMap.has(raw.id) ||
      typeof raw.operation !== "string" || !validOperations.has(raw.operation)) {
      return { plan: null, invalidFields, error: "Invalid aggregation." };
    }
    aggregationIds.add(raw.id);
    if (raw.field !== undefined && !validField(raw.field)) continue;
    if (raw.operation !== "count" && typeof raw.field !== "string") {
      return { plan: null, invalidFields, error: "Numeric aggregations require a field." };
    }
    const field = typeof raw.field === "string" ? fieldMap.get(raw.field) : undefined;
    if (raw.operation !== "count" && field?.type !== "number") {
      return { plan: null, invalidFields, error: "Numeric aggregations require a numeric field." };
    }
    aggregations.push({
      id: raw.id,
      ...(typeof raw.field === "string" ? { field: raw.field } : {}),
      operation: raw.operation as DataQueryPlan["aggregations"][number]["operation"],
    });
  }

  const sort: DataQueryPlan["sort"] = [];
  for (const raw of rawSort) {
    if (!isPlainObject(raw) ||
      (typeof raw.field !== "string" || (!fieldMap.has(raw.field) && !aggregationIds.has(raw.field))) ||
      (raw.direction !== "asc" && raw.direction !== "desc")) {
      if (isPlainObject(raw) && typeof raw.field === "string" && !fieldMap.has(raw.field) && !aggregationIds.has(raw.field)) {
        invalidFields.push(raw.field);
      } else {
        return { plan: null, invalidFields, error: "Invalid sort." };
      }
    } else {
      sort.push({ field: raw.field as string, direction: raw.direction });
    }
  }

  const filterLogic = value.filterLogic === "or" ? "or" : "and";
  const limit = typeof value.limit === "number" && Number.isFinite(value.limit)
    ? Math.max(1, Math.min(30, Math.floor(value.limit)))
    : 10;

  let scenario: DataQueryPlan["scenario"];
  if (value.scenario !== undefined && value.scenario !== null) {
    if (!isPlainObject(value.scenario) ||
      (value.scenario.exclude !== "top" && value.scenario.exclude !== "bottom") ||
      !validField(value.scenario.field)) {
      return { plan: null, invalidFields, error: "Invalid scenario." };
    }
    scenario = {
      exclude: value.scenario.exclude,
      field: value.scenario.field as string,
      count: typeof value.scenario.count === "number" && Number.isFinite(value.scenario.count)
        ? Math.max(1, Math.min(50, Math.floor(value.scenario.count)))
        : 1,
    };
  }

  if (invalidFields.length) return { plan: null, invalidFields, error: "Unknown schema fields." };
  if (typeof value.clarification === "string" && value.clarification.length > 200) {
    return { plan: null, invalidFields, error: "Clarification is too long." };
  }
  if (output === "grouped" && !groupBy.length) return { plan: null, invalidFields, error: "Grouped output requires a grouping field." };
  if ((output === "aggregate" || output === "grouped") && !aggregations.length) {
    aggregations.push({ id: "count", operation: "count" });
  }
  return {
    plan: {
      output: output as DataQueryPlan["output"],
      filters,
      filterLogic,
      groupBy,
      select,
      sort,
      limit,
      aggregations,
      calculations,
      unavailableFields: rawUnavailableFields.filter((field): field is string => typeof field === "string").map((field) => field.trim()).filter(Boolean),
      ...(typeof value.clarification === "string" ? { clarification: value.clarification.trim() } : {}),
      ...(scenario ? { scenario } : {}),
    },
    invalidFields,
  };
}

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value.replace(/,/g, "")))) return Number(value.replace(/,/g, ""));
  return null;
}

function comparable(value: unknown, field: DataField): string | number | boolean | null {
  if (value === null || value === undefined || value === "") return null;
  if (field.type === "number") return numericValue(value);
  if (field.type === "date" && typeof value === "string") {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? value.toLocaleLowerCase() : timestamp;
  }
  return typeof value === "string" ? value.trim().toLocaleLowerCase() : value as string | number | boolean;
}

function matchesFilter(site: Site, filter: QueryFilter, field: DataField) {
  const value = getFieldValue(site, field);
  if (filter.operator === "is_empty") return value === null || value === undefined || value === "";
  if (filter.operator === "is_not_empty") return value !== null && value !== undefined && value !== "";
  const left = comparable(value, field);
  const right = comparable(filter.value, field);
  if (left === null || right === null) return false;
  if (filter.operator === "contains" || filter.operator === "not_contains") {
    const contains = String(left).includes(String(right));
    return filter.operator === "contains" ? contains : !contains;
  }
  if (filter.operator === "between") {
    const right2 = comparable(filter.value2, field);
    return right2 !== null && left >= right && left <= right2;
  }
  switch (filter.operator) {
    case "equals": return left === right;
    case "not_equals": return left !== right;
    case "greater_than": return left > right;
    case "greater_than_or_equal": return left >= right;
    case "less_than": return left < right;
    case "less_than_or_equal": return left <= right;
  }
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function aggregate(sites: Site[], schema: DatasetSchema, definition: DataQueryPlan["aggregations"][number]) {
  if (definition.operation === "count" && definition.field) {
    const field = schema.fields.find((entry) => entry.id === definition.field);
    return field ? sites.filter((site) => getFieldValue(site, field) !== null).length : 0;
  }
  if (definition.operation === "count") return sites.length;
  const field = schema.fields.find((entry) => entry.id === definition.field);
  if (!field) return null;
  const values = sites.map((site) => numericValue(getFieldValue(site, field))).filter((value): value is number => value !== null);
  if (!values.length) return null;
  switch (definition.operation) {
    case "sum": return values.reduce((sum, value) => sum + value, 0);
    case "average": return values.reduce((sum, value) => sum + value, 0) / values.length;
    case "min": return Math.min(...values);
    case "max": return Math.max(...values);
    case "median": return median(values);
  }
}

function sortSites(sites: Site[], schema: DatasetSchema, sorts: DataQueryPlan["sort"]) {
  const sorted = [...sites];
  sorted.sort((left, right) => {
    for (const sort of sorts) {
      const field = schema.fields.find((entry) => entry.id === sort.field);
      if (!field) continue;
      const a = comparable(getFieldValue(left, field), field);
      const b = comparable(getFieldValue(right, field), field);
      if (a === null && b === null) continue;
      if (a === null) return 1;
      if (b === null) return -1;
      if (a < b) return sort.direction === "asc" ? -1 : 1;
      if (a > b) return sort.direction === "asc" ? 1 : -1;
    }
    return left.name.localeCompare(right.name);
  });
  return sorted;
}

function makeAnalysis(sites: Site[], schema: DatasetSchema) {
  const numeric: NonNullable<QueryResult["analysis"]>["numeric"] = [];
  const categorical: NonNullable<QueryResult["analysis"]>["categorical"] = [];
  const dates: NonNullable<QueryResult["analysis"]>["dates"] = [];
  for (const field of schema.fields) {
    if (field.type === "number") {
      const values = sites.map((site) => ({ project: site.name, value: numericValue(getFieldValue(site, field)) }))
        .filter((entry): entry is { project: string; value: number } => entry.value !== null);
      if (!values.length) continue;
      const sorted = [...values].sort((a, b) => a.value - b.value);
      const numbers = sorted.map((entry) => entry.value);
      const q1 = median(numbers.slice(0, Math.floor(numbers.length / 2)));
      const q3 = median(numbers.slice(Math.ceil(numbers.length / 2)));
      const iqr = q1 === null || q3 === null ? 0 : q3 - q1;
      const outliers = iqr > 0 && q1 !== null && q3 !== null
        ? sorted.filter((entry) => entry.value < q1 - 1.5 * iqr || entry.value > q3 + 1.5 * iqr)
        : [];
      numeric.push({
        field: field.id,
        count: values.length,
        missing: sites.length - values.length,
        sum: numbers.reduce((sum, value) => sum + value, 0),
        average: numbers.reduce((sum, value) => sum + value, 0) / values.length,
        median: median(numbers) ?? 0,
        min: numbers[0],
        max: numbers[numbers.length - 1],
        lowest: sorted.slice(0, 3),
        highest: sorted.slice(-3).reverse(),
        outliers: outliers.slice(0, 8),
      });
    } else if (field.type === "date") {
      const values = sites.map((site) => ({ project: site.name, value: getFieldValue(site, field) }))
        .filter((entry): entry is { project: string; value: string } => typeof entry.value === "string" && Boolean(entry.value.trim()));
      const sorted = [...values].sort((a, b) => Date.parse(a.value) - Date.parse(b.value));
      if (sorted.length) dates.push({ field: field.id, count: sorted.length, earliest: sorted[0], latest: sorted[sorted.length - 1] });
    } else {
      const counts = new Map<string, number>();
      let count = 0;
      for (const site of sites) {
        const value = getFieldValue(site, field);
        if (value === null || value === undefined || value === "") continue;
        const label = String(value);
        counts.set(label, (counts.get(label) ?? 0) + 1);
        count += 1;
      }
      if (!count) continue;
      categorical.push({
        field: field.id,
        count,
        distinct: counts.size,
        topValues: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([value, valueCount]) => ({ value, count: valueCount })),
      });
    }
  }
  return { numeric, categorical, dates };
}

function makeRows(sites: Site[], schema: DatasetSchema, select: string[]) {
  const fields = select.length ? select : [schema.recordLabelField];
  return sites.map((site) => Object.fromEntries(fields.map((id) => {
    const field = schema.fields.find((entry) => entry.id === id);
    return [id, field ? getFieldValue(site, field) : null];
  })));
}

export function executeDataQuery(sites: Site[], schema: DatasetSchema, plan: DataQueryPlan): QueryResult {
  const activeSchema: DatasetSchema = {
    ...schema,
    fields: [
      ...schema.fields,
      ...plan.calculations.flatMap((calculation) => {
        const left = schema.fields.find((field) => field.id === calculation.left);
        const right = schema.fields.find((field) => field.id === calculation.right);
        if (!left || !right) return [];
        return [{
          id: calculation.id,
          label: `${left.label} ${calculation.operation} ${right.label}`,
          type: "number" as const,
          description: "Safe derived value computed from selected numeric fields.",
          calculation: { operation: calculation.operation, left, right },
          ...(left.unit === right.unit && left.unit ? { unit: left.unit } : {}),
        }];
      }),
    ],
  };
  const filters = plan.filters.map((filter) => ({
    filter,
    field: activeSchema.fields.find((entry) => entry.id === filter.field)!,
  }));
  let scoped = sites.filter((site) => {
    if (!filters.length) return true;
    const results = filters.map(({ filter, field }) => matchesFilter(site, filter, field));
    return plan.filterLogic === "or" ? results.some(Boolean) : results.every(Boolean);
  });

  if (plan.scenario) {
    const field = activeSchema.fields.find((entry) => entry.id === plan.scenario!.field)!;
    const ranked = sortSites(scoped, activeSchema, [{ field: field.id, direction: plan.scenario.exclude === "top" ? "desc" : "asc" }]);
    const excluded = new Set(ranked.slice(0, plan.scenario.count));
    scoped = scoped.filter((site) => !excluded.has(site));
  }

  const matchedCount = scoped.length;
  if (plan.output === "clarify") {
    return { output: "clarify", matchedCount: 0, totalCount: sites.length };
  }
  if (plan.output === "analysis") {
    return { output: "analysis", matchedCount, totalCount: sites.length, analysis: makeAnalysis(scoped, activeSchema), ...(plan.unavailableFields.length ? { unavailableFields: plan.unavailableFields } : {}) };
  }

  if (plan.output === "aggregate") {
    return {
      output: "aggregate",
      matchedCount,
      totalCount: sites.length,
      aggregations: plan.aggregations.map((definition) => ({
        id: definition.id,
        ...(definition.field ? { field: definition.field } : {}),
        label: definition.field ? activeSchema.fields.find((field) => field.id === definition.field)?.label ?? definition.field : "Projects",
        operation: definition.operation,
        ...(definition.field && activeSchema.fields.find((field) => field.id === definition.field)?.unit
          ? { unit: activeSchema.fields.find((field) => field.id === definition.field)?.unit }
          : {}),
        value: aggregate(scoped, activeSchema, definition),
      })),
      ...(plan.unavailableFields.length ? { unavailableFields: plan.unavailableFields } : {}),
    };
  }

  if (plan.output === "grouped") {
    const groups = new Map<string, Site[]>();
    for (const site of scoped) {
      const key = plan.groupBy.map((id) => {
        const field = activeSchema.fields.find((entry) => entry.id === id)!;
        return getFieldValue(site, field);
      });
      const serialized = JSON.stringify(key);
      groups.set(serialized, [...(groups.get(serialized) ?? []), site]);
    }
    let rows = [...groups.entries()].map(([keyText, records]) => {
      const keyValues = JSON.parse(keyText) as unknown[];
      const key = Object.fromEntries(plan.groupBy.map((id, index) => [id, keyValues[index]]));
      const values = Object.fromEntries(plan.aggregations.map((definition) => [definition.id, aggregate(records, activeSchema, definition)]));
      return { key, count: records.length, values };
    });
    rows.sort((left, right) => {
      for (const sort of plan.sort) {
        const a = sort.field in left.values ? left.values[sort.field] : left.key[sort.field];
        const b = sort.field in right.values ? right.values[sort.field] : right.key[sort.field];
        if (a === b) continue;
        if (a === null || a === undefined) return 1;
        if (b === null || b === undefined) return -1;
        if (a < b) return sort.direction === "asc" ? -1 : 1;
        if (a > b) return sort.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    const selectedCount = rows.length;
    rows = rows.slice(0, plan.limit);
    return { output: "grouped", matchedCount, totalCount: sites.length, selectedCount, truncated: selectedCount > rows.length, groups: rows, ...(plan.unavailableFields.length ? { unavailableFields: plan.unavailableFields } : {}) };
  }

  const sorted = sortSites(scoped, activeSchema, plan.sort);
  const fields = new Set(plan.select);
  for (const sort of plan.sort) fields.add(sort.field);
  for (const filter of plan.filters) fields.add(filter.field);
  if (!fields.size) fields.add(schema.recordLabelField);
  const selectedFields = [...fields];
  const rows = makeRows(sorted.slice(0, plan.limit), activeSchema, selectedFields);
  return {
    output: "records",
    matchedCount,
    totalCount: sites.length,
    selectedCount: rows.length,
    truncated: matchedCount > rows.length,
    rows,
    ...(plan.unavailableFields.length ? { unavailableFields: plan.unavailableFields } : {}),
  };
}

export function getQueryPlanFieldIds(plan: DataQueryPlan) {
  return [
    ...plan.filters.map((filter) => filter.field),
    ...plan.groupBy,
    ...plan.select,
    ...plan.sort.map((entry) => entry.field),
    ...plan.aggregations.flatMap((entry) => entry.field ? [entry.field] : []),
    ...plan.calculations.flatMap((entry) => [entry.left, entry.right]),
    ...(plan.scenario ? [plan.scenario.field] : []),
  ];
}
