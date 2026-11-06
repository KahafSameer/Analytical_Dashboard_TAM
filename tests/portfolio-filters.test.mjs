import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  filterSites,
  formatLocation,
  getUnspentRelease,
  sortSites,
} from "../lib/portfolio-filters.ts";

function site(overrides) {
  return {
    id: overrides.name.toLowerCase().replaceAll(" ", "-"),
    name: "Project",
    description: "",
    district: "Lahore",
    region: "Not specified",
    category: "Unclassified",
    image: "https://example.com/a.jpg",
    approvedCost: 100,
    allocated: 50,
    released: 40,
    utilized: 20,
    overallProgress: 0.2,
    fiscalYears: [],
    ...overrides,
  };
}

const sites = [
  site({ name: "Fort Restoration", district: "Lahore", code: "2701", utilized: 0, released: 30, overallProgress: 0 }),
  site({ name: "Cable Car", district: "Murree", utilized: 80, released: 90, overallProgress: 0.8 }),
  site({ name: "Lake Resort", district: "Murree", utilized: 30, released: 30, overallProgress: 0.3 }),
  site({ name: "Museum Upgrade", district: "Sahiwal", utilized: 55, released: 50, overallProgress: 0.55 }),
];

test("default filters keep every project and count as inactive", () => {
  assert.equal(filterSites(sites, DEFAULT_FILTERS).length, sites.length);
  assert.equal(countActiveFilters(DEFAULT_FILTERS), 0);
  assert.equal(countActiveFilters({ ...DEFAULT_FILTERS, search: "   " }), 0);
});

test("filters combine district, spend status and progress range", () => {
  const murree = { ...DEFAULT_FILTERS, district: "Murree" };
  assert.deepEqual(filterSites(sites, murree).map((item) => item.name), ["Cable Car", "Lake Resort"]);
  assert.deepEqual(
    filterSites(sites, { ...murree, progress: "75-100" }).map((item) => item.name),
    ["Cable Car"],
  );
  assert.deepEqual(
    filterSites(sites, { ...DEFAULT_FILTERS, activity: "none" }).map((item) => item.name),
    ["Fort Restoration"],
  );
  assert.equal(countActiveFilters({ ...murree, progress: "75-100" }), 2);
});

test("progress ranges are contiguous with no gaps or overlaps", () => {
  const ranges = ["0-25", "25-50", "50-75", "75-100"];
  const probes = [0, 0.249, 0.25, 0.4999, 0.5, 0.75, 1].map((progress, index) =>
    site({ name: `Probe ${index}`, overallProgress: progress }));
  for (const probe of probes) {
    const matches = ranges.filter((progress) => filterSites([probe], { ...DEFAULT_FILTERS, progress }).length === 1);
    assert.equal(matches.length, 1, `progress ${probe.overallProgress} should match exactly one range`);
  }
});

test("search matches project code and district case-insensitively", () => {
  assert.deepEqual(filterSites(sites, { ...DEFAULT_FILTERS, search: "2701" }).map((item) => item.name), ["Fort Restoration"]);
  assert.equal(filterSites(sites, { ...DEFAULT_FILTERS, search: " sahiwal " }).length, 1);
});

test("unspent release never goes negative when spend exceeds release", () => {
  assert.equal(getUnspentRelease(sites[0]), 30);
  assert.equal(getUnspentRelease(sites[3]), 0);
});

test("sorting is non-mutating, directional and breaks ties by name", () => {
  const original = sites.map((item) => item.name);
  const byUnspent = sortSites(sites, "unspentRelease", "desc").map((item) => item.name);
  assert.deepEqual(byUnspent, ["Fort Restoration", "Cable Car", "Lake Resort", "Museum Upgrade"]);
  assert.deepEqual(sites.map((item) => item.name), original);
  assert.deepEqual(
    sortSites(sites, "district", "asc").map((item) => item.name),
    ["Fort Restoration", "Cable Car", "Lake Resort", "Museum Upgrade"],
  );
  assert.deepEqual(sortSites(sites, "overallProgress", "asc")[0].name, "Fort Restoration");
});

test("location omits placeholder regions", () => {
  assert.equal(formatLocation({ district: "Murree", region: "Not specified" }), "Murree");
  assert.equal(formatLocation({ district: "Murree", region: "Punjab" }), "Murree, Punjab");
  assert.equal(formatLocation({ district: "", region: "" }), "Location not specified");
});
