import type { Site } from "@/lib/types";

const STOPWORDS = new Set([
  "the", "of", "and", "for", "at", "in", "to", "a", "an", "project", "projects", "site", "scheme",
  "ka", "ki", "ke", "ko", "se", "me", "mein", "aur", "hai", "kya", "kahan", "is", "iss", "us", "uss",
]);

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalizeText(value).split(" ").filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

export type ProjectMatch = { site: Site; score: number };

/**
 * Ranks projects against a free-text reference (name, partial name, code or ID).
 * Exact code/ID matches win outright; otherwise tokens are matched against the name
 * (weighted) and district/description, tolerating prefixes such as "chairlift" vs "chair lift".
 */
export function findProjects(sites: Site[], query: string, limit = 3): ProjectMatch[] {
  const normalizedQuery = normalizeText(query).replace(/^#/, "");
  if (!normalizedQuery) return [];
  const queryTokens = tokens(query);
  const compactQuery = normalizedQuery.replaceAll(" ", "");

  const scored = sites.map((site): ProjectMatch => {
    const ids = [site.code, site.projectId, site.id].filter(Boolean).map((value) => normalizeText(String(value)));
    if (ids.includes(normalizedQuery)) return { site, score: 1 };

    const name = normalizeText(site.name);
    if (name === normalizedQuery) return { site, score: 0.99 };
    if (compactQuery.length >= 6 && name.replaceAll(" ", "").includes(compactQuery)) return { site, score: 0.9 };
    if (!queryTokens.length) return { site, score: 0 };

    const nameTokens = new Set(tokens(site.name));
    const contextTokens = new Set(tokens(`${site.district} ${site.description}`));
    const compactName = name.replaceAll(" ", "");
    let weight = 0;
    for (const token of queryTokens) {
      if (nameTokens.has(token)) weight += 1;
      else if (token.length >= 4 && compactName.includes(token)) weight += 0.8;
      else if (contextTokens.has(token)) weight += 0.45;
    }
    return { site, score: Math.min(0.89, (weight / queryTokens.length) * 0.85) };
  });

  return scored
    .filter((match) => match.score >= 0.3)
    .sort((a, b) => b.score - a.score || a.site.name.localeCompare(b.site.name))
    .slice(0, limit);
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

/** A complete, model-friendly profile of one project. Amounts are PKR millions. */
export function buildProjectProfile(site: Site) {
  const placeholder = (value?: string) => !value || ["not specified", "unclassified", "tourism project"].includes(value.trim().toLowerCase());
  return {
    id: site.id,
    name: site.name,
    code: site.code ?? null,
    projectId: site.projectId ?? null,
    district: site.district,
    ...(placeholder(site.region) ? {} : { region: site.region }),
    ...(placeholder(site.category) ? {} : { category: site.category }),
    description: site.description,
    gestationPeriod: site.gestationPeriod ?? null,
    unit: "PKR millions",
    approvedCost: round(site.approvedCost),
    allocated: round(site.allocated),
    released: round(site.released),
    utilized: round(site.utilized),
    releasedNotYetSpent: round(Math.max(0, site.released - site.utilized)),
    financialProgressPercent: round(site.overallProgress * 100, 1),
    ...(site.currentYearProgress !== undefined ? { currentYearFinancialProgressPercent: round(site.currentYearProgress * 100, 1) } : {}),
    spendStatus: site.utilized > 0 ? "Spend recorded" : "No spend recorded yet",
    fiscalYears: site.fiscalYears.map((year) => ({
      year: year.label,
      allocation: round(year.allocation),
      release: round(year.release),
      utilized: round(year.utilized),
    })),
    dashboardPath: `/sites/${site.id}`,
    note: "Financial progress = utilized ÷ approved cost. It is not physical/construction progress.",
  };
}
