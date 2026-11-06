import assert from "node:assert/strict";
import test from "node:test";
import {
  getCostConcentration,
  getDistrictYearMatrix,
  getFundingPipeline,
  getProjectBenchmarks,
  getRelatedProjects,
} from "../lib/analytics.ts";
import {
  describeScheduleState,
  getCompletionTimeline,
  getScheduleStatus,
  getSpendLaggards,
  parseGestationPeriod,
  summarizeSchedule,
} from "../lib/schedule.ts";
import {
  assistantSharePayload,
  buildShareUrl,
  composeShareMessage,
  portfolioSharePayload,
  projectSharePayload,
  stripMarkdown,
} from "../lib/share.ts";
import {
  DEFAULT_FILTERS,
  describeFilters,
  filtersFromSearchParams,
  filtersToQueryString,
} from "../lib/portfolio-filters.ts";
import { getPortfolioSummary } from "../lib/analytics.ts";

function site(overrides) {
  return {
    id: "scheme-1",
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
    fiscalYears: [
      { label: "2024–25", allocation: 10, release: 10, utilized: 5 },
      { label: "2025–26", allocation: 40, release: 30, utilized: 15 },
    ],
    ...overrides,
  };
}

const today = new Date(Date.UTC(2026, 10, 6)); // 6 Nov 2026

test("gestation periods parse in the sheet's format and common variants", () => {
  const parsed = parseGestationPeriod("01 Jul 2024  -  30 Jun 2027");
  assert.equal(parsed.start.toISOString().slice(0, 10), "2024-07-01");
  assert.equal(parsed.end.toISOString().slice(0, 10), "2027-06-30");
  assert.equal(parseGestationPeriod("2025-01-15 to 2026-03-31").end.toISOString().slice(0, 10), "2026-03-31");
  assert.equal(parseGestationPeriod("July 2024 – June 2027").end.toISOString().slice(0, 10), "2027-06-30");
  assert.equal(parseGestationPeriod("Mark 2024 - Junk 2025"), null);
  assert.equal(parseGestationPeriod("30 Jun 2027 - 01 Jul 2024"), null, "end before start is rejected");
  assert.equal(parseGestationPeriod("31 Feb 2025 - 30 Jun 2027"), null, "impossible dates are rejected");
  assert.equal(parseGestationPeriod(undefined), null);
});

test("schedule status compares time elapsed with financial progress", () => {
  const halfway = getScheduleStatus({ gestationPeriod: "06 Nov 2025 - 06 Nov 2027", overallProgress: 0.1 }, today);
  assert.equal(halfway.state, "in-progress");
  assert.ok(Math.abs(halfway.elapsed - 0.5) < 0.01);
  assert.ok(Math.abs(halfway.spendGap - 0.4) < 0.01);
  assert.equal(describeScheduleState(halfway), "365 days to planned end");

  const past = getScheduleStatus({ gestationPeriod: "01 Jan 2024 - 30 Jun 2026", overallProgress: 0.9 }, today);
  assert.equal(past.state, "past-end");
  assert.equal(past.elapsed, 1);
  assert.match(describeScheduleState(past), /^Planned end passed 129 days ago$/);

  const future = getScheduleStatus({ gestationPeriod: "01 Jan 2027 - 30 Jun 2028", overallProgress: 0 }, today);
  assert.equal(future.state, "not-started");
  assert.equal(future.elapsed, 0);
  assert.equal(describeScheduleState(future), "Starts in 56 days");
});

test("schedule summary, laggards and completion timeline", () => {
  const sites = [
    site({ id: "a", name: "A", gestationPeriod: "01 Jul 2024 - 30 Jun 2026", overallProgress: 0.3, approvedCost: 300 }), // past end, low spend
    site({ id: "b", name: "B", gestationPeriod: "01 Jul 2025 - 31 Dec 2026", overallProgress: 0.1 }), // ending soon, lagging
    site({ id: "c", name: "C", gestationPeriod: "01 Jul 2025 - 30 Jun 2028", overallProgress: 0.6 }), // ahead of time
    site({ id: "d", name: "D", gestationPeriod: "01 Jan 2027 - 30 Jun 2028", overallProgress: 0 }), // not started
    site({ id: "e", name: "E", gestationPeriod: undefined }),
  ];
  const summary = summarizeSchedule(sites, today);
  assert.equal(summary.withSchedule, 4);
  assert.equal(summary.withoutSchedule, 1);
  assert.equal(summary.pastEnd, 1);
  assert.equal(summary.pastEndLowSpend, 1);
  assert.equal(summary.endingSoon, 1);
  assert.equal(summary.notStarted, 1);
  // b: 90% of time elapsed, 10% spent (gap 0.8); a: past end, 30% spent (gap 0.7); c is ahead.
  assert.deepEqual(getSpendLaggards(summary).map((entry) => entry.site.id), ["b", "a"]);

  const timeline = getCompletionTimeline(summary, today);
  assert.deepEqual(timeline.map((bucket) => bucket.label), ["H1 2026", "H2 2026", "H1 2027", "H2 2027", "H1 2028"]);
  assert.deepEqual(timeline.map((bucket) => [bucket.passed, bucket.upcoming]), [[1, 0], [0, 1], [0, 0], [0, 0], [0, 2]]);
  assert.equal(timeline.find((bucket) => bucket.containsToday).label, "H2 2026");
  assert.equal(timeline[0].approved, 300);

  // A long range (more than eight half-years) switches to yearly buckets.
  const long = summarizeSchedule([
    site({ id: "x", gestationPeriod: "01 Jan 2020 - 30 Jun 2021" }),
    site({ id: "y", gestationPeriod: "01 Jan 2024 - 31 Dec 2030" }),
  ], today);
  assert.deepEqual(getCompletionTimeline(long, today).map((bucket) => bucket.label), ["2021", "2022", "2023", "2024", "2025", "2026", "2027", "2028", "2029", "2030"]);
});

test("funding pipeline converts stage to stage", () => {
  const pipeline = getFundingPipeline([site({}), site({ id: "b", approvedCost: 300, allocated: 50, released: 60, utilized: 40 })]);
  assert.deepEqual(pipeline.map((stage) => stage.value), [400, 100, 100, 60]);
  assert.equal(pipeline[0].ofPrevious, null);
  assert.equal(pipeline[1].ofApproved, 0.25);
  assert.equal(pipeline[3].ofPrevious, 0.6);
  assert.deepEqual(getFundingPipeline([]).map((stage) => stage.ofApproved), [0, 0, 0, 0]);
});

test("cost concentration and district × year matrix", () => {
  const sites = [
    site({ id: "big", name: "Big", approvedCost: 600, district: "Murree" }),
    site({ id: "mid", name: "Mid", approvedCost: 300 }),
    site({ id: "small", name: "Small", approvedCost: 100 }),
  ];
  const concentration = getCostConcentration(sites, 2);
  assert.deepEqual(concentration.top.map((entry) => entry.site.id), ["big", "mid"]);
  assert.equal(concentration.topShare, 0.9);
  assert.equal(concentration.restCount, 1);
  assert.equal(concentration.restShare, 0.1);

  const matrix = getDistrictYearMatrix(sites, "utilized");
  assert.deepEqual(matrix.years, ["2024–25", "2025–26"]);
  assert.deepEqual(matrix.rows.map((row) => [row.district, row.values, row.total, row.projects]), [
    ["Lahore", [10, 30], 40, 2],
    ["Murree", [5, 15], 20, 1],
  ]);
  assert.equal(matrix.max, 30);
});

test("project benchmarks are amount-weighted; single-project districts have no district value", () => {
  const sites = [
    site({ id: "a", approvedCost: 100, released: 50, utilized: 10, allocated: 50, overallProgress: 0.1, currentYearProgress: 0.2 }),
    site({ id: "b", approvedCost: 300, released: 100, utilized: 90, allocated: 200, overallProgress: 0.3, currentYearProgress: 0.6 }),
    site({ id: "c", district: "Murree", approvedCost: 600, released: 0, utilized: 0, allocated: 0, overallProgress: 0 }),
  ];
  const { districtProjects, metrics } = getProjectBenchmarks(sites[0], sites);
  assert.equal(districtProjects, 2);
  const progress = metrics.find((metric) => metric.id === "progress");
  assert.equal(progress.project, 0.1);
  assert.equal(progress.district, 0.25); // (10 + 90) / (100 + 300)
  assert.equal(progress.portfolio, 0.1); // 100 / 1000
  assert.equal(metrics.find((metric) => metric.id === "currentYear").district, 0.4);
  const solo = getProjectBenchmarks(sites[2], sites);
  assert.equal(solo.metrics[0].district, null);
  assert.equal(solo.metrics.find((metric) => metric.id === "spendOfRelease").project, null, "no release → no rate");
  assert.deepEqual(getRelatedProjects(sites[0], sites).map((entry) => entry.id), ["b"]);
});

test("share links encode text for each platform", () => {
  const payload = { title: "Kotli Sattian chair lift (Murree)", text: "• Approved cost: Rs 3,189.5m", url: "https://example.org/sites/scheme-2701" };
  const whatsapp = new URL(buildShareUrl("whatsapp", payload));
  assert.equal(whatsapp.hostname, "wa.me");
  assert.equal(whatsapp.searchParams.get("text"), "*Kotli Sattian chair lift (Murree)*\n\n• Approved cost: Rs 3,189.5m\n\nhttps://example.org/sites/scheme-2701");
  assert.equal(new URL(buildShareUrl("facebook", payload)).searchParams.get("u"), payload.url);
  const x = new URL(buildShareUrl("x", payload));
  assert.equal(x.searchParams.get("url"), payload.url);
  assert.equal(x.searchParams.get("text"), payload.title);
  assert.equal(new URL(buildShareUrl("linkedin", payload)).searchParams.get("url"), payload.url);
  assert.match(buildShareUrl("telegram", payload), /^https:\/\/t\.me\/share\/url\?url=/);
  assert.match(buildShareUrl("email", payload), /^mailto:\?subject=Kotli%20Sattian/);
  assert.equal(composeShareMessage(payload), "Kotli Sattian chair lift (Murree)\n\n• Approved cost: Rs 3,189.5m\n\nhttps://example.org/sites/scheme-2701");
});

test("share text for projects, portfolio views and assistant answers", () => {
  const project = projectSharePayload(site({ name: "Lahore Heritage", approvedCost: 180, released: 180, utilized: 0, overallProgress: 0 }), "https://x.test/sites/a");
  assert.equal(project.title, "Lahore Heritage (Lahore)");
  assert.match(project.text, /Approved cost: Rs 180\.0m/);
  assert.match(project.text, /Financial progress: 0\.0%/);

  const portfolio = portfolioSharePayload(getPortfolioSummary([site({}), site({ id: "b", utilized: 0 })]), { total: 89, selection: "Lahore", url: "https://x.test/?district=Lahore" });
  assert.match(portfolio.text, /2 of 89 projects · Lahore/);
  assert.match(portfolio.text, /1 project with no spend recorded/);

  const answer = assistantSharePayload("Which   district has the most unspent funds?", "**Murree** has the most — see [the project](/sites/scheme-2701).\n\n| District | Unspent |\n|---|---|\n| Murree | Rs 1,466m |", "https://x.test/");
  assert.equal(answer.title, "Q: Which district has the most unspent funds?");
  assert.equal(answer.text, "Murree has the most — see the project (/sites/scheme-2701).\n\nDistrict — Unspent\nMurree — Rs 1,466m");
  assert.ok(assistantSharePayload("q", "word ".repeat(400), "u", 100).text.length <= 100);
});

test("markdown is flattened for sharing", () => {
  assert.equal(stripMarkdown("## Top places\n- **Lahore Fort**<br>Mughal era\n* *Badshahi* Mosque\n`code`"), "Top places\n• Lahore Fort Mughal era\n• Badshahi Mosque\ncode");
});

test("filters round-trip through the URL and are described for sharing", () => {
  const filters = { search: "chair lift", district: "Murree", activity: "spend", progress: "0-25" };
  const query = filtersToQueryString(filters);
  assert.equal(query, "q=chair+lift&district=Murree&spend=spend&progress=0-25");
  assert.deepEqual(filtersFromSearchParams(new URLSearchParams(query), ["Lahore", "Murree"]), filters);
  assert.equal(filtersToQueryString(DEFAULT_FILTERS), "");
  assert.deepEqual(
    filtersFromSearchParams(new URLSearchParams("district=Nowhere&spend=bogus&progress=200"), ["Lahore"]),
    DEFAULT_FILTERS,
  );
  assert.equal(describeFilters(filters), "Murree · Spend recorded · Financial progress below 25% · “chair lift”");
  assert.equal(describeFilters(DEFAULT_FILTERS), "");
});
