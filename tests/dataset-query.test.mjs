import assert from "node:assert/strict";
import test from "node:test";
import { discoverDatasetSchema } from "../lib/data-schema.ts";
import { executeDataQuery, validateDataQueryPlan } from "../lib/dataset-query.ts";

function site({ id, name, city, status = "Active", approvedCost, allocated, utilized, progress }) {
  return {
    id,
    name,
    projectId: id,
    code: id,
    description: name,
    district: city,
    region: "Punjab",
    category: "Heritage",
    image: "",
    approvedCost,
    allocated,
    released: utilized,
    utilized,
    overallProgress: progress / 100,
    currentYearProgress: 0,
    fiscalYears: [],
    sourceFields: { City: city, Status: status, Contractor: "Works Ltd." },
  };
}

const sites = [
  site({ id: "p1", name: "Old Fort", city: "Lahore", status: "Active", approvedCost: 100, allocated: 80, utilized: 70, progress: 40 }),
  site({ id: "p2", name: "River Walk", city: "Lahore", status: "Complete", approvedCost: 200, allocated: 120, utilized: 90, progress: 80 }),
  site({ id: "p3", name: "Hill Museum", city: "Murree", status: "Active", approvedCost: 50, allocated: 40, utilized: 10, progress: 20 }),
  site({ id: "p4", name: "Garden Restoration", city: "Murree", status: "Planned", approvedCost: 400, allocated: 200, utilized: 180, progress: 60 }),
];
const schema = discoverDatasetSchema(sites);
const field = (label) => {
  const found = schema.fields.find((item) => item.label === label);
  assert.ok(found, `expected schema field "${label}"`);
  return found.id;
};
const plan = (overrides = {}) => ({
  output: "records",
  filters: [],
  filterLogic: "and",
  groupBy: [],
  select: [],
  sort: [],
  limit: 10,
  aggregations: [],
  calculations: [],
  unavailableFields: [],
  ...overrides,
});
const execute = (query) => {
  const validation = validateDataQueryPlan(query, schema);
  assert.ok(validation.plan, validation.error ?? `invalid fields: ${validation.invalidFields.join(", ")}`);
  return executeDataQuery(sites, schema, validation.plan);
};

test("discovers extra source columns and safely infers their types", () => {
  assert.equal(schema.fields.find((item) => item.label === "City")?.type, "string");
  assert.equal(schema.fields.find((item) => item.label === "Status")?.type, "string");
  assert.equal(schema.fields.find((item) => item.label === "Contractor")?.type, "string");
});

test("schema omits normalized fields whose source columns are absent", () => {
  const limitedSchema = discoverDatasetSchema(sites, [
    "Name",
    "Total Funds Allocation In Millions",
    "Total Funds Utilization All Fys In Millions",
    "City",
    "Status",
  ]);
  const labels = new Set(limitedSchema.fields.map((item) => item.label));
  assert.equal(labels.has("City"), true);
  assert.equal(labels.has("Status"), true);
  assert.equal(labels.has("Contractor"), false);
  assert.equal(labels.has("Approved cost"), false);
  assert.equal(labels.has("Financial progress"), false);
  assert.equal(labels.has("Utilization of allocation"), true);
});

test("filters and ranks records on multiple live-schema fields", () => {
  const result = execute(plan({
    filters: [{ field: field("Financial progress"), operator: "less_than", value: 50 }],
    select: ["name", field("Approved cost"), field("Financial progress")],
    sort: [{ field: field("Approved cost"), direction: "desc" }],
    limit: 2,
  }));
  assert.equal(result.matchedCount, 2);
  assert.deepEqual(result.rows.map((row) => row.name), ["Old Fort", "Hill Museum"]);
});

test("groups dynamically discovered city fields and sorts by deterministic averages", () => {
  const result = execute(plan({
    output: "grouped",
    groupBy: [field("City")],
    aggregations: [
      { id: "project_count", operation: "count" },
      { id: "average_progress", field: field("Financial progress"), operation: "average" },
    ],
    sort: [{ field: "average_progress", direction: "desc" }],
  }));
  assert.deepEqual(result.groups.map((group) => group.key[field("City")]), ["Lahore", "Murree"]);
  assert.equal(result.groups[0].values.average_progress, 60);
});

test("calculates derived comparisons in TypeScript before ranking", () => {
  const result = execute(plan({
    calculations: [{
      id: "utilization_ahead",
      operation: "difference",
      left: field("Utilization of allocation"),
      right: field("Financial progress"),
    }],
    select: ["name", "utilization_ahead"],
    sort: [{ field: "utilization_ahead", direction: "desc" }],
    limit: 1,
  }));
  assert.equal(result.rows[0].name, "Old Fort");
  assert.equal(result.rows[0].utilization_ahead, 47.5);
});

test("runs hypothetical exclusions without mutating source records", () => {
  const result = execute(plan({
    output: "aggregate",
    aggregations: [{ id: "remaining_average", field: field("Financial progress"), operation: "average" }],
    scenario: { exclude: "top", field: field("Financial progress"), count: 1 },
  }));
  assert.equal(result.aggregations[0].value, 40);
  assert.equal(sites[1].overallProgress, 0.8);
});

test("builds field-wide numeric and categorical insight summaries", () => {
  const result = execute(plan({ output: "analysis" }));
  const cities = result.analysis.categorical.find((item) => item.field === field("City"));
  const cost = result.analysis.numeric.find((item) => item.field === field("Approved cost"));
  assert.deepEqual(cities.topValues[0], { value: "Lahore", count: 2 });
  assert.equal(cost.average, 187.5);
  assert.equal(cost.highest[0].project, "Garden Restoration");
});

test("applies query filters before building analysis summaries", () => {
  const result = execute(plan({
    output: "analysis",
    filters: [{ field: field("City"), operator: "equals", value: "Lahore" }],
  }));
  const cities = result.analysis.categorical.find((item) => item.field === field("City"));
  const cost = result.analysis.numeric.find((item) => item.field === field("Approved cost"));
  assert.equal(result.matchedCount, 2);
  assert.deepEqual(cities.topValues, [{ value: "Lahore", count: 2 }]);
  assert.equal(cost.average, 150);
});

test("rejects unknown columns and arbitrary operations", () => {
  const unknownColumn = validateDataQueryPlan(plan({
    filters: [{ field: "contractor", operator: "equals", value: "Unknown" }],
  }), schema);
  assert.equal(unknownColumn.plan, null);
  assert.deepEqual(unknownColumn.invalidFields, ["contractor"]);

  const arbitraryOperation = validateDataQueryPlan(plan({
    output: "aggregate",
    aggregations: [{ id: "unsafe", operation: "execute", field: "name" }],
  }), schema);
  assert.equal(arbitraryOperation.plan, null);
});

test("reports fields explicitly marked unavailable without fabricating a substitute", () => {
  const result = execute(plan({ unavailableFields: ["contractor"] }));
  assert.deepEqual(result.unavailableFields, ["contractor"]);
});
