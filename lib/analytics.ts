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
