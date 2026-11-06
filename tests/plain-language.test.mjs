import assert from "node:assert/strict";
import test from "node:test";
import { getPortfolioSummary } from "../lib/analytics.ts";
import { ATTENTION_COLOR, SCHEDULE_COLORS, SERIES_COLORS } from "../lib/chart-theme.ts";
import { CHART_HELP, COLOR_GUIDE, GLOSSARY, GLOSSARY_BY_ID, KPI_HELP } from "../lib/guide-content.ts";
import { croreLabel, portfolioInShort, projectInShort } from "../lib/plain-summary.ts";
import { getScheduleStatus } from "../lib/schedule.ts";

function site(overrides) {
  return {
    id: "scheme-1",
    name: "Project",
    description: "",
    district: "Murree",
    region: "Not specified",
    category: "Unclassified",
    image: "",
    approvedCost: 3189.5,
    allocated: 1091.5,
    released: 1091.5,
    utilized: 74.9,
    overallProgress: 0.024,
    fiscalYears: [],
    ...overrides,
  };
}

test("amounts in millions are also given in crore or lakh", () => {
  assert.equal(croreLabel(250), "about 25 crore");
  assert.equal(croreLabel(8578.6), "about 858 crore");
  assert.equal(croreLabel(15.3), "about 1.5 crore");
  assert.equal(croreLabel(0.5), "about 5 lakh");
});

test("portfolio summary reads as plain sentences", () => {
  const sites = [site({}), site({ id: "b", utilized: 0, overallProgress: 0, released: 50 })];
  const sentences = portfolioInShort(getPortfolioSummary(sites), { total: 89, areas: 1, unspentRelease: 1066.6, schedule: { pastEnd: 1, endingSoon: 4 } });
  assert.equal(sentences[0], "There are 2 tourism projects in 1 area of Punjab.");
  assert.match(sentences[1], /^Their total approved budget is Rs 6,379m \(about 638 crore\)\.$/);
  assert.match(sentences[2], /^So far Rs 75m has been spent — 1\.2% of that budget\.$/);
  assert.match(sentences[3], /handed over to projects but not spent yet/);
  assert.equal(sentences[4], "1 project has not spent any money yet.");
  assert.equal(sentences[5], "4 projects are planned to finish within six months; 1 project has passed the planned finish date.");

  const filtered = portfolioInShort(getPortfolioSummary([site({})]), { total: 89, areas: 1, selection: "Murree", unspentRelease: 0 });
  assert.equal(filtered[0], "This selection has 1 of the 89 tourism projects, in 1 area.");
  assert.equal(filtered.at(-1), "Every project has started spending.");
});

test("project summary explains money and schedule in plain words", () => {
  const today = new Date(Date.UTC(2026, 10, 6));
  const project = site({ gestationPeriod: "01 Jul 2025 - 30 Jun 2027" });
  const sentences = projectInShort(project, getScheduleStatus(project, today));
  assert.equal(sentences[0], "This project in Murree has an approved budget of Rs 3,189.5m (about 319 crore).");
  assert.equal(sentences[1], "So far Rs 1,091.5m has been handed over and Rs 74.9m spent — 2.4% of the budget.");
  assert.equal(sentences[2], "Rs 1,016.6m of the money handed over has not been spent yet.");
  assert.equal(sentences[3], "It started on 1 Jul 2025 and is planned to finish on 30 Jun 2027, 236 days from now.");
  assert.match(sentences[4], /^About 68% of the planned time has passed, but only 2\.4% of the budget has been spent\.$/);

  const province = projectInShort(site({ district: "Punjab", released: 0, utilized: 0, overallProgress: 0 }), null);
  assert.equal(province[0].startsWith("This province-wide project"), true);
  assert.equal(province[1], "No money has been handed over to it yet.");
});

test("guide content is complete and consistent with the chart colors", () => {
  const ids = GLOSSARY.map((term) => term.id);
  assert.equal(new Set(ids).size, ids.length, "glossary ids are unique");
  for (const term of GLOSSARY) assert.ok(term.short.length > 20 && term.short.endsWith("."), `${term.id} has a full sentence`);
  for (const anchor of ["financial-progress", "approved-cost", "spent", "released"]) assert.ok(GLOSSARY_BY_ID[anchor], `guide anchor ${anchor} exists`);
  const colors = COLOR_GUIDE.flatMap((group) => group.items.map((item) => item.color));
  for (const color of [SERIES_COLORS.allocation, SERIES_COLORS.release, SERIES_COLORS.utilized, ATTENTION_COLOR, SCHEDULE_COLORS["past-end"]]) {
    assert.ok(colors.includes(color), `color guide explains ${color}`);
  }
  for (const text of [...Object.values(CHART_HELP), ...Object.values(KPI_HELP)]) {
    assert.ok(text.length > 30, "help text is a real explanation");
    assert.doesNotMatch(text, /Google|sheet/i, "help text does not name the data source");
  }
});
