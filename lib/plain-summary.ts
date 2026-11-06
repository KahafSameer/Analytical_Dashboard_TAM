import { formatMillions, formatPercent } from "@/lib/analytics";
import { getUnspentRelease } from "@/lib/portfolio-filters";
import { formatScheduleDate, type ScheduleStatus, type ScheduleSummary } from "@/lib/schedule";
import type { AnalyticsSummary, Site } from "@/lib/types";

/**
 * "In short" sentences in plain English for readers without a finance background. Amounts also
 * get a crore/lakh equivalent, which most readers in Pakistan know better than millions.
 */

/** Amount in PKR millions as crore (1 crore = 10 million) or lakh (1 million = 10 lakh). */
export function croreLabel(millions: number): string {
  const crore = millions / 10;
  if (crore >= 100) return `about ${Math.round(crore).toLocaleString("en-US")} crore`;
  if (crore >= 1) return `about ${crore.toLocaleString("en-US", { maximumFractionDigits: 1 })} crore`;
  return `about ${(millions * 10).toLocaleString("en-US", { maximumFractionDigits: 1 })} lakh`;
}

const plural = (count: number, one: string, many: string) => `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;

export function portfolioInShort(
  summary: AnalyticsSummary,
  options: { total: number; areas: number; selection?: string; unspentRelease: number; schedule?: Pick<ScheduleSummary, "pastEnd" | "endingSoon"> },
): string[] {
  const sentences = [
    options.selection
      ? `This selection has ${summary.siteCount} of the ${options.total} tourism projects, in ${plural(options.areas, "area", "areas")}.`
      : `There are ${summary.siteCount} tourism projects in ${plural(options.areas, "area", "areas")} of Punjab.`,
    `Their total approved budget is ${formatMillions(summary.totalApproved, 0)} (${croreLabel(summary.totalApproved)}).`,
    `So far ${formatMillions(summary.totalUtilized, 0)} has been spent — ${formatPercent(summary.weightedProgress)} of that budget.`,
  ];
  if (options.unspentRelease >= 0.5) {
    sentences.push(`${formatMillions(options.unspentRelease, 0)} has been handed over to projects but not spent yet.`);
  }
  sentences.push(summary.awaitingSpend
    ? `${plural(summary.awaitingSpend, "project has", "projects have")} not spent any money yet.`
    : "Every project has started spending.");
  const schedule = options.schedule;
  if (schedule && (schedule.pastEnd || schedule.endingSoon)) {
    const parts = [
      schedule.endingSoon ? `${plural(schedule.endingSoon, "project is", "projects are")} planned to finish within six months` : "",
      schedule.pastEnd ? `${plural(schedule.pastEnd, "project has", "projects have")} passed the planned finish date` : "",
    ].filter(Boolean);
    sentences.push(`${parts.join("; ")}.`.replace(/^./, (letter) => letter.toUpperCase()));
  }
  return sentences;
}

function projectSubject(site: Site): string {
  const district = site.district.trim().toLowerCase();
  if (district === "punjab") return "This province-wide project";
  if (district === "multiple district" || district === "multiple districts") return "This multi-district project";
  if (!district || district === "not specified") return "This project";
  return `This project in ${site.district}`;
}

export function projectInShort(site: Site, status: ScheduleStatus | null): string[] {
  const sentences = [`${projectSubject(site)} has an approved budget of ${formatMillions(site.approvedCost)} (${croreLabel(site.approvedCost)}).`];
  sentences.push(site.released > 0
    ? `So far ${formatMillions(site.released)} has been handed over and ${formatMillions(site.utilized)} spent — ${formatPercent(site.overallProgress)} of the budget.`
    : "No money has been handed over to it yet.");
  const unspent = getUnspentRelease(site);
  if (unspent >= 0.05) sentences.push(`${formatMillions(unspent)} of the money handed over has not been spent yet.`);
  if (status) {
    const start = formatScheduleDate(status.start);
    const end = formatScheduleDate(status.end);
    if (status.state === "not-started") {
      sentences.push(`It is planned to start on ${start} and finish on ${end}.`);
    } else if (status.state === "past-end") {
      const days = Math.abs(status.daysRemaining);
      sentences.push(`Its planned finish date (${end}) passed ${plural(days, "day", "days")} ago, with ${formatPercent(site.overallProgress)} of the budget spent.`);
    } else {
      sentences.push(`It started on ${start} and is planned to finish on ${end}, ${plural(status.daysRemaining, "day", "days")} from now.`);
      if (status.spendGap > 0.25) {
        sentences.push(`About ${formatPercent(status.elapsed, 0)} of the planned time has passed, but only ${formatPercent(site.overallProgress)} of the budget has been spent.`);
      }
    }
  }
  return sentences;
}
