import type { Site } from "@/lib/types";

export type ActivityFilter = "all" | "spend" | "none";
export type ProgressRangeFilter = "all" | "0-25" | "25-50" | "50-75" | "75-100";

export type PortfolioFilters = {
  search: string;
  district: string;
  activity: ActivityFilter;
  progress: ProgressRangeFilter;
};

export const ALL_DISTRICTS = "all";

export const DEFAULT_FILTERS: PortfolioFilters = {
  search: "",
  district: ALL_DISTRICTS,
  activity: "all",
  progress: "all",
};

export const activityOptions: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All projects" },
  { id: "spend", label: "Spend recorded" },
  { id: "none", label: "No spend yet" },
];

export const progressRangeOptions: { id: ProgressRangeFilter; label: string }[] = [
  { id: "all", label: "Any progress" },
  { id: "0-25", label: "Below 25%" },
  { id: "25-50", label: "25–50%" },
  { id: "50-75", label: "50–75%" },
  { id: "75-100", label: "75% and above" },
];

const NOT_SPECIFIED = new Set(["", "not specified", "unclassified"]);

export function isSpecified(value: string | undefined): value is string {
  return value !== undefined && !NOT_SPECIFIED.has(value.trim().toLowerCase());
}

/** District plus region, omitting placeholder values such as "Not specified". */
export function formatLocation(site: Pick<Site, "district" | "region">): string {
  return [site.district, site.region].filter(isSpecified).join(", ") || "Location not specified";
}

/** Funds released to the project that have not yet been recorded as spent. */
export function getUnspentRelease(site: Site): number {
  return Math.max(0, site.released - site.utilized);
}

export function countActiveFilters(filters: PortfolioFilters): number {
  return [
    filters.search.trim() !== "",
    filters.district !== ALL_DISTRICTS,
    filters.activity !== "all",
    filters.progress !== "all",
  ].filter(Boolean).length;
}

function matchesProgress(progress: number, range: ProgressRangeFilter): boolean {
  const percent = progress * 100;
  switch (range) {
    case "0-25": return percent < 25;
    case "25-50": return percent >= 25 && percent < 50;
    case "50-75": return percent >= 50 && percent < 75;
    case "75-100": return percent >= 75;
    default: return true;
  }
}

export function filterSites(sites: Site[], filters: PortfolioFilters): Site[] {
  const needle = filters.search.trim().toLowerCase();
  return sites.filter((site) => {
    if (needle && ![site.name, site.district, site.category, site.description, site.code]
      .some((value) => value?.toLowerCase().includes(needle))) return false;
    if (filters.district !== ALL_DISTRICTS && site.district !== filters.district) return false;
    if (filters.activity === "spend" && !(site.utilized > 0)) return false;
    if (filters.activity === "none" && site.utilized !== 0) return false;
    return matchesProgress(site.overallProgress, filters.progress);
  });
}

export type ProjectSortKey =
  | "name"
  | "district"
  | "approvedCost"
  | "released"
  | "utilized"
  | "unspentRelease"
  | "overallProgress";
export type SortDirection = "asc" | "desc";

function sortValue(site: Site, key: ProjectSortKey): string | number {
  if (key === "unspentRelease") return getUnspentRelease(site);
  return site[key];
}

/** Returns a new array; ties fall back to project name so ordering is stable. */
export function sortSites(sites: Site[], key: ProjectSortKey, direction: SortDirection): Site[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...sites].sort((a, b) => {
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    const primary = typeof left === "string" && typeof right === "string"
      ? left.localeCompare(right)
      : Number(left) - Number(right);
    return primary * factor || a.name.localeCompare(b.name);
  });
}

export function getDistricts(sites: Site[]): string[] {
  return [...new Set(sites.map((site) => site.district))].sort((a, b) => a.localeCompare(b));
}
