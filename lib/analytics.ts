import type { AnalyticsSummary, FiscalYear, Site } from "@/lib/types";

export type DistrictFundingSummary = {
  district: string;
  projects: number;
  approved: number;
  allocated: number;
  released: number;
  utilized: number;
};

export type CategorySummary = {
  category: string;
  projects: number;
  approved: number;
  utilized: number;
};

export function hasReportedCategory(category: string): boolean {
  return !["", "tourism project", "unclassified", "not specified"].includes(category.trim().toLowerCase());
}

export type ProgressBand = {
  band: string;
  count: number;
  from: number;
  to: number;
};

export const progressBands = [
  { band: "No expenditure", from: 0, to: 0 },
  { band: "1–25%", from: 0, to: 0.25 },
  { band: "26–50%", from: 0.25, to: 0.5 },
  { band: "51–75%", from: 0.5, to: 0.75 },
  { band: "76–100%", from: 0.75, to: 1 },
] as const;

export function summarizeDistricts(items: Site[]): DistrictFundingSummary[] {
  const summaries = new Map<string, DistrictFundingSummary>();
  for (const site of items) {
    const summary = summaries.get(site.district) ?? {
      district: site.district,
      projects: 0,
      approved: 0,
      allocated: 0,
      released: 0,
      utilized: 0,
    };
    summary.projects += 1;
    summary.approved += site.approvedCost;
    summary.allocated += site.allocated;
    summary.released += site.released;
    summary.utilized += site.utilized;
    summaries.set(site.district, summary);
  }
  return [...summaries.values()];
}

export function summarizeCategories(items: Site[]): CategorySummary[] {
  const summaries = new Map<string, CategorySummary>();
  for (const site of items.filter((item) => hasReportedCategory(item.category))) {
    const summary = summaries.get(site.category) ?? {
      category: site.category,
      projects: 0,
      approved: 0,
      utilized: 0,
    };
    summary.projects += 1;
    summary.approved += site.approvedCost;
    summary.utilized += site.utilized;
    summaries.set(site.category, summary);
  }
  return [...summaries.values()].sort((a, b) => b.approved - a.approved);
}

export function summarizeProgressBands(items: Site[]): ProgressBand[] {
  return progressBands.map(({ band, from, to }) => ({
    band,
    from,
    to,
    count: items.filter((site) => band === "No expenditure"
      ? site.overallProgress === 0
      : site.overallProgress > from && site.overallProgress <= to).length,
    }));
}

export function getPortfolioSummary(items: Site[]): AnalyticsSummary {
  const totalApproved = items.reduce((sum, site) => sum + site.approvedCost, 0);
  const totalAllocated = items.reduce((sum, site) => sum + site.allocated, 0);
  const totalReleased = items.reduce((sum, site) => sum + site.released, 0);
  const totalUtilized = items.reduce((sum, site) => sum + site.utilized, 0);

  return {
    siteCount: items.length,
    weightedProgress: totalApproved ? totalUtilized / totalApproved : 0,
    utilizationRate: totalAllocated ? totalUtilized / totalAllocated : 0,
    totalApproved,
    totalAllocated,
    totalReleased,
    totalUtilized,
    sitesWithSpend: items.filter((site) => site.utilized > 0).length,
    awaitingSpend: items.filter((site) => site.utilized === 0).length,
    meanProgress: items.length
      ? items.reduce((sum, site) => sum + site.overallProgress, 0) / items.length
      : 0,
  };
}

export function combineFiscalYears(items: Site[]): FiscalYear[] {
  const years = new Map<string, FiscalYear>();
  for (const site of items) {
    for (const year of site.fiscalYears) {
      const current = years.get(year.label) ?? {
        label: year.label,
        allocation: 0,
        release: 0,
        utilized: 0,
      };
      current.allocation += year.allocation;
      current.release += year.release;
      current.utilized += year.utilized;
      years.set(year.label, current);
    }
  }
  return [...years.values()];
}

export type PipelineStageId = "approved" | "allocated" | "released" | "utilized";
export type PipelineStage = {
  id: PipelineStageId;
  label: string;
  value: number;
  /** Share of the approved cost (0–1). */
  ofApproved: number;
  /** Share of the previous stage (0–1), or null for the first stage. */
  ofPrevious: number | null;
  /** How the previous stage converts into this one, e.g. "allocated". */
  verb: string;
};

/** Approved → allocated → released → utilized, with stage-to-stage conversion. */
export function getFundingPipeline(items: Site[]): PipelineStage[] {
  const summary = getPortfolioSummary(items);
  const stages: [PipelineStageId, string, number, string][] = [
    ["approved", "Approved cost", summary.totalApproved, ""],
    ["allocated", "Allocated", summary.totalAllocated, "allocated"],
    ["released", "Released", summary.totalReleased, "released"],
    ["utilized", "Spent", summary.totalUtilized, "spent"],
  ];
  return stages.map(([id, label, value, verb], index) => {
    const previous = index > 0 ? stages[index - 1][2] : null;
    return {
      id,
      label,
      value,
      verb,
      ofApproved: summary.totalApproved ? value / summary.totalApproved : 0,
      ofPrevious: previous === null ? null : previous ? value / previous : 0,
    };
  });
}

export type ConcentrationEntry = { site: Site; approved: number; share: number };
export type CostConcentration = {
  top: ConcentrationEntry[];
  topShare: number;
  restCount: number;
  restApproved: number;
  restShare: number;
  total: number;
};

/** How much of the approved cost sits in the largest projects. */
export function getCostConcentration(items: Site[], topN = 5): CostConcentration {
  const total = items.reduce((sum, site) => sum + site.approvedCost, 0);
  const sorted = [...items].sort((a, b) => b.approvedCost - a.approvedCost || a.name.localeCompare(b.name));
  const top = sorted.slice(0, topN).map((site) => ({ site, approved: site.approvedCost, share: total ? site.approvedCost / total : 0 }));
  const topApproved = top.reduce((sum, entry) => sum + entry.approved, 0);
  const restApproved = Math.max(0, total - topApproved);
  return {
    top,
    topShare: total ? topApproved / total : 0,
    restCount: Math.max(0, items.length - top.length),
    restApproved,
    restShare: total ? restApproved / total : 0,
    total,
  };
}

export type YearMeasure = "allocation" | "release" | "utilized";
export type DistrictYearRow = { district: string; values: number[]; total: number; projects: number };
export type DistrictYearMatrix = { years: string[]; rows: DistrictYearRow[]; max: number };

/** District × fiscal-year totals for one measure, districts sorted by their total. */
export function getDistrictYearMatrix(items: Site[], measure: YearMeasure): DistrictYearMatrix {
  const years = combineFiscalYears(items).map((year) => year.label);
  const rows = new Map<string, DistrictYearRow>();
  for (const site of items) {
    const row = rows.get(site.district) ?? { district: site.district, values: years.map(() => 0), total: 0, projects: 0 };
    row.projects += 1;
    for (const year of site.fiscalYears) {
      const index = years.indexOf(year.label);
      if (index === -1) continue;
      row.values[index] += year[measure];
      row.total += year[measure];
    }
    rows.set(site.district, row);
  }
  const sorted = [...rows.values()].sort((a, b) => b.total - a.total || a.district.localeCompare(b.district));
  return { years, rows: sorted, max: Math.max(0, ...sorted.flatMap((row) => row.values)) };
}

export type BenchmarkMetric = {
  id: string;
  label: string;
  description: string;
  project: number | null;
  district: number | null;
  portfolio: number | null;
};

const ratio = (numerator: number, denominator: number) => (denominator > 0 ? numerator / denominator : null);

function groupRates(group: Site[]) {
  const totals = getPortfolioSummary(group);
  const withCurrentYear = group.filter((site) => site.currentYearProgress !== undefined);
  return {
    progress: ratio(totals.totalUtilized, totals.totalApproved),
    spendOfRelease: ratio(totals.totalUtilized, totals.totalReleased),
    releaseOfAllocation: ratio(totals.totalReleased, totals.totalAllocated),
    currentYear: withCurrentYear.length
      ? withCurrentYear.reduce((sum, site) => sum + (site.currentYearProgress ?? 0), 0) / withCurrentYear.length
      : null,
  };
}

/**
 * Compares one project with its district and the whole portfolio. District and portfolio rates
 * are amount-weighted (e.g. total utilized ÷ total approved); the district value is omitted when
 * the project is the only one in its district.
 */
export function getProjectBenchmarks(site: Site, sites: Site[]): { districtProjects: number; metrics: BenchmarkMetric[] } {
  const districtSites = sites.filter((entry) => entry.district === site.district);
  const district = districtSites.length > 1 ? groupRates(districtSites) : null;
  const portfolio = groupRates(sites);
  const metrics: BenchmarkMetric[] = [
    {
      id: "progress",
      label: "Financial progress",
      description: "spent ÷ approved budget",
      project: site.overallProgress,
      district: district?.progress ?? null,
      portfolio: portfolio.progress,
    },
    {
      id: "spendOfRelease",
      label: "Handed-over money spent",
      description: "spent ÷ handed over",
      project: ratio(site.utilized, site.released),
      district: district?.spendOfRelease ?? null,
      portfolio: portfolio.spendOfRelease,
    },
    {
      id: "releaseOfAllocation",
      label: "Set-aside money handed over",
      description: "handed over ÷ set aside",
      project: ratio(site.released, site.allocated),
      district: district?.releaseOfAllocation ?? null,
      portfolio: portfolio.releaseOfAllocation,
    },
  ];
  if (site.currentYearProgress !== undefined) {
    metrics.push({
      id: "currentYear",
      label: "This year's progress",
      description: "share of this year's money spent (average)",
      project: site.currentYearProgress,
      district: district?.currentYear ?? null,
      portfolio: portfolio.currentYear,
    });
  }
  return { districtProjects: districtSites.length, metrics };
}

/** Other projects in the same district, largest approved cost first. */
export function getRelatedProjects(site: Site, sites: Site[], limit = 5): Site[] {
  return sites
    .filter((entry) => entry.id !== site.id && entry.district === site.district)
    .sort((a, b) => b.approvedCost - a.approvedCost || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function getFinancialVariance(site: Site): number {
  return site.overallProgress - site.allocated / Math.max(site.approvedCost, 1);
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}%`;
}

export function formatMillions(value: number, digits = 1): string {
  return `Rs ${value.toLocaleString("en-PK", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}m`;
}
