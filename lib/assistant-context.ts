import { getPortfolioSummary, formatMillions, formatPercent } from "@/lib/analytics";
import type { DashboardData, Site } from "@/lib/types";

export type AssistantHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantSource = {
  site: string;
  field: string;
  value: string;
};

export type PreparedAssistantContext = {
  kind: "data" | "unsupported" | "off-topic" | "not-found" | "language-fallback";
  context: Record<string, unknown>;
  sources: AssistantSource[];
  immediateAnswer?: string;
};

const unsupportedPatterns = [
  /\b(delay(?:ed)?|late|behind schedule|overdue|milestone|activity|activities|physical progress|construction progress|project status|status|in progress|active projects?|currently active)\b/i,
  /\b(completed|complete hain|complete ho|completion|complete projects?|projects? (?:are|is) complete|projects? complete|sites? (?:are|is) complete|sites? complete|pending|done|finished|behind schedule)\b/i,
  /\b(last update|previous update|progress improve|improved|progress change|changed since|trend|planned vs actual)\b/i,
  /\b(delayed|delay|der se|taakhir|mukammal|complete huay|kitne complete)\b/i,
];

const dashboardPatterns = [
  /\b(progress|fund|funding|budget|allocation|allocated|release|released|utili[sz]ation|utili[sz]ed|spend|spent|expenditure|top|highest|lowest|average|mean|compare|comparison|summary|summari[sz]e|attention|below|under|above|over|count|how many|kitne|kitni|kon|kaun|kis|sab se|zyada|kam|neeche|upar|kharch|rakham|taraqqi)\b/i,
  /\d+\s*(?:%|percent|per cent)/i,
];

function normalizeText(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function formatSiteProgress(site: Site) {
  return formatPercent(site.overallProgress, 1);
}

function siteSource(site: Site, field: string, value: string): AssistantSource {
  return { site: site.name, field, value };
}

function getMatchingSites(sites: Site[], text: string) {
  const normalized = normalizeText(text);
  return sites
    .filter((site) => normalized.includes(normalizeText(site.name)))
    .sort((a, b) => b.name.length - a.name.length);
}

function getMatchingDistricts(sites: Site[], text: string) {
  const normalized = normalizeText(text);
  return [...new Set(sites.map((site) => site.district))]
    .filter((district) => district !== "Not specified" && normalized.includes(normalizeText(district)))
    .sort((a, b) => b.length - a.length);
}

type ProgressFilter =
  | { kind: "single"; threshold: number; direction: "below" | "above" }
  | { kind: "range" | "or"; lower: number; upper: number };

function parseProgressFilter(text: string): ProgressFilter | null {
  const number = String.raw`(\d{1,3}(?:\.\d+)?)\s*(?:%|percent|per cent)?`;
  const lowerMatch = text.match(new RegExp(String.raw`(?:below|under|less than|lower than|beneath|se neeche|kam)\s+${number}`, "i"));
  const upperMatch = text.match(new RegExp(String.raw`(?:above|over|more than|greater than|higher than|se upar|zyada)\s+${number}`, "i"));
  const betweenMatch = text.match(new RegExp(String.raw`(?:between|from)\s+${number}\s+(?:and|to)\s+${number}`, "i"));
  const toMatch = betweenMatch ?? text.match(new RegExp(String.raw`(\d{1,3}(?:\.\d+)?)\s*(?:%|percent|per cent)?\s*(?:-|to)\s*(\d{1,3}(?:\.\d+)?)\s*(?:%|percent|per cent)`, "i"));
  const toProgress = (value: string | undefined) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed / 100 : null;
  };

  if (toMatch) {
    const lower = toProgress(toMatch[1]);
    const upper = toProgress(toMatch[2]);
    if (lower !== null && upper !== null && lower <= upper) return { kind: "range", lower, upper };
  }

  const lower = toProgress(lowerMatch?.[1]);
  const upper = toProgress(upperMatch?.[1]);
  if (lower !== null && upper !== null) {
    return {
      kind: /\bor\b/i.test(text) ? "or" : "range",
      lower: upper,
      upper: lower,
    };
  }
  if (lower !== null) return { kind: "single", threshold: lower, direction: "below" };
  if (upper !== null) return { kind: "single", threshold: upper, direction: "above" };

  return null;
}

const topicStopWords = new Set([
  "a", "about", "any", "are", "available", "can", "dashboard", "data", "do", "for", "give",
  "financial", "have", "heritage", "in", "information", "is", "list", "me", "of", "on",
  "project", "projects", "program", "programs", "progress", "related", "site", "sites",
  "show", "tell", "the", "there", "tourism", "what", "which", "you",
]);

function topicTokens(text: string) {
  return normalizeText(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/'s$/, "").replace(/s$/, ""))
    .filter((token) => token.length > 1 && !topicStopWords.has(token) && !/^\d+$/.test(token));
}

function findTopicSites(sites: Site[], query: string) {
  const terms = topicTokens(query);
  if (!terms.length) return [];
  return sites.filter((site) => {
    const searchable = new Set(topicTokens(`${site.name} ${site.category}`));
    return terms.every((term) => searchable.has(term));
  });
}

function recordForSite(site: Site, query: string) {
  const record: Record<string, unknown> = {
    name: site.name,
    district: site.district,
    financialProgress: formatSiteProgress(site),
  };
  if (/\b(category|type|kind)\b/i.test(query)) record.category = site.category;
  if (/\b(region|province)\b/i.test(query)) record.region = site.region;
  if (/\b(gestation|duration|delivery period)\b/i.test(query) && site.gestationPeriod) {
    record.gestationPeriod = site.gestationPeriod;
  }
  if (/\b(approved|cost|budget|fund|funding|allocation|allocated|release|released|utili[sz]ation|utili[sz]ed|spend|spent|expenditure|amount|rupee|rs\.?)\b/i.test(query)) {
    record.approvedCost = formatMillions(site.approvedCost);
    record.allocated = formatMillions(site.allocated);
    record.released = formatMillions(site.released);
    record.utilized = formatMillions(site.utilized);
  }
  if (/\b(year|annual|fiscal|fy)\b/i.test(query)) {
    record.fiscalYears = site.fiscalYears.map((year) => ({
      year: year.label,
      allocation: formatMillions(year.allocation),
      release: formatMillions(year.release),
      utilized: formatMillions(year.utilized),
    }));
  }
  return record;
}

export function prepareAssistantContext(
  data: DashboardData,
  message: string,
  history: AssistantHistoryMessage[],
): PreparedAssistantContext {
  const recentConversation = history.slice(-6).map((item) => item.content);
  const planningText = normalizeText([...recentConversation, message].join(" "));
  const query = normalizeText(message);
  const sites = data.sites;
  const recentSites = getMatchingSites(sites, planningText);
  const currentSites = getMatchingSites(sites, message);
  const districts = getMatchingDistricts(sites, message);
  const asksTopicSearch = /\b(?:what (?:do you have|is there|are there)(?: about| for| on)?|related to|about|tell me about|information on)\b/i.test(query);
  const followUp = /^(?:and\b|also\b|what about\b|aur\b|us ka\b|uski\b|unka\b|it\b|that\b|those\b|them\b|ones?\b)/i.test(query)
    || /\b(?:what about|which ones|which one|un ka|un ki)\b/i.test(query);
  const asksPortfolioFilter = /\b(below|under|less than|lower than|above|over|more than|greater than|top|highest|lowest|best|worst)\b/i.test(query);
  const asksForSiteList = /\b(list|show|which|batao|dikhao)\b/i.test(query) && /\b(sites?|projects?)\b/i.test(query);
  const matchedSites = currentSites.length
    ? currentSites
    : followUp && !districts.length && !asksPortfolioFilter
      ? recentSites
      : [];

  if (unsupportedPatterns.some((pattern) => pattern.test(query))) {
    return {
      kind: "unsupported",
      context: { availableFields: ["financial progress", "district", "approved cost", "allocation", "release", "utilization", "fiscal-year funding"] },
      sources: [],
      immediateAnswer: "The dashboard data does not include project status, completion, delay, activity, milestone, physical-progress, or dated change history, so I can’t determine that reliably.",
    };
  }

  if (!dashboardPatterns.some((pattern) => pattern.test(query)) && !asksForSiteList && !asksTopicSearch) {
    return {
      kind: "language-fallback",
      context: {},
      sources: [],
    };
  }

  const summary = getPortfolioSummary(sites);
  let scopedSites = districts.length
    ? sites.filter((site) => districts.includes(site.district))
    : sites;

  if (matchedSites.length) {
    scopedSites = [...new Map(matchedSites.map((site) => [site.id, site])).values()];
  }

  const sources: AssistantSource[] = [];
  const context: Record<string, unknown> = {
    source: "Current normalized Google Sheets dashboard dataset",
    fieldsAvailable: [
      "site name",
      "district",
      "financial progress",
      "approved cost",
      "allocated",
      "released",
      "utilized",
      "annual fiscal-year funding",
    ],
  };

  if (matchedSites.length) {
    if (/\b(compare|versus|vs\.?|better|which one|kon behtar)\b/i.test(query) && matchedSites.length < 2) {
      return {
        kind: "not-found",
        context: { matchingSites: matchedSites.map((site) => site.name) },
        sources: [],
        immediateAnswer: "I found only one matching site. Please name both sites you want to compare.",
      };
    }
    const requestedSites = matchedSites.slice(0, 10);
    const records = requestedSites.map((site) => recordForSite(site, query));
    for (const site of requestedSites) {
      const requestedFinancialFields = [
        { pattern: /\b(approved|approved cost|cost|budget)\b/i, field: "Approved cost", value: formatMillions(site.approvedCost) },
        { pattern: /\b(allocation|allocated)\b/i, field: "Allocated", value: formatMillions(site.allocated) },
        { pattern: /\b(release|released)\b/i, field: "Released", value: formatMillions(site.released) },
        { pattern: /\b(utili[sz]ation|utili[sz]ed|spend|spent|expenditure)\b/i, field: "Utilized", value: formatMillions(site.utilized) },
      ].filter(({ pattern }) => pattern.test(query));
      const fields = requestedFinancialFields.length
        ? requestedFinancialFields
        : /\b(fund|funding|financials)\b/i.test(query)
          ? [{
            field: "Funding totals",
            value: `Approved ${formatMillions(site.approvedCost)} · allocated ${formatMillions(site.allocated)} · released ${formatMillions(site.released)} · utilized ${formatMillions(site.utilized)}`,
          }]
          : [{ field: "Financial progress", value: formatSiteProgress(site) }];
      for (const field of fields) sources.push(siteSource(site, field.field, field.value));
    }
    context.sites = records;
    context.recordCount = requestedSites.length;
    return { kind: "data", context, sources: sources.slice(0, 8) };
  }

  if (/\b(compare|versus|vs\.?|which performs better)\b/i.test(query)) {
    return {
      kind: "not-found",
      context: {},
      sources: [],
      immediateAnswer: "Please name the two sites you want to compare.",
    };
  }

  if (districts.length) context.location = districts;
  const subsetSummary = getPortfolioSummary(scopedSites);
  const spendQuestion = /\b(spend|spent|utili[sz]ed|expenditure)\b/i.test(query);
  const asksWhich = /\b(which|show|list|kon|kaun|batao|dikhao)\b/i.test(query);
  const asksNoSpend = /\b(no spend|without spend|no expenditure|not spent|nothing spent|awaiting spend)\b/i.test(query);
  if (spendQuestion && (asksWhich || /\b(how many|count|number of|kitne|kitni|projects? with)\b/i.test(query))) {
    const filtered = scopedSites.filter((site) => asksNoSpend ? site.utilized === 0 : site.utilized > 0);
    if (asksWhich) {
      context.spendFilter = {
        condition: asksNoSpend ? "no recorded utilization" : "recorded utilization greater than zero",
        matchingCount: filtered.length,
        sites: filtered.slice(0, 20).map((site) => recordForSite(site, query)),
        truncated: filtered.length > 20,
      };
      for (const site of filtered.slice(0, 8)) {
        sources.push(siteSource(site, "Funds utilized", formatMillions(site.utilized)));
      }
    } else {
      context.spendCount = {
        condition: asksNoSpend ? "no recorded utilization" : "recorded utilization greater than zero",
        count: filtered.length,
        totalInScope: scopedSites.length,
      };
      sources.push({
        site: districts.length ? `${districts.join(", ")} portfolio` : "Portfolio",
        field: asksNoSpend ? "Projects with no recorded spend" : "Projects with recorded spend",
        value: String(filtered.length),
      });
    }
    return { kind: "data", context, sources: sources.slice(0, 8) };
  }

  const isOverallSummary = !asksForSiteList
    && /\b(overall|portfolio|all projects|all sites|quick summary|summary|summari[sz]e|how are)\b/i.test(query);
  if (isOverallSummary) {
    context.summary = {
      projectCount: subsetSummary.siteCount,
      weightedFinancialProgress: formatPercent(subsetSummary.weightedProgress),
      averageSiteFinancialProgress: formatPercent(subsetSummary.meanProgress),
      totalApprovedCost: formatMillions(subsetSummary.totalApproved),
      totalAllocated: formatMillions(subsetSummary.totalAllocated),
      totalReleased: formatMillions(subsetSummary.totalReleased),
      totalUtilized: formatMillions(subsetSummary.totalUtilized),
      projectsWithRecordedSpend: subsetSummary.sitesWithSpend,
      projectsWithNoRecordedSpend: subsetSummary.awaitingSpend,
    };
    const label = districts.length ? `${districts.join(", ")} portfolio` : "Portfolio";
    sources.push(
      { site: label, field: "Project count", value: String(subsetSummary.siteCount) },
      { site: label, field: "Weighted financial progress", value: formatPercent(subsetSummary.weightedProgress) },
    );
    if (/\b(approved|cost|budget)\b/i.test(query)) {
      sources.push({ site: label, field: "Total approved cost", value: formatMillions(subsetSummary.totalApproved) });
    }
    if (/\b(allocation|allocated)\b/i.test(query)) {
      sources.push({ site: label, field: "Total allocated", value: formatMillions(subsetSummary.totalAllocated) });
    }
    if (/\b(release|released)\b/i.test(query)) {
      sources.push({ site: label, field: "Total released", value: formatMillions(subsetSummary.totalReleased) });
    }
    if (/\b(utili[sz]ation|utili[sz]ed|spend|spent|expenditure)\b/i.test(query)) {
      sources.push({ site: label, field: "Total utilized", value: formatMillions(subsetSummary.totalUtilized) });
    }
    return { kind: "data", context, sources };
  }

  const topMatch = query.match(/\btop\s+(\d{1,2})\b/i);
  const progressFilter = parseProgressFilter(query) ?? parseProgressFilter(planningText);
  if (progressFilter) {
    const filtered = scopedSites
      .filter((site) => {
        if (progressFilter.kind === "single") {
          return progressFilter.direction === "below"
            ? site.overallProgress < progressFilter.threshold
            : site.overallProgress > progressFilter.threshold;
        }
        const aboveLower = site.overallProgress > progressFilter.lower;
        const belowUpper = site.overallProgress < progressFilter.upper;
        return progressFilter.kind === "or" ? aboveLower || belowUpper : aboveLower && belowUpper;
      })
      .sort((a, b) => a.overallProgress - b.overallProgress);
    const condition = progressFilter.kind === "single"
      ? `${progressFilter.direction} ${formatPercent(progressFilter.threshold)}`
      : progressFilter.kind === "or"
        ? `below ${formatPercent(progressFilter.upper)} or above ${formatPercent(progressFilter.lower)}`
        : `between ${formatPercent(progressFilter.lower)} and ${formatPercent(progressFilter.upper)}`;
    context.filter = {
      condition,
      matchingCount: filtered.length,
      totalInScope: scopedSites.length,
      sites: filtered.slice(0, topMatch ? Math.min(10, Math.max(1, Number(topMatch[1]))) : 20)
        .map((site) => recordForSite(site, query)),
      truncated: filtered.length > (topMatch ? Math.min(10, Math.max(1, Number(topMatch[1]))) : 20),
    };
    for (const site of filtered.slice(0, 8)) {
      sources.push(siteSource(site, "Financial progress", formatSiteProgress(site)));
    }
    const overlappingOr = progressFilter.kind === "or"
      && progressFilter.lower < progressFilter.upper
      && progressFilter.upper > 0
      && progressFilter.lower < 1;
    if (overlappingOr) {
      context.responseGuidance = `Interpreting the OR condition literally, it matches all progress values because every value is either below ${formatPercent(progressFilter.upper)} or above ${formatPercent(progressFilter.lower)}. If the user meant progress between these thresholds, ask them to confirm.`;
    }
    return { kind: "data", context, sources };
  }

  const count = Math.min(10, Math.max(1, Number(topMatch?.[1] ?? 5)));
  const wantsLowest = /\b(lowest|least|minimum|worst|kam progress|sab se kam)\b/i.test(query);
  const wantsRanking = /\b(top|highest|lowest|best|worst|maximum|minimum|performing|attention|zyada progress|sab se)\b/i.test(query);
  if (wantsRanking) {
    const ranked = [...scopedSites].sort((a, b) =>
      wantsLowest ? a.overallProgress - b.overallProgress : b.overallProgress - a.overallProgress,
    ).slice(0, topMatch ? count : wantsLowest ? 1 : 5);
    context.ranking = {
      order: wantsLowest ? "ascending financial progress" : "descending financial progress",
      sites: ranked.map((site) => recordForSite(site, query)),
    };
    for (const site of ranked) {
      sources.push(siteSource(site, "Financial progress", formatSiteProgress(site)));
    }
    return { kind: "data", context, sources: sources.slice(0, 8) };
  }

  if (/\b(average|mean|avg|ausat)\b/i.test(query)) {
    context.averageFinancialProgress = formatPercent(subsetSummary.meanProgress);
    context.projectCount = subsetSummary.siteCount;
    const label = districts.length ? `${districts.join(", ")} portfolio` : "Portfolio";
    sources.push({ site: label, field: "Average site financial progress", value: formatPercent(subsetSummary.meanProgress) });
    return { kind: "data", context, sources };
  }

  if (/\b(how many|count|number of|kitne|kitni|total projects|total sites)\b/i.test(query)) {
    context.projectCount = subsetSummary.siteCount;
    const label = districts.length ? `${districts.join(", ")} portfolio` : "Portfolio";
    sources.push({ site: label, field: "Project count", value: String(subsetSummary.siteCount) });
    return { kind: "data", context, sources };
  }

  if (districts.length) {
    const ranked = [...scopedSites].sort((a, b) => b.overallProgress - a.overallProgress);
    context.locationSites = ranked.slice(0, 20).map((site) => recordForSite(site, query));
    context.locationSiteCount = ranked.length;
    for (const site of ranked.slice(0, 8)) {
      sources.push(siteSource(site, "Financial progress", formatSiteProgress(site)));
    }
    return { kind: "data", context, sources };
  }

  if (asksForSiteList) {
    const listed = [...scopedSites].sort((a, b) => a.name.localeCompare(b.name));
    context.siteList = listed.slice(0, 20).map((site) => recordForSite(site, query));
    context.siteCount = listed.length;
    context.truncated = listed.length > 20;
    for (const site of listed.slice(0, 8)) {
      sources.push(siteSource(site, "Financial progress", formatSiteProgress(site)));
    }
    return { kind: "data", context, sources };
  }

  const topicSites = findTopicSites(sites, query);
  if (topicSites.length) {
    const listed = topicSites
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20);
    context.topicSearch = {
      matchingCount: topicSites.length,
      sites: listed.map((site) => ({
        name: site.name,
        category: site.category,
        district: site.district,
        financialProgress: formatSiteProgress(site),
      })),
      truncated: topicSites.length > listed.length,
    };
    for (const site of listed.slice(0, 8)) {
      sources.push(siteSource(site, "Financial progress", formatSiteProgress(site)));
    }
    return { kind: "data", context, sources };
  }
  if (asksTopicSearch) {
    return {
      kind: "not-found",
      context: {},
      sources: [],
      immediateAnswer: "I couldn’t find a project name or category matching that topic in the current dashboard data.",
    };
  }

  if (/\b(progress|fund|funding|budget|allocation|allocated|release|released|utili[sz]ation|utili[sz]ed|spend|spent|expenditure|summary|compare|comparison)\b/i.test(query)) {
    const namedEntity = query.match(/\b(?:of|for|about)\s+([a-z][\w'-]*(?:\s+[a-z][\w'-]*){0,4})/i)?.[1]
      ?? query.match(/^([a-z][\w'-]*(?:\s+[a-z][\w'-]*){0,4})\s+(?:ka|ki|ke)\b/i)?.[1];
    const hasLikelySiteName = Boolean(namedEntity && !/^(?:all|the|these|those|site|sites|project|projects|portfolio)\b/i.test(namedEntity));
    if (hasLikelySiteName) {
      return {
        kind: "not-found",
        context: {},
        sources: [],
        immediateAnswer: "I couldn’t find a matching site in the current dashboard data. Please check the site name or try a district name.",
      };
    }
    context.summary = {
      projectCount: summary.siteCount,
      weightedFinancialProgress: formatPercent(summary.weightedProgress),
      averageSiteFinancialProgress: formatPercent(summary.meanProgress),
    };
    return { kind: "data", context, sources: [] };
  }

  return {
    kind: "off-topic",
    context: {},
    sources: [],
    immediateAnswer: "I can help with questions about financial progress, funding, sites, districts, and fiscal years in the dashboard data.",
  };
}
