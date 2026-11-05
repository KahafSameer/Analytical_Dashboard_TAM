import assert from "node:assert/strict";
import test from "node:test";
import { summarizeCategories } from "../lib/analytics.ts";
import { serializeCsv } from "../lib/csv.ts";
import { normalizeSheetRows } from "../lib/excel.ts";

const headers = [
  "Name",
  "District",
  "Project Type",
  "Approved Cost",
  "Allocated",
  "Released",
  "Funds Utilized",
  "Allocation 2024-2025",
  "Release 2024-2025",
  "Utilized 2024-2025",
];

test("normalization counts malformed financial cells and keeps valid amounts", () => {
  const result = normalizeSheetRows(headers, [{
    Name: "Riverfront Visitor Centre",
    District: "Lahore",
    "Project Type": "Visitor infrastructure",
    "Approved Cost": "not a number",
    Allocated: "1,250.5",
    Released: "   ",
    "Funds Utilized": 450,
    "Allocation 2024-2025": "invalid",
    "Release 2024-2025": null,
    "Utilized 2024-2025": 100,
  }], "Projects");

  assert.equal(result.invalidAmountCount, 2);
  assert.equal(result.sites[0].approvedCost, 0);
  assert.equal(result.sites[0].allocated, 1250.5);
  assert.equal(result.sites[0].released, 0);
  assert.equal(result.sites[0].utilized, 450);
  assert.equal(result.sites[0].fiscalYears[0].allocation, 0);
});

test("normalization treats missing amounts as zero without diagnostics", () => {
  const result = normalizeSheetRows(headers, [{
    Name: "Old Fort",
    "Approved Cost": 0,
    Allocated: null,
    Released: "",
    "Funds Utilized": undefined,
  }], "Projects");

  assert.equal(result.invalidAmountCount, 0);
  assert.equal(result.sites[0].category, "Unclassified");
});

test("category summaries exclude generic and unclassified labels", () => {
  const site = (id, category, approvedCost) => ({
    id,
    name: id,
    district: "Lahore",
    category,
    approvedCost,
    utilized: 0,
  });

  assert.deepEqual(summarizeCategories([
    site("a", "Tourism project", 50),
    site("b", "Unclassified", 75),
    site("c", "Visitor infrastructure", 100),
  ]), [{
    category: "Visitor infrastructure",
    projects: 1,
    approved: 100,
    utilized: 0,
  }]);
});

test("CSV output neutralizes formula-leading text, including whitespace prefixes", () => {
  const csv = serializeCsv([
    ["Project", "Amount"],
    ["=HYPERLINK(\"https://example.test\")", -25],
    ["\t@SUM(A1:A2)", 0],
    ["+1+1", "safe, value"],
    ["-1+2", "quote \" correctly"],
  ]);

  assert.equal(csv, [
    '"Project","Amount"',
    '"\'=HYPERLINK(""https://example.test"")","-25"',
    '"\'\t@SUM(A1:A2)","0"',
    '"\'+1+1","safe, value"',
    '"\'-1+2","quote "" correctly"',
  ].join("\r\n"));
});
