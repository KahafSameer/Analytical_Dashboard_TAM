"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarClock, CircleAlert, Wallet } from "lucide-react";
import { formatMillions, formatPercent } from "@/lib/analytics";
import { NEUTRAL_COLOR, SCHEDULE_COLORS, SERIES_COLORS } from "@/lib/chart-theme";
import { getUnspentRelease } from "@/lib/portfolio-filters";
import { describeScheduleState, formatScheduleDate, getScheduleStatus, referenceDate } from "@/lib/schedule";
import { projectSharePayload } from "@/lib/share";
import type { Site } from "@/lib/types";
import { StatusBadge } from "@/components/ui";
import { ShareMenu } from "@/components/share-menu";
import { shortYearLabel } from "@/components/funding-sparkbars";
import { revealIndex } from "@/components/motion";

const TIME_COLOR = "#8ea0b4";
const ratio = (numerator: number, denominator: number) => (denominator > 0 ? numerator / denominator : null);

function MoneyFlow({ site }: { site: Site }) {
  const stages = [
    { label: "Approved cost", value: site.approvedCost, color: NEUTRAL_COLOR, note: "Total budget for the project" },
    { label: "Allocated", value: site.allocated, color: SERIES_COLORS.allocation, share: ratio(site.allocated, site.approvedCost), of: "of the approved budget set aside" },
    { label: "Released", value: site.released, color: SERIES_COLORS.release, share: ratio(site.released, site.allocated), of: "of the set-aside money handed over" },
    { label: "Spent", value: site.utilized, color: SERIES_COLORS.utilized, share: ratio(site.utilized, site.released), of: "of the money handed over" },
  ];
  const unspent = getUnspentRelease(site);
  return (
    <section className="progress-block" aria-label="Money flow">
      <h4><Wallet size={14} /> Money flow</h4>
      <ul className="flow-list">
        {stages.map((stage, index) => (
          <li key={stage.label} style={revealIndex(index)}>
            <div className="flow-row">
              <span className="flow-label"><i style={{ backgroundColor: stage.color }} />{stage.label}</span>
              <strong>{formatMillions(stage.value)}</strong>
            </div>
            <span className="flow-track" aria-hidden="true">
              <i style={{ width: `${site.approvedCost > 0 ? Math.max(stage.value > 0 ? 1.5 : 0, Math.min(1, stage.value / site.approvedCost) * 100) : 0}%`, backgroundColor: stage.color }} />
            </span>
            <span className="flow-note">{stage.share === undefined ? stage.note : stage.share === null ? "—" : `${formatPercent(stage.share)} ${stage.of}`}</span>
          </li>
        ))}
      </ul>
      {unspent >= 0.05 && (
        <p className="flow-callout"><CircleAlert size={13} /> {formatMillions(unspent)} handed over but not spent yet</p>
      )}
    </section>
  );
}

function YearBars({ site }: { site: Site }) {
  const max = Math.max(0, ...site.fiscalYears.flatMap((year) => [year.allocation, year.release, year.utilized]));
  const series = [
    { key: "allocation" as const, label: "Allocated", color: SERIES_COLORS.allocation },
    { key: "release" as const, label: "Released", color: SERIES_COLORS.release },
    { key: "utilized" as const, label: "Spent", color: SERIES_COLORS.utilized },
  ];
  return (
    <section className="progress-block" aria-label="Funding by fiscal year">
      <h4><CalendarClock size={14} /> By budget year <span className="progress-block-unit">Rs millions</span></h4>
      {max > 0 ? (
        <div className="year-bars">
          {site.fiscalYears.map((year, yearIndex) => (
            <div className="year-group" key={year.label}>
              <span className="year-label">{shortYearLabel(year.label)}</span>
              <div className="year-series">
                {series.map((entry, seriesIndex) => (
                  <div className="year-bar-row" key={entry.key} style={revealIndex(yearIndex * 2 + seriesIndex)}>
                    <span className="sr-only">{entry.label}</span>
                    <span className="flow-track" aria-hidden="true"><i style={{ width: `${(year[entry.key] / max) * 100}%`, backgroundColor: entry.color }} /></span>
                    <b>{year[entry.key] > 0 ? year[entry.key].toLocaleString("en-US", { maximumFractionDigits: 1 }) : "—"}</b>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <span className="spark-legend year-legend" aria-hidden="true">
            {series.map((entry) => <span key={entry.key}><i style={{ backgroundColor: entry.color }} />{entry.label}</span>)}
          </span>
        </div>
      ) : <p className="progress-empty">No year-wise allocation, release or spending is recorded for this project.</p>}
    </section>
  );
}

function ScheduleBlock({ site, asOf }: { site: Site; asOf: string }) {
  const status = getScheduleStatus(site, referenceDate(asOf));
  const badge = status?.state === "past-end"
    ? { label: "Planned end passed", tone: "gold" as const }
    : status?.state === "not-started"
      ? { label: "Not started yet", tone: "neutral" as const }
      : { label: "Within planned period", tone: "green" as const };
  return (
    <section className="progress-block" aria-label="Schedule">
      <h4><CalendarClock size={14} /> Schedule {status && <StatusBadge status={badge.label} tone={badge.tone} />}</h4>
      {status ? (
        <>
          <div className="schedule-mini-dates"><span>{formatScheduleDate(status.start)}</span><span>{formatScheduleDate(status.end)}</span></div>
          <div className="schedule-compare schedule-compare-compact">
            <div style={revealIndex(1)}>
              <span>Time elapsed</span>
              <span className="gap-track"><i style={{ width: `${status.elapsed * 100}%`, backgroundColor: TIME_COLOR }} /></span>
              <strong>{formatPercent(status.elapsed, 0)}</strong>
            </div>
            <div style={revealIndex(2)}>
              <span>Money spent</span>
              <span className="gap-track"><i style={{ width: `${Math.min(1, site.overallProgress) * 100}%`, backgroundColor: SCHEDULE_COLORS["in-progress"] }} /></span>
              <strong>{formatPercent(site.overallProgress, 1)}</strong>
            </div>
            {site.currentYearProgress !== undefined && (
              <div style={revealIndex(3)}>
                <span>This year</span>
                <span className="gap-track"><i style={{ width: `${Math.min(1, site.currentYearProgress) * 100}%`, backgroundColor: SERIES_COLORS.release }} /></span>
                <strong>{formatPercent(site.currentYearProgress, 0)}</strong>
              </div>
            )}
          </div>
          <p className="progress-note">
            {describeScheduleState(status)}
            {status.state !== "not-started" && status.spendGap > 0.1 ? ` · spending ${formatPercent(status.spendGap, 0)} points behind the calendar` : ""}
          </p>
        </>
      ) : <p className="progress-empty">The sheet has no readable gestation period for this project.</p>}
    </section>
  );
}

/** Expanded detail for one register row: money flow, fiscal years and schedule, with links onward. */
export function ProjectProgressPanel({ site, asOf, id }: { site: Site; asOf: string; id: string }) {
  return (
    <div className="progress-panel" id={id}>
      <MoneyFlow site={site} />
      <YearBars site={site} />
      <ScheduleBlock site={site} asOf={asOf} />
      <div className="progress-panel-actions">
        <span className="progress-panel-note">Progress here means money spent ÷ approved budget — not how much building work is finished.</span>
        <ShareMenu label="Share" getPayload={(pageUrl) => projectSharePayload(site, new URL(`/sites/${site.id}`, pageUrl).toString())} />
        <Link href={`/sites/${site.id}`} className="button button-primary">Open full project <ArrowUpRight size={15} /></Link>
      </div>
    </div>
  );
}
