import type { Site } from "@/lib/types";

/**
 * Schedule analytics from the sheet's gestation period ("01 Jul 2024 - 30 Jun 2027").
 * Time elapsed is compared with financial progress (spend ÷ approved cost). A gap is a prompt
 * to look closer, not proof of physical delay: the sheet has no physical-progress data.
 */

const DAY_MS = 86_400_000;
/** "Ending soon" window for planned completions. */
export const ENDING_SOON_DAYS = 183;

const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export type ProjectSchedule = { start: Date; end: Date };
export type ScheduleState = "not-started" | "in-progress" | "past-end";
export type ScheduleStatus = ProjectSchedule & {
  state: ScheduleState;
  /** Share of the planned duration that has elapsed, 0–1. */
  elapsed: number;
  /** Days until the planned end; negative once it has passed. */
  daysRemaining: number;
  /** Days until the planned start (0 once started). */
  daysUntilStart: number;
  totalDays: number;
  /** Time elapsed minus financial progress; positive when spending trails the calendar. */
  spendGap: number;
};

/** "Jul", "July" or "Sept" → 6 / 8; other words → undefined. */
function monthIndex(name: string): number | undefined {
  const lower = name.toLowerCase();
  const index = MONTH_NAMES.findIndex((full) => full === lower || full.slice(0, 3) === lower || (lower === "sept" && full === "september"));
  return index === -1 ? undefined : index;
}

function utc(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day ? date : null;
}

/** Finds dates such as "01 Jul 2024", "2024-07-01" or "Jul 2024" (month only) in order. */
function findDates(text: string): { date: Date; monthOnly: boolean }[] {
  const found: { index: number; date: Date; monthOnly: boolean }[] = [];
  for (const match of text.matchAll(/(\d{1,2})[\s.-]+([A-Za-z]{3,9})\.?[\s,.-]+(\d{4})/g)) {
    const month = monthIndex(match[2]);
    const date = month === undefined ? null : utc(Number(match[3]), month, Number(match[1]));
    if (date) found.push({ index: match.index ?? 0, date, monthOnly: false });
  }
  for (const match of text.matchAll(/(\d{4})-(\d{1,2})-(\d{1,2})/g)) {
    const date = utc(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (date) found.push({ index: match.index ?? 0, date, monthOnly: false });
  }
  if (!found.length) {
    for (const match of text.matchAll(/\b([A-Za-z]{3,9})\.?[\s,-]+(\d{4})\b/g)) {
      const month = monthIndex(match[1]);
      const date = month === undefined ? null : utc(Number(match[2]), month, 1);
      if (date) found.push({ index: match.index ?? 0, date, monthOnly: true });
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

/** Parses a gestation period into start and planned end dates (UTC), or null if unreadable. */
export function parseGestationPeriod(value: string | undefined): ProjectSchedule | null {
  if (!value?.trim()) return null;
  const dates = findDates(value);
  if (dates.length < 2) return null;
  const start = dates[0].date;
  const last = dates[1];
  // A month-only end ("Jun 2027") means the end of that month.
  const end = last.monthOnly ? new Date(Date.UTC(last.date.getUTCFullYear(), last.date.getUTCMonth() + 1, 0)) : last.date;
  return end.getTime() > start.getTime() ? { start, end } : null;
}

export function getScheduleStatus(site: Pick<Site, "gestationPeriod" | "overallProgress">, today: Date): ScheduleStatus | null {
  const schedule = parseGestationPeriod(site.gestationPeriod);
  if (!schedule) return null;
  const now = today.getTime();
  const totalDays = (schedule.end.getTime() - schedule.start.getTime()) / DAY_MS;
  const elapsedDays = (now - schedule.start.getTime()) / DAY_MS;
  const elapsed = Math.min(1, Math.max(0, elapsedDays / totalDays));
  const state: ScheduleState = now < schedule.start.getTime() ? "not-started" : now > schedule.end.getTime() ? "past-end" : "in-progress";
  return {
    ...schedule,
    state,
    elapsed,
    daysRemaining: Math.ceil((schedule.end.getTime() - now) / DAY_MS),
    daysUntilStart: Math.max(0, Math.ceil((schedule.start.getTime() - now) / DAY_MS)),
    totalDays: Math.round(totalDays),
    spendGap: elapsed - site.overallProgress,
  };
}

export type ScheduledSite = { site: Site; status: ScheduleStatus };

export type ScheduleSummary = {
  scheduled: ScheduledSite[];
  withSchedule: number;
  withoutSchedule: number;
  notStarted: number;
  inProgress: number;
  pastEnd: number;
  /** Past the planned end with less than half of the approved cost spent. */
  pastEndLowSpend: number;
  endingSoon: number;
  medianElapsed: number;
  medianProgress: number;
};

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarizeSchedule(sites: Site[], today: Date): ScheduleSummary {
  const scheduled = sites
    .map((site) => ({ site, status: getScheduleStatus(site, today) }))
    .filter((entry): entry is ScheduledSite => entry.status !== null);
  const started = scheduled.filter((entry) => entry.status.state !== "not-started");
  return {
    scheduled,
    withSchedule: scheduled.length,
    withoutSchedule: sites.length - scheduled.length,
    notStarted: scheduled.length - started.length,
    inProgress: scheduled.filter((entry) => entry.status.state === "in-progress").length,
    pastEnd: scheduled.filter((entry) => entry.status.state === "past-end").length,
    pastEndLowSpend: scheduled.filter((entry) => entry.status.state === "past-end" && entry.site.overallProgress < 0.5).length,
    endingSoon: scheduled.filter((entry) => entry.status.state === "in-progress" && entry.status.daysRemaining <= ENDING_SOON_DAYS).length,
    medianElapsed: median(started.map((entry) => entry.status.elapsed)),
    medianProgress: median(started.map((entry) => entry.site.overallProgress)),
  };
}

/** Started projects whose spending trails elapsed time the most (gap above `minGap`). */
export function getSpendLaggards(summary: ScheduleSummary, limit = 8, minGap = 0.1): ScheduledSite[] {
  return summary.scheduled
    .filter((entry) => entry.status.state !== "not-started" && entry.status.spendGap >= minGap)
    .sort((a, b) => b.status.spendGap - a.status.spendGap || b.site.approvedCost - a.site.approvedCost)
    .slice(0, limit);
}

export type CompletionBucket = {
  key: string;
  label: string;
  /** Long label for tooltips and tables, e.g. "Jan–Jun 2026". */
  range: string;
  passed: number;
  upcoming: number;
  approved: number;
  containsToday: boolean;
};

/**
 * Planned completions grouped by half-year (or by year when the range is long), split into
 * projects whose planned end has passed and those still upcoming.
 */
export function getCompletionTimeline(summary: ScheduleSummary, today: Date): CompletionBucket[] {
  if (!summary.scheduled.length) return [];
  const ends = summary.scheduled.map((entry) => entry.status.end);
  const first = new Date(Math.min(...ends.map((date) => date.getTime())));
  const last = new Date(Math.max(...ends.map((date) => date.getTime())));
  const halfIndex = (date: Date) => date.getUTCFullYear() * 2 + (date.getUTCMonth() < 6 ? 0 : 1);
  // More than eight half-years would crowd the axis: group by year instead.
  const yearly = halfIndex(last) - halfIndex(first) + 1 > 8;
  const indexOf = (date: Date) => yearly ? date.getUTCFullYear() : halfIndex(date);
  const from = indexOf(first);
  const to = indexOf(last);
  const todayIndex = indexOf(today);

  const buckets: CompletionBucket[] = [];
  for (let index = from; index <= to; index += 1) {
    const year = yearly ? index : Math.floor(index / 2);
    const firstHalf = !yearly && index % 2 === 0;
    buckets.push({
      key: String(index),
      label: yearly ? String(year) : `${firstHalf ? "H1" : "H2"} ${year}`,
      range: yearly ? `Jan–Dec ${year}` : `${firstHalf ? "Jan–Jun" : "Jul–Dec"} ${year}`,
      passed: 0,
      upcoming: 0,
      approved: 0,
      containsToday: index === todayIndex,
    });
  }
  for (const { site, status } of summary.scheduled) {
    const bucket = buckets[indexOf(status.end) - from];
    if (status.end.getTime() < today.getTime()) bucket.passed += 1;
    else bucket.upcoming += 1;
    bucket.approved += site.approvedCost;
  }
  return buckets;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function formatScheduleDate(date: Date): string {
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

/**
 * Reference "today" for schedule maths: the data's fetch time (identical on server and browser,
 * so rendering is deterministic), or the current time if it is missing or unreadable.
 */
export function referenceDate(asOf: string | undefined): Date {
  const date = new Date(asOf ?? Number.NaN);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

/** Human summary of where a project is in its planned schedule. */
export function describeScheduleState(status: ScheduleStatus): string {
  if (status.state === "not-started") return status.daysUntilStart === 1 ? "Starts tomorrow" : `Starts in ${status.daysUntilStart} days`;
  if (status.state === "past-end") {
    const days = Math.abs(status.daysRemaining);
    return `Planned end passed ${days} day${days === 1 ? "" : "s"} ago`;
  }
  return `${status.daysRemaining} day${status.daysRemaining === 1 ? "" : "s"} to planned end`;
}
