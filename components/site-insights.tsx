"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, CalendarClock } from "lucide-react";
import { formatMillions, formatPercent, getProjectBenchmarks, getRelatedProjects } from "@/lib/analytics";
import { NEUTRAL_COLOR, SCHEDULE_COLORS, SERIES_COLORS } from "@/lib/chart-theme";
import { filtersToQueryString, DEFAULT_FILTERS } from "@/lib/portfolio-filters";
import { describeScheduleState, formatScheduleDate, getScheduleStatus, referenceDate, type ScheduleState } from "@/lib/schedule";
import type { Site } from "@/lib/types";
import { ChartCard, EmptyState, ProgressBar, StatusBadge } from "@/components/ui";
import { revealIndex } from "@/components/motion";
import { CHART_HELP } from "@/lib/guide-content";

const TIME_COLOR = "#8ea0b4";
const STATE_BADGE: Record<ScheduleState, { label: string; tone: "green" | "gold" | "neutral" }> = {
  "in-progress": { label: "Within planned period", tone: "green" },
  "past-end": { label: "Planned end passed", tone: "gold" },
  "not-started": { label: "Not started yet", tone: "neutral" },
};

function ScheduleCard({ site, today }: { site: Site; today: Date }) {
  const status = useMemo(() => getScheduleStatus(site, today), [site, today]);
  if (!status) {
    return (
      <ChartCard title="Schedule vs spend" description="Planned period from the sheet's gestation column." className="detail-analytics-card">
        <EmptyState title="No planned dates" description="This project has no readable gestation period, so time elapsed can't be compared with spending." />
      </ChartCard>
    );
  }
  const badge = STATE_BADGE[status.state];
  const months = Math.round(status.totalDays / 30.44);
  const gap = status.spendGap;
  return (
    <ChartCard
      title="Time passed vs money spent"
      description="Planned start and finish dates, compared with the share of the budget spent."
      action={<StatusBadge status={badge.label} tone={badge.tone} />}
      className="detail-analytics-card schedule-card"
      help={CHART_HELP.schedule}
    >
      <div className="schedule-timeline" aria-hidden="true">
        <div className="schedule-timeline-track">
          <i style={{ width: `${status.elapsed * 100}%`, backgroundColor: TIME_COLOR }} />
          {status.state === "in-progress" && <b style={{ left: `${status.elapsed * 100}%` }}><span>Today</span></b>}
        </div>
        <div className="schedule-timeline-dates"><span>{formatScheduleDate(status.start)}</span><span>{formatScheduleDate(status.end)}</span></div>
      </div>
      <dl className="schedule-facts">
        <div><dt>Planned duration</dt><dd>{months} month{months === 1 ? "" : "s"}</dd></div>
        <div><dt>Status</dt><dd>{describeScheduleState(status)}</dd></div>
      </dl>
      <div className="schedule-compare">
        <div style={revealIndex(3)}>
          <span>Time elapsed</span>
          <span className="gap-track"><i style={{ width: `${status.elapsed * 100}%`, backgroundColor: TIME_COLOR }} /></span>
          <strong>{formatPercent(status.elapsed, 0)}</strong>
        </div>
        <div style={revealIndex(5)}>
          <span>Financial progress</span>
          <span className="gap-track"><i style={{ width: `${Math.min(1, site.overallProgress) * 100}%`, backgroundColor: SCHEDULE_COLORS["in-progress"] }} /></span>
          <strong>{formatPercent(site.overallProgress, 1)}</strong>
        </div>
      </div>
      <p className="detail-chart-footnote">
        {status.state === "not-started"
          ? "The planned start date is still ahead."
          : gap > 0.1
            ? `Spending is ${formatPercent(gap, 0)} points behind the calendar — worth checking with the project team. Financial progress is not physical progress.`
            : "Spending is keeping pace with the planned period. Financial progress is not physical progress."}
      </p>
    </ChartCard>
  );
}

function BenchmarkCard({ site, sites }: { site: Site; sites: Site[] }) {
  const { districtProjects, metrics } = useMemo(() => getProjectBenchmarks(site, sites), [site, sites]);
  const series = [
    { key: "project" as const, label: "This project", color: SERIES_COLORS.utilized },
    { key: "district" as const, label: `${site.district} (${districtProjects} projects)`, color: SERIES_COLORS.release },
    { key: "portfolio" as const, label: `Portfolio (${sites.length} projects)`, color: NEUTRAL_COLOR },
  ];
  return (
    <ChartCard
      title="How it compares"
      description={districtProjects > 1 ? "This project against the average of its district and of all projects." : "This project against the average of all projects (it is the only project in its district)."}
      className="detail-analytics-card benchmark-card"
      help={CHART_HELP.compare}
    >
      <div className="gap-legend" aria-hidden="true">
        {series.filter((entry) => entry.key !== "district" || districtProjects > 1).map((entry) => <span key={entry.key}><i style={{ backgroundColor: entry.color }} />{entry.label}</span>)}
      </div>
      <div className="benchmark-list">
        {metrics.map((metric, metricIndex) => {
          const values = series.map((entry) => ({ ...entry, value: metric[entry.key] })).filter((entry) => entry.value !== null);
          const scale = Math.max(1, ...values.map((entry) => entry.value ?? 0));
          return (
            <div className="benchmark-metric" key={metric.id}>
              <div className="benchmark-head"><strong>{metric.label}</strong><span>{metric.description}</span></div>
              {values.map((entry, rowIndex) => (
                <div className="benchmark-row" key={entry.key} style={revealIndex(metricIndex * 3 + rowIndex)}>
                  <span className="benchmark-label">{entry.key === "project" ? "This project" : entry.key === "district" ? site.district : "Portfolio"}</span>
                  <span className="gap-track"><i style={{ width: `${((entry.value ?? 0) / scale) * 100}%`, backgroundColor: entry.color }} /></span>
                  <b>{formatPercent(entry.value ?? 0, 1)}</b>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

export function RelatedProjects({ site, sites }: { site: Site; sites: Site[] }) {
  const related = useMemo(() => getRelatedProjects(site, sites, 6), [site, sites]);
  if (!related.length) return null;
  const total = sites.filter((entry) => entry.district === site.district).length;
  const districtLink = `/?${filtersToQueryString({ ...DEFAULT_FILTERS, district: site.district })}#sites`;
  return (
    <section className="related-section" aria-labelledby="related-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">MORE IN {site.district.toUpperCase()}</p>
          <h2 id="related-title">Related projects</h2>
          <p className="section-description">Other projects in the same district, largest approved cost first.</p>
        </div>
        <Link href={districtLink} className="text-link">View all {total} in {site.district} <ArrowRight size={13} /></Link>
      </div>
      <div className="related-grid">
        {related.map((entry) => (
          <Link href={`/sites/${entry.id}`} className="related-card" key={entry.id}>
            <span className="related-name">{entry.name}</span>
            <span className="related-meta">{entry.code ? `#${entry.code} · ` : ""}{formatMillions(entry.approvedCost, 0)} approved</span>
            <div className="related-progress">
              <ProgressBar value={entry.overallProgress} compact />
              <b>{formatPercent(entry.overallProgress, 0)}</b>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Where the project is in its planned period, and how its spending compares. */
export function SiteContext({ site, sites, asOf }: { site: Site; sites: Site[]; asOf: string }) {
  const today = useMemo(() => referenceDate(asOf), [asOf]);
  return (
    <section className="site-financial-analytics" aria-labelledby="context-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CONTEXT</p>
          <h2 id="context-title">Schedule and comparison</h2>
          <p className="section-description">Where the project is in its planned period, and how its spending compares.</p>
        </div>
        <span className="analytics-source-note"><CalendarClock size={13} /> As of {formatScheduleDate(today)}</span>
      </div>
      <div className="site-analytics-grid">
        <ScheduleCard site={site} today={today} />
        <BenchmarkCard site={site} sites={sites} />
      </div>
    </section>
  );
}
