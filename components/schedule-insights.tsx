"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { CalendarClock, CalendarX2, Hourglass, PlayCircle, Scale } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { formatMillions, formatPercent } from "@/lib/analytics";
import {
  AXIS_TICK,
  GRID_STROKE,
  NEUTRAL_COLOR,
  SCHEDULE_COLORS,
} from "@/lib/chart-theme";
import {
  ENDING_SOON_DAYS,
  describeScheduleState,
  formatScheduleDate,
  getCompletionTimeline,
  getScheduleStatus,
  getSpendLaggards,
  referenceDate,
  summarizeSchedule,
  type ScheduleState,
} from "@/lib/schedule";
import type { Site } from "@/lib/types";
import { ChartCard, EmptyState } from "@/components/ui";
import { Reveal, revealIndex, useChartEntrance } from "@/components/motion";

const STATE_LABELS: Record<ScheduleState | "unscheduled", string> = {
  "in-progress": "Within planned period",
  "past-end": "Planned end passed",
  "not-started": "Not started yet",
  unscheduled: "No dates in sheet",
};
const STATE_COLORS: Record<ScheduleState | "unscheduled", string> = { ...SCHEDULE_COLORS, unscheduled: NEUTRAL_COLOR };
const TIME_COLOR = "#8ea0b4";

function ScheduleSignals({ summary, today }: { summary: ReturnType<typeof summarizeSchedule>; today: Date }) {
  const soonDate = formatScheduleDate(new Date(today.getTime() + ENDING_SOON_DAYS * 86_400_000));
  const signals = [
    {
      icon: <CalendarX2 size={16} />,
      label: "Past planned end date",
      value: `${summary.pastEnd}`,
      detail: summary.pastEnd ? `${summary.pastEndLowSpend} with under 50% of approved cost spent` : "No project is past its planned end",
      tone: summary.pastEnd ? "gold" : "green",
    },
    {
      icon: <Hourglass size={16} />,
      label: "Planned to end within 6 months",
      value: `${summary.endingSoon}`,
      detail: `Planned end on or before ${soonDate}`,
      tone: "neutral",
    },
    {
      icon: <PlayCircle size={16} />,
      label: "Not started yet",
      value: `${summary.notStarted}`,
      detail: "Planned start date is still ahead",
      tone: "neutral",
    },
    {
      icon: <Scale size={16} />,
      label: "Typical started project",
      value: `${formatPercent(summary.medianElapsed, 0)} time · ${formatPercent(summary.medianProgress, 0)} spent`,
      detail: "Median time elapsed vs median financial progress",
      tone: summary.medianElapsed - summary.medianProgress > 0.25 ? "gold" : "green",
    },
  ];
  return (
    <div className="portfolio-signals">
      {signals.map((signal, index) => (
        <Reveal className="signal-reveal" delay={index * 0.045} key={signal.label}>
          <article className="signal-card">
            <span className={`signal-icon signal-icon-${signal.tone}`}>{signal.icon}</span>
            <span className="signal-label">{signal.label}</span>
            <strong className="signal-value">{signal.value}</strong>
            <span className="signal-detail">{signal.detail}</span>
          </article>
        </Reveal>
      ))}
    </div>
  );
}

function SpendGapList({ summary }: { summary: ReturnType<typeof summarizeSchedule> }) {
  const laggards = useMemo(() => getSpendLaggards(summary, 7), [summary]);
  return (
    <ChartCard
      title="Spending behind the calendar"
      description="Started projects where the share of time elapsed most exceeds the share of approved cost spent."
      className="analysis-chart-card gap-card"
    >
      <div className="gap-legend" aria-hidden="true">
        <span><i style={{ backgroundColor: TIME_COLOR }} />Time elapsed</span>
        <span><i style={{ backgroundColor: SCHEDULE_COLORS["in-progress"] }} />Financial progress</span>
      </div>
      {laggards.length ? (
        <ol className="gap-list">
          {laggards.map(({ site, status }, index) => (
            <li key={site.id} style={revealIndex(index * 2)}>
              <div className="gap-head">
                <Link href={`/sites/${site.id}`} className="gap-name">{site.name}</Link>
                <span className="gap-badge">{formatPercent(status.spendGap, 0)} gap</span>
              </div>
              <div className="gap-bars">
                <span className="gap-bar-label">Time</span>
                <span className="gap-track"><i style={{ width: `${status.elapsed * 100}%`, backgroundColor: TIME_COLOR }} /></span>
                <b>{formatPercent(status.elapsed, 0)}</b>
                <span className="gap-bar-label">Spent</span>
                <span className="gap-track"><i style={{ width: `${Math.min(1, site.overallProgress) * 100}%`, backgroundColor: SCHEDULE_COLORS["in-progress"] }} /></span>
                <b>{formatPercent(site.overallProgress, 0)}</b>
              </div>
              <span className="gap-meta">{site.district} · {describeScheduleState(status)} · {formatMillions(site.approvedCost, 0)} approved</span>
            </li>
          ))}
        </ol>
      ) : <EmptyState title="Spending keeps pace" description="No started project has spending more than 10 points behind its elapsed time." />}
      <p className="chart-footnote">A gap is a prompt to check, not proof of delay: the sheet has spending, not physical progress.</p>
    </ChartCard>
  );
}

type TimelineTooltipProps = {
  active?: boolean;
  payload?: { payload?: ReturnType<typeof getCompletionTimeline>[number] }[];
};

function TimelineTooltip({ active, payload }: TimelineTooltipProps) {
  const bucket = payload?.[0]?.payload;
  if (!active || !bucket) return null;
  return (
    <div className="analytics-tooltip">
      <strong>{bucket.range}{bucket.containsToday ? " (now)" : ""}</strong>
      <span>{bucket.passed + bucket.upcoming} project{bucket.passed + bucket.upcoming === 1 ? "" : "s"}</span>
      {bucket.passed > 0 && <small>{bucket.passed} planned end passed</small>}
      {bucket.upcoming > 0 && <small>{bucket.upcoming} upcoming</small>}
      <small>{formatMillions(bucket.approved, 0)} approved</small>
    </div>
  );
}

function CompletionTimeline({ summary, today }: { summary: ReturnType<typeof summarizeSchedule>; today: Date }) {
  const { ref, isInView, animate } = useChartEntrance();
  const buckets = useMemo(() => getCompletionTimeline(summary, today), [summary, today]);
  return (
    <ChartCard title="Planned completions" description="Projects by planned end date, split by whether that date has passed." className="analysis-chart-card">
      {buckets.length ? (
        <>
          <div className="gap-legend" aria-hidden="true">
            <span><i style={{ backgroundColor: SCHEDULE_COLORS["past-end"] }} />Planned end passed</span>
            <span><i style={{ backgroundColor: SCHEDULE_COLORS["in-progress"] }} />Upcoming</span>
          </div>
          <div ref={ref} className="distribution-chart" role="img" aria-label="Stacked bar chart of planned project completions by half-year">
            {isInView && <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 10, right: 6, bottom: 1, left: -22 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                  tick={({ x, y, payload, index }) => {
                    const current = buckets[index]?.containsToday;
                    return (
                      <text x={x} y={Number(y) + 12} textAnchor="middle" fontSize={11} fill={current ? "#1f3a2c" : "#59665d"} fontWeight={current ? 700 : 400}>
                        {payload.value}{current ? " •" : ""}
                      </text>
                    );
                  }}
                />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={AXIS_TICK} />
                <Tooltip content={<TimelineTooltip />} cursor={{ fill: "#f4f7f4" }} />
                <Bar dataKey="passed" stackId="end" name="Planned end passed" fill={SCHEDULE_COLORS["past-end"]} maxBarSize={30} isAnimationActive={animate} animationDuration={700} />
                <Bar dataKey="upcoming" stackId="end" name="Upcoming" fill={SCHEDULE_COLORS["in-progress"]} radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={animate} animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>}
          </div>
          <details className="chart-data-table">
            <summary>View data table</summary>
            <div className="chart-data-table-scroll">
              <table>
                <caption className="sr-only">Planned completions by half-year</caption>
                <thead><tr><th scope="col">Planned end</th><th scope="col">Passed</th><th scope="col">Upcoming</th><th scope="col">Approved</th></tr></thead>
                <tbody>{buckets.map((bucket) => (
                  <tr key={bucket.key}><th scope="row">{bucket.range}{bucket.containsToday ? " (now)" : ""}</th><td>{bucket.passed}</td><td>{bucket.upcoming}</td><td>{formatMillions(bucket.approved, 0)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </details>
        </>
      ) : <EmptyState title="No planned end dates" description="Add gestation periods to the sheet to see planned completions." />}
      <p className="chart-footnote">• marks the current period · bar segments count projects</p>
    </ChartCard>
  );
}

type ScatterPoint = { id: string; name: string; district: string; approved: number; progress: number; state: ScheduleState | "unscheduled" };

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: { payload?: ScatterPoint }[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="analytics-tooltip scatter-tooltip">
      <strong>{point.name}</strong>
      <span>{formatPercent(point.progress / 100)} financial progress</span>
      <small>{point.district} · {formatMillions(point.approved)} approved</small>
      <small>{STATE_LABELS[point.state]}</small>
    </div>
  );
}

function SizeProgressScatter({ sites, today }: { sites: Site[]; today: Date }) {
  const router = useRouter();
  const { ref, isInView, animate } = useChartEntrance();
  const points = useMemo<ScatterPoint[]>(() => sites
    .filter((site) => site.approvedCost > 0)
    .map((site) => ({
      id: site.id,
      name: site.name,
      district: site.district,
      approved: site.approvedCost,
      progress: Math.min(100, site.overallProgress * 100),
      state: getScheduleStatus(site, today)?.state ?? "unscheduled",
    })), [sites, today]);
  const groups = (["in-progress", "past-end", "not-started", "unscheduled"] as const)
    .map((state) => ({ state, points: points.filter((point) => point.state === state) }))
    .filter((group) => group.points.length);
  const costs = points.map((point) => point.approved);
  const domain: [number, number] = costs.length ? [Math.min(...costs) * 0.8, Math.max(...costs) * 1.25] : [1, 10];
  const ticks = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000].filter((tick) => tick >= domain[0] && tick <= domain[1]);
  const sortedProgress = points.map((point) => point.progress).sort((a, b) => a - b);
  const medianProgress = sortedProgress.length ? sortedProgress[Math.floor(sortedProgress.length / 2)] : 0;

  return (
    <ChartCard
      title="Project size vs financial progress"
      description="Each dot is a project: approved cost (log scale) against share spent, colored by schedule status. Select a dot to open the project."
      className="analysis-chart-card scatter-card"
    >
      {points.length ? (
        <>
          <div className="gap-legend" aria-hidden="true">
            {groups.map((group) => <span key={group.state}><i style={{ backgroundColor: STATE_COLORS[group.state] }} />{STATE_LABELS[group.state]} ({group.points.length})</span>)}
          </div>
          <div ref={ref} className="scatter-chart" role="img" aria-label="Scatter plot of approved cost against financial progress for each project">
            {isInView && <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 14, bottom: 6, left: -6 }}>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 5" />
                <XAxis
                  type="number"
                  dataKey="approved"
                  name="Approved cost"
                  scale="log"
                  domain={domain}
                  ticks={ticks}
                  axisLine={false}
                  tickLine={false}
                  tick={AXIS_TICK}
                  tickFormatter={(value: number) => value >= 1_000 ? `Rs ${(value / 1_000).toLocaleString("en-US")}bn` : `Rs ${value}m`}
                />
                <YAxis type="number" dataKey="progress" name="Financial progress" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={(value: number) => `${value}%`} />
                <ZAxis range={[70, 70]} />
                <ReferenceLine y={medianProgress} stroke="#9aa6a0" strokeDasharray="4 4" label={{ value: `median ${formatPercent(medianProgress / 100, 0)}`, position: "insideTopRight", fontSize: 10, fill: "#6b776f" }} />
                <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "#c9d3cc" }} />
                {groups.map((group) => (
                  <Scatter
                    key={group.state}
                    name={STATE_LABELS[group.state]}
                    data={group.points}
                    fill={STATE_COLORS[group.state]}
                    fillOpacity={0.85}
                    stroke="#fff"
                    strokeWidth={1.5}
                    cursor="pointer"
                    isAnimationActive={animate}
                    animationDuration={700}
                    onClick={(entry) => {
                      const id = (entry as { payload?: ScatterPoint }).payload?.id;
                      if (id) router.push(`/sites/${id}`);
                    }}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>}
          </div>
          <details className="chart-data-table">
            <summary>View data table</summary>
            <div className="chart-data-table-scroll">
              <table>
                <caption className="sr-only">Approved cost and financial progress for each project</caption>
                <thead><tr><th scope="col">Project</th><th scope="col">District</th><th scope="col">Approved</th><th scope="col">Progress</th><th scope="col">Schedule</th></tr></thead>
                <tbody>{[...points].sort((a, b) => b.approved - a.approved).map((point) => (
                  <tr key={point.id}>
                    <th scope="row"><Link href={`/sites/${point.id}`}>{point.name}</Link></th>
                    <td>{point.district}</td><td>{formatMillions(point.approved)}</td><td>{formatPercent(point.progress / 100)}</td><td>{STATE_LABELS[point.state]}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </details>
        </>
      ) : <EmptyState title="No approved costs" description="Projects need an approved cost to be plotted." />}
      <p className="chart-footnote">Large, low-progress projects (bottom right) hold the most approved cost not yet spent.</p>
    </ChartCard>
  );
}

/** Schedule & delivery: gestation periods compared with financial progress. */
export function ScheduleInsights({ sites, asOf }: { sites: Site[]; asOf: string }) {
  const today = useMemo(() => referenceDate(asOf), [asOf]);
  const summary = useMemo(() => summarizeSchedule(sites, today), [sites, today]);
  return (
    <section className="analytics-section" aria-labelledby="schedule-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SCHEDULE & DELIVERY</p>
          <h2 id="schedule-title">Time elapsed vs money spent</h2>
          <p className="section-description">Gestation periods from the sheet, compared with financial progress as of {formatScheduleDate(today)}.</p>
        </div>
        <span className="analytics-source-note"><CalendarClock size={13} /> {summary.withSchedule} of {sites.length} projects have dates</span>
      </div>
      {summary.withSchedule ? (
        <>
          <ScheduleSignals summary={summary} today={today} />
          <div className="analytics-chart-grid">
            <SpendGapList summary={summary} />
            <CompletionTimeline summary={summary} today={today} />
            <SizeProgressScatter sites={sites} today={today} />
          </div>
        </>
      ) : (
        <EmptyState title="No gestation periods in the sheet" description="Add start and end dates (e.g. “01 Jul 2024 - 30 Jun 2027”) to compare time elapsed with spending." />
      )}
    </section>
  );
}
