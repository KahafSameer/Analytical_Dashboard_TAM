"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CircleAlert, Layers3, MapPinned, Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatMillions,
  formatPercent,
  getCostConcentration,
  getDistrictYearMatrix,
  getPortfolioSummary,
  summarizeCategories,
  summarizeDistricts,
  summarizeProgressBands,
  type YearMeasure,
} from "@/lib/analytics";
import { ATTENTION_COLOR, AXIS_TICK, GRID_STROKE, PRIMARY_COLOR, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE, heatCellStyle } from "@/lib/chart-theme";
import { getUnspentRelease } from "@/lib/portfolio-filters";
import type { Site } from "@/lib/types";
import { ChartCard, EmptyState } from "@/components/ui";
import { Reveal, useChartEntrance } from "@/components/motion";

const palette = ["#1f7a55", "#4d8fc4", "#c9971a", "#7d5ba6", "#d0632f", "#3a9e9a", "#9c7b3c", "#6b7f8e"];
/** Rank order for concentration segments: one hue, dark (largest) → light. */
const RANK_GREENS = ["#11533a", "#236f4b", "#4a9668", "#7db894", "#acd4ba"];
/** Compact heatmap figures (colour carries the magnitude): 7.4 · 141.8 → 142 · 12,345 → 12.3k. */
function heatValue(value: number): string {
  if (value >= 10_000) return `${(value / 1_000).toLocaleString("en-PK", { maximumFractionDigits: 1 })}k`;
  if (value >= 100) return Math.round(value).toLocaleString("en-PK");
  return value.toLocaleString("en-PK", { maximumFractionDigits: 1 });
}

const yearMeasures: { id: YearMeasure; label: string }[] = [
  { id: "utilized", label: "Utilized" },
  { id: "release", label: "Released" },
  { id: "allocation", label: "Allocated" },
];
type FundingMeasure = "approved" | "allocated" | "released" | "utilized";
const fundingMeasures: { id: FundingMeasure; label: string }[] = [
  { id: "approved", label: "Approved cost" },
  { id: "allocated", label: "Allocated" },
  { id: "released", label: "Released" },
  { id: "utilized", label: "Utilized" },
];

function CompactTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number; name?: string; payload?: { projects?: number } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="analytics-tooltip">
      <strong>{label ?? payload[0].name}</strong>
      <span>{formatMillions(Number(payload[0].value ?? 0))}</span>
      {payload[0].payload?.projects !== undefined && <small>{payload[0].payload.projects} projects</small>}
    </div>
  );
}

function DistrictFundingChart({ sites, onSelectDistrict }: { sites: Site[]; onSelectDistrict?: (district: string) => void }) {
  const [measure, setMeasure] = useState<FundingMeasure>("utilized");
  const { ref, isInView, animate } = useChartEntrance();
  const rows = useMemo(() =>
    summarizeDistricts(sites).sort((a, b) => b[measure] - a[measure]).slice(0, 8),
  [measure, sites]);
  const measureLabel = fundingMeasures.find((item) => item.id === measure)?.label ?? "Funding";
  const canFilter = Boolean(onSelectDistrict) && rows.length > 1;
  return (
    <ChartCard
      title="Funding by district"
      description={`Top eight districts for the selected funding measure.${canFilter ? " Select a bar to filter the page." : ""}`}
      action={
        <label className="chart-select-wrap">
          <span className="sr-only">Funding measure</span>
          <select aria-label="Funding measure" value={measure} onChange={(event) => setMeasure(event.target.value as FundingMeasure)}>
            {fundingMeasures.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
          </select>
        </label>
      }
      className="analysis-chart-card"
    >
      {rows.length ? (
        <div ref={ref} className="analysis-bar-chart" role="img" aria-label={`${measureLabel} by district`}>
          {isInView && <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 12, bottom: 1, left: 3 }} barCategoryGap="27%">
              <CartesianGrid horizontal={false} stroke={GRID_STROKE} strokeDasharray="3 5" />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`}
              />
              <YAxis type="category" dataKey="district" width={112} interval={0} axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <Tooltip content={<CompactTooltip />} cursor={{ fill: "#f4f7f4" }} />
              <Bar
                dataKey={measure}
                name={measureLabel}
                fill={PRIMARY_COLOR}
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
                cursor={canFilter ? "pointer" : undefined}
                onClick={canFilter ? (entry) => {
                  const district = (entry as { payload?: { district?: string } }).payload?.district;
                  if (district) onSelectDistrict?.(district);
                } : undefined}
                isAnimationActive={animate}
                animationDuration={750}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>}
        </div>
      ) : <EmptyState title="No district funding data" description="There are no funding records to compare." />}
      {rows.length > 0 && (
        <ChartDataTable
          caption={`${measureLabel} by district`}
          headers={["District", measureLabel, "Projects"]}
          rows={rows.map((row) => [row.district, formatMillions(row[measure]), row.projects])}
        />
      )}
      <p className="chart-footnote">All values in PKR millions · Largest amounts shown</p>
    </ChartCard>
  );
}

function CategoryMixChart({ sites }: { sites: Site[] }) {
  const { ref, isInView, animate } = useChartEntrance();
  const categories = useMemo(() => summarizeCategories(sites), [sites]);
  const summary = useMemo(() => getPortfolioSummary(sites), [sites]);
  return (
    <ChartCard title="Approved cost by reported type" description="Only project type labels supplied by the source are included." className="analysis-chart-card">
      {categories.length && summary.totalApproved > 0 ? (
        <>
          <div className="category-donut-wrap">
            <div ref={ref} className="category-donut" role="img" aria-label="Donut chart showing approved project cost by project type">
              {isInView && <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} dataKey="approved" nameKey="category" innerRadius="68%" outerRadius="91%" paddingAngle={2} stroke="none" isAnimationActive={animate} animationDuration={800} animationEasing="ease-out">
                    {categories.map((entry, index) => <Cell key={entry.category} fill={palette[index % palette.length]} />)}
                  </Pie>
                  <Tooltip content={<CompactTooltip />} />
                </PieChart>
              </ResponsiveContainer>}
            </div>
            <div className="donut-center"><strong>{formatMillions(summary.totalApproved, 0)}</strong><span>approved total</span></div>
          </div>
          <div className="category-legend">
            {categories.map((category, index) => (
              <div className="category-legend-row" key={category.category}>
                <span className="category-legend-name"><i style={{ backgroundColor: palette[index % palette.length] }} />{category.category}</span>
                <span className="category-legend-value">{formatMillions(category.approved, 0)}</span>
              </div>
            ))}
          </div>
          <ChartDataTable
            caption="Approved cost by reported project type"
            headers={["Project type", "Projects", "Approved cost"]}
            rows={categories.map((category) => [category.category, category.projects, formatMillions(category.approved)])}
          />
        </>
      ) : <EmptyState title="No reported project types" description="The source does not provide specific project type labels, so a category comparison is withheld." />}
      <p className="chart-footnote">Projects without a specific source category are excluded.</p>
    </ChartCard>
  );
}

function ProgressDistributionChart({ sites }: { sites: Site[] }) {
  const { ref, isInView, animate } = useChartEntrance();
  const distribution = useMemo(() => summarizeProgressBands(sites), [sites]);
  return (
    <ChartCard title="Financial progress distribution" description="How many projects fall into each expenditure band (% of approved cost spent)." className="analysis-chart-card progress-distribution-card">
      {sites.length ? (
        <>
          <div ref={ref} className="distribution-chart" role="img" aria-label="Number of projects by financial progress range">
            {isInView && <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} margin={{ top: 12, right: 7, bottom: 1, left: -21 }} barCategoryGap="38%">
                <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 5" />
                {/* Short labels ("None", "1–25") keep ticks apart on phones; the description gives the unit and the tooltip the full band. */}
                <XAxis dataKey="band" interval={0} axisLine={false} tickLine={false} tick={AXIS_TICK} dy={7} tickFormatter={(band: string) => (band === "No expenditure" ? "None" : band.replace("%", ""))} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={AXIS_TICK} />
                <Tooltip
                  cursor={{ fill: "#f4f7f4" }}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [`${Number(value)} projects`, "Project count"]}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                />
                <Bar dataKey="count" name="Projects" fill={PRIMARY_COLOR} radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive={animate} animationDuration={750} animationEasing="ease-out">
                  {distribution.map((entry, index) => <Cell key={entry.band} fill={index === 0 ? ATTENTION_COLOR : PRIMARY_COLOR} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>}
          </div>
          <div className="distribution-legend"><i /><span>Projects with no expenditure recorded</span></div>
          <ChartDataTable
            caption="Projects by financial progress range"
            headers={["Financial progress", "Projects"]}
            rows={distribution.map((entry) => [entry.band, entry.count])}
          />
        </>
      ) : <EmptyState title="No progress data available" description="Import project financial progress to see its distribution." />}
    </ChartCard>
  );
}

function ChartDataTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <details className="chart-data-table">
      <summary>View data table</summary>
      <div className="chart-data-table-scroll">
        <table>
          <caption className="sr-only">{caption}</caption>
          <thead><tr>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}</tbody>
        </table>
      </div>
    </details>
  );
}

function PortfolioSignals({ sites }: { sites: Site[] }) {
  const summary = useMemo(() => getPortfolioSummary(sites), [sites]);
  const districts = useMemo(() => summarizeDistricts(sites), [sites]);
  const topDistrict = [...districts].sort((a, b) => b.utilized - a.utilized)[0];
  const unspentAllocation = Math.max(0, summary.totalAllocated - summary.totalUtilized);
  const unallocatedApproval = Math.max(0, summary.totalApproved - summary.totalAllocated);
  const signals = [
    {
      icon: <Wallet size={16} />,
      label: "Allocated, not yet spent",
      value: formatMillions(unspentAllocation, 0),
      detail: `${formatPercent(summary.totalAllocated ? unspentAllocation / summary.totalAllocated : 0)} of allocated funds`,
      tone: "gold",
    },
    {
      icon: <MapPinned size={16} />,
      label: "Highest recorded expenditure",
      value: topDistrict?.district ?? "—",
      detail: topDistrict ? `${formatMillions(topDistrict.utilized, 0)} · ${topDistrict.projects} projects` : "No expenditure reported",
      tone: "green",
    },
    {
      icon: <Layers3 size={16} />,
      label: "Approved, not yet allocated",
      value: formatMillions(unallocatedApproval, 0),
      detail: `${formatPercent(summary.totalApproved ? unallocatedApproval / summary.totalApproved : 0)} of approved cost`,
      tone: "neutral",
    },
    {
      icon: summary.awaitingSpend ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />,
      label: "Projects with no expenditure",
      value: `${summary.awaitingSpend}`,
      detail: `of ${summary.siteCount} projects`,
      tone: summary.awaitingSpend ? "gold" : "green",
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

function UnspentReleaseWatchlist({ sites, wide }: { sites: Site[]; wide: boolean }) {
  const rows = useMemo(() =>
    sites
      .map((site) => ({ site, unspent: getUnspentRelease(site) }))
      .filter((row) => row.unspent > 0)
      .sort((a, b) => b.unspent - a.unspent)
      .slice(0, 6),
  [sites]);
  const largest = rows[0]?.unspent ?? 0;
  const total = useMemo(() => sites.reduce((sum, site) => sum + getUnspentRelease(site), 0), [sites]);
  return (
    <ChartCard
      title="Released, not yet spent"
      description={`Projects holding the most released funds without recorded expenditure · ${formatMillions(total, 0)} in total.`}
      className={`analysis-chart-card watchlist-card${wide ? " watchlist-card-wide" : ""}`}
    >
      {rows.length ? (
        <ol className="watchlist">
          {rows.map(({ site, unspent }) => (
            <li key={site.id}>
              <div className="watchlist-head">
                <Link href={`/sites/${site.id}`} className="watchlist-name">{site.name}</Link>
                <strong>{formatMillions(unspent)}</strong>
              </div>
              <div className="watchlist-bar" aria-hidden="true"><i style={{ width: `${largest ? (unspent / largest) * 100 : 0}%` }} /></div>
              <span className="watchlist-meta">{site.district} · {formatPercent(site.released ? unspent / site.released : 0, 0)} of {formatMillions(site.released)} released is unspent</span>
            </li>
          ))}
        </ol>
      ) : <EmptyState title="No unspent releases" description="Every released rupee in this selection has recorded expenditure." />}
      <p className="chart-footnote">Unspent release = released − utilized, per project · PKR millions</p>
    </ChartCard>
  );
}

function CostConcentrationCard({ sites }: { sites: Site[] }) {
  const concentration = useMemo(() => getCostConcentration(sites, 5), [sites]);
  const segments = [
    ...concentration.top.map((entry, index) => ({ key: entry.site.id, label: entry.site.name, share: entry.share, color: RANK_GREENS[index] })),
    ...(concentration.restCount ? [{ key: "rest", label: `Other ${concentration.restCount} projects`, share: concentration.restShare, color: "#dfe6e1" }] : []),
  ];
  return (
    <ChartCard
      title="Where the approved cost sits"
      description={concentration.total > 0
        ? `The ${concentration.top.length} largest projects hold ${formatPercent(concentration.topShare, 0)} of ${formatMillions(concentration.total, 0)} approved.`
        : "No approved cost recorded."}
      className="analysis-chart-card concentration-card"
    >
      {concentration.total > 0 ? (
        <>
          <div className="concentration-bar" role="img" aria-label={`Largest ${concentration.top.length} projects hold ${formatPercent(concentration.topShare, 0)} of approved cost`}>
            {segments.map((segment) => (
              <i key={segment.key} style={{ width: `${segment.share * 100}%`, backgroundColor: segment.color }} title={`${segment.label}: ${formatPercent(segment.share)}`} />
            ))}
          </div>
          <ol className="concentration-list">
            {concentration.top.map((entry, index) => (
              <li key={entry.site.id}>
                <i style={{ backgroundColor: RANK_GREENS[index] }} aria-hidden="true" />
                <Link href={`/sites/${entry.site.id}`} className="concentration-name">{entry.site.name}</Link>
                <span className="concentration-value">{formatMillions(entry.approved, 0)}</span>
                <span className="concentration-share">{formatPercent(entry.share, 0)}</span>
              </li>
            ))}
            {concentration.restCount > 0 && (
              <li className="concentration-rest">
                <i style={{ backgroundColor: "#dfe6e1" }} aria-hidden="true" />
                <span className="concentration-name">Other {concentration.restCount} projects</span>
                <span className="concentration-value">{formatMillions(concentration.restApproved, 0)}</span>
                <span className="concentration-share">{formatPercent(concentration.restShare, 0)}</span>
              </li>
            )}
          </ol>
        </>
      ) : <EmptyState title="No approved cost" description="Approved costs are needed to show concentration." />}
      <p className="chart-footnote">Share of total approved cost · PKR millions</p>
    </ChartCard>
  );
}

function DistrictYearHeatmap({ sites, onSelectDistrict }: { sites: Site[]; onSelectDistrict?: (district: string) => void }) {
  const [measure, setMeasure] = useState<YearMeasure>("utilized");
  const matrix = useMemo(() => getDistrictYearMatrix(sites, measure), [sites, measure]);
  const measureLabel = yearMeasures.find((item) => item.id === measure)?.label ?? "Funding";
  const canFilter = Boolean(onSelectDistrict) && matrix.rows.length > 1;
  return (
    <ChartCard
      title="District funding over time"
      description={`${measureLabel} by district and fiscal year; darker cells mean more money.${canFilter ? " Select a district to filter the page." : ""}`}
      action={
        <label className="chart-select-wrap">
          <span className="sr-only">Heatmap measure</span>
          <select aria-label="Heatmap measure" value={measure} onChange={(event) => setMeasure(event.target.value as YearMeasure)}>
            {yearMeasures.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
          </select>
        </label>
      }
      className="analysis-chart-card heatmap-card"
    >
      {matrix.rows.length && matrix.years.length ? (
        <div className="heatmap-scroll" tabIndex={0} role="region" aria-label={`${measureLabel} by district and fiscal year`}>
          <table className="heatmap">
            <caption className="sr-only">{measureLabel} by district and fiscal year, PKR millions</caption>
            <thead>
              <tr>
                <th scope="col">District</th>
                {matrix.years.map((year) => (
                  <th scope="col" key={year}>
                    <span className="year-long">{year}</span>
                    <span className="year-short" aria-hidden="true">{year.replace(/^20(\d{2})/, "$1")}</span>
                  </th>
                ))}
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row.district}>
                  <th scope="row">
                    {canFilter
                      ? <button type="button" onClick={() => onSelectDistrict?.(row.district)} title={`Filter the page to ${row.district}`}>{row.district}</button>
                      : row.district}
                    <small>{row.projects} project{row.projects === 1 ? "" : "s"}</small>
                  </th>
                  {row.values.map((value, index) => (
                    <td key={matrix.years[index]} style={heatCellStyle(value, matrix.max)}>{value > 0 ? heatValue(value) : "—"}</td>
                  ))}
                  <td className="heatmap-total">{heatValue(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="No fiscal-year funding" description="The sheet has no year-wise amounts for these projects." />}
      <div className="heatmap-scale" aria-hidden="true">
        <span>Less</span>
        {[0.02, 0.1, 0.25, 0.45, 0.7, 1].map((share) => <i key={share} style={{ background: heatCellStyle(share, 1).background }} />)}
        <span>More</span>
        <small>PKR millions · square-root scale so smaller districts stay visible</small>
      </div>
    </ChartCard>
  );
}

export function PortfolioAnalytics({ sites, onSelectDistrict }: { sites: Site[]; onSelectDistrict?: (district: string) => void }) {
  const hasCategories = useMemo(() => summarizeCategories(sites).length > 0, [sites]);
  return (
    <section className="analytics-section" aria-labelledby="analytics-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PORTFOLIO ANALYTICS</p>
          <h2 id="analytics-title">A closer look at delivery</h2>
          <p className="section-description">Explore funding concentration, district patterns over time and recorded financial progress.</p>
        </div>
        <span className="analytics-source-note"><CircleAlert size={13} /> Financial data only</span>
      </div>
      <PortfolioSignals sites={sites} />
      <div className="analytics-chart-grid">
        <DistrictFundingChart sites={sites} onSelectDistrict={onSelectDistrict} />
        {hasCategories ? <CategoryMixChart sites={sites} /> : <CostConcentrationCard sites={sites} />}
        <DistrictYearHeatmap sites={sites} onSelectDistrict={onSelectDistrict} />
        <UnspentReleaseWatchlist sites={sites} wide={false} />
        <ProgressDistributionChart sites={sites} />
        {hasCategories && <CostConcentrationCard sites={sites} />}
      </div>
      {!hasCategories && <p className="chart-footnote">The source sheet has no project-type labels, so a type comparison is not shown.</p>}
    </section>
  );
}
