"use client";

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
  getPortfolioSummary,
  summarizeCategories,
  summarizeDistricts,
  summarizeProgressBands,
} from "@/lib/analytics";
import type { Site } from "@/lib/types";
import { ChartCard, EmptyState } from "@/components/ui";
import { Reveal, useChartEntrance } from "@/components/motion";

const palette = ["#0f4c3a", "#508065", "#8cac91", "#d4a017", "#789081", "#c5a341", "#b8c8bc", "#57725f"];
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

function DistrictFundingChart({ sites }: { sites: Site[] }) {
  const [measure, setMeasure] = useState<FundingMeasure>("utilized");
  const { ref, isInView, animate } = useChartEntrance();
  const rows = useMemo(() =>
    summarizeDistricts(sites).sort((a, b) => b[measure] - a[measure]).slice(0, 8),
  [measure, sites]);
  return (
    <ChartCard
      title="Funding by reporting area"
      description="Top eight districts for the selected funding measure."
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
        <div ref={ref} className="analysis-bar-chart" role="img" aria-label={`${fundingMeasures.find((item) => item.id === measure)?.label} by district`}>
          {isInView && <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 12, bottom: 1, left: 3 }} barCategoryGap="27%">
              <CartesianGrid horizontal={false} stroke="#edf0ed" strokeDasharray="3 5" />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: "#829087" }}
                tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`}
              />
              <YAxis type="category" dataKey="district" width={104} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#65736a" }} />
              <Tooltip content={<CompactTooltip />} cursor={{ fill: "#f4f7f4" }} />
              <Bar dataKey={measure} name={fundingMeasures.find((item) => item.id === measure)?.label} fill="#0f4c3a" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={animate} animationDuration={750} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>}
        </div>
      ) : <EmptyState title="No district funding data" description="There are no funding records to compare." />}
      <p className="chart-footnote">All values in PKR millions · Largest amounts shown</p>
    </ChartCard>
  );
}

function CategoryMixChart({ sites }: { sites: Site[] }) {
  const { ref, isInView, animate } = useChartEntrance();
  const categories = useMemo(() => summarizeCategories(sites), [sites]);
  const summary = useMemo(() => getPortfolioSummary(sites), [sites]);
  return (
    <ChartCard title="Portfolio by project type" description="Approved project cost grouped by project title." className="analysis-chart-card">
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
        </>
      ) : <EmptyState title="No category data available" description="Project costs aren’t available for category analysis." />}
      <p className="chart-footnote">Categories are classified from project titles.</p>
    </ChartCard>
  );
}

function ProgressDistributionChart({ sites }: { sites: Site[] }) {
  const { ref, isInView, animate } = useChartEntrance();
  const distribution = useMemo(() => summarizeProgressBands(sites), [sites]);
  return (
    <ChartCard title="Financial progress distribution" description="How many projects fall into each expenditure band." className="analysis-chart-card progress-distribution-card">
      {sites.length ? (
        <>
          <div ref={ref} className="distribution-chart" role="img" aria-label="Number of projects by financial progress range">
            {isInView && <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} margin={{ top: 12, right: 7, bottom: 1, left: -21 }} barCategoryGap="38%">
                <CartesianGrid vertical={false} stroke="#edf0ed" strokeDasharray="3 5" />
                <XAxis dataKey="band" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#718078" }} dy={7} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#87918a" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 9, border: "1px solid #e6ebe7", boxShadow: "0 8px 26px rgba(24,44,33,.08)", fontSize: 11 }}
                  formatter={(value) => [`${Number(value)} projects`, "Project count"]}
                  labelStyle={{ color: "#1f2937", fontWeight: 600, marginBottom: 4 }}
                />
                <Bar dataKey="count" name="Projects" fill="#508065" radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive={animate} animationDuration={750} animationEasing="ease-out">
                  {distribution.map((entry, index) => <Cell key={entry.band} fill={index === 0 ? "#d4a017" : "#508065"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>}
          </div>
          <div className="distribution-legend"><i /><span>Projects with no expenditure recorded</span></div>
        </>
      ) : <EmptyState title="No progress data available" description="Import project financial progress to see its distribution." />}
    </ChartCard>
  );
}

function PortfolioSignals({ sites }: { sites: Site[] }) {
  const summary = useMemo(() => getPortfolioSummary(sites), [sites]);
  const districts = useMemo(() => summarizeDistricts(sites), [sites]);
  const categories = useMemo(() => summarizeCategories(sites), [sites]);
  const topDistrict = [...districts].sort((a, b) => b.utilized - a.utilized)[0];
  const largestCategory = categories[0];
  const unspentAllocation = Math.max(0, summary.totalAllocated - summary.totalUtilized);
  const concentrationShare = summary.totalApproved ? (largestCategory?.approved ?? 0) / summary.totalApproved : 0;
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
      label: "Largest investment category",
      value: largestCategory?.category ?? "—",
      detail: largestCategory ? `${formatPercent(concentrationShare)} of approved cost` : "No category data",
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

export function PortfolioAnalytics({ sites }: { sites: Site[] }) {
  return (
    <section className="analytics-section" aria-labelledby="analytics-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PORTFOLIO ANALYTICS</p>
          <h2 id="analytics-title">A closer look at delivery</h2>
          <p className="section-description">Explore funding concentration, portfolio mix and recorded financial progress.</p>
        </div>
        <span className="analytics-source-note"><CircleAlert size={13} /> Financial data only</span>
      </div>
      <PortfolioSignals sites={sites} />
      <div className="analytics-chart-grid">
        <DistrictFundingChart sites={sites} />
        <CategoryMixChart sites={sites} />
        <ProgressDistributionChart sites={sites} />
      </div>
    </section>
  );
}
