"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMillions, formatPercent } from "@/lib/analytics";
import { AXIS_TICK, GRID_STROKE, SERIES_COLORS, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE, formatAxisMillions } from "@/lib/chart-theme";
import { getAllocationComposition, getCumulativeFunding, getFiscalYearRates } from "@/lib/site-analytics";
import type { Site } from "@/lib/types";
import { ChartCard, EmptyState } from "@/components/ui";
import { useChartEntrance } from "@/components/motion";

function FundingCompositionChart({ site }: { site: Site }) {
  const segments = useMemo(() => getAllocationComposition(site), [site]);
  const displayTotal = Math.max(site.allocated, site.utilized);
  const { ref, isInView, animate } = useChartEntrance();

  return (
    <ChartCard
      title="Allocation utilization"
      description="Reported expenditure compared with allocated funds."
      className="detail-analytics-card"
    >
      {displayTotal > 0 ? (
        <>
          <div className="detail-donut-wrap">
            <div ref={ref} className="detail-donut" role="img" aria-label="Donut chart showing allocated funds utilized and remaining">
              {isInView && <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={segments} dataKey="value" nameKey="name" innerRadius="69%" outerRadius="92%" paddingAngle={2} stroke="none" isAnimationActive={animate} animationDuration={800} animationEasing="ease-out">
                    {segments.map((segment) => <Cell key={segment.name} fill={segment.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [formatMillions(Number(value)), name]} />
                </PieChart>
              </ResponsiveContainer>}
            </div>
            <div className="detail-donut-center">
              <strong>{formatPercent(site.allocated ? site.utilized / site.allocated : 0)}</strong>
              <span>of allocation</span>
            </div>
          </div>
          <div className="detail-donut-legend">
            {segments.map((segment) => (
              <div key={segment.name}>
                <span><i style={{ backgroundColor: segment.color }} />{segment.name}</span>
                <strong>{formatMillions(segment.value)}</strong>
              </div>
            ))}
          </div>
          <p className="detail-chart-footnote">
            {site.utilized > site.allocated
              ? "Expenditure above allocation is highlighted separately."
              : "Based on reported allocation and total expenditure."}
          </p>
        </>
      ) : (
        <EmptyState title="No allocation recorded" description="Allocation utilization will appear when funding is reported." />
      )}
    </ChartCard>
  );
}

function CumulativeFundingChart({ site }: { site: Site }) {
  const data = useMemo(() => getCumulativeFunding(site), [site]);
  const hasData = data.some((year) => year.allocation || year.released || year.utilized);
  const { ref, isInView, animate } = useChartEntrance();

  return (
    <ChartCard
      title="Cumulative funding movement"
      description="Running total of allocation, release and expenditure by fiscal year."
      className="detail-analytics-card"
    >
      {hasData ? (
        <>
          <div ref={ref} className="cumulative-chart" role="img" aria-label="Cumulative allocation, release and expenditure by fiscal year">
            {isInView && <ResponsiveContainer width="100%" height="100%">
              {/* Straight segments with markers: only a few fiscal years, so no smoothing between them. */}
              <LineChart data={data} margin={{ top: 9, right: 10, bottom: 1, left: -18 }}>
                <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={7} padding={{ left: 14, right: 14 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ ...AXIS_TICK, fontSize: 10 }} tickFormatter={formatAxisMillions} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [formatMillions(Number(value)), name]} labelStyle={TOOLTIP_LABEL_STYLE} />
                <Line type="linear" dataKey="allocation" name="Allocated" stroke={SERIES_COLORS.allocation} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5 }} isAnimationActive={animate} animationDuration={800} animationEasing="ease-out" />
                <Line type="linear" dataKey="released" name="Released" stroke={SERIES_COLORS.release} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5 }} isAnimationActive={animate} animationDuration={800} animationEasing="ease-out" />
                <Line type="linear" dataKey="utilized" name="Utilized" stroke={SERIES_COLORS.utilized} strokeWidth={2.4} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5 }} isAnimationActive={animate} animationDuration={800} animationEasing="ease-out" />
              </LineChart>
            </ResponsiveContainer>}
          </div>
          <div className="detail-analytics-legend">
            <span><i className="legend-gold" />Allocated</span>
            <span><i className="legend-release" />Released</span>
            <span><i className="legend-utilized" />Utilized</span>
          </div>
        </>
      ) : (
        <EmptyState title="No fiscal-year funding available" description="Cumulative funding trends need annual allocation, release or expenditure records." />
      )}
    </ChartCard>
  );
}

function AnnualExecutionChart({ site }: { site: Site }) {
  const data = useMemo(() => getFiscalYearRates(site), [site]);
  const maxRate = Math.max(100, ...data.map((year) => Math.max(year.releaseRate, year.utilizationRate)));
  const { ref, isInView, animate } = useChartEntrance();

  return (
    <ChartCard
      title="Annual funding execution"
      description="Release and expenditure as a share of each year’s allocation."
      className="detail-analytics-card detail-execution-card"
    >
      {data.length ? (
        <>
          <div ref={ref} className="execution-chart" role="img" aria-label="Annual release and expenditure rates relative to allocation">
            {isInView && <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 6, right: 24, bottom: 1, left: 3 }} barCategoryGap="30%">
                <CartesianGrid horizontal={false} stroke={GRID_STROKE} strokeDasharray="3 5" />
                <XAxis
                  type="number"
                  domain={[0, Math.ceil(maxRate / 25) * 25]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ ...AXIS_TICK, fontSize: 10 }}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <YAxis type="category" dataKey="label" width={58} axisLine={false} tickLine={false} tick={AXIS_TICK} />
                <Tooltip
                  cursor={{ fill: "#f5f8f5" }}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) => [`${formatPercent(Number(value) / 100)} of annual allocation`, name]}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                />
                <Bar dataKey="releaseRate" name="Released / allocated" fill={SERIES_COLORS.release} radius={[0, 4, 4, 0]} maxBarSize={12} isAnimationActive={animate} animationDuration={750} animationEasing="ease-out" />
                <Bar dataKey="utilizationRate" name="Utilized / allocated" fill={SERIES_COLORS.utilized} radius={[0, 4, 4, 0]} maxBarSize={12} isAnimationActive={animate} animationDuration={750} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>}
          </div>
          <div className="detail-analytics-legend">
            <span><i className="legend-release" />Released / allocated</span>
            <span><i className="legend-utilized" />Utilized / allocated</span>
          </div>
          <p className="detail-chart-footnote">Rates may exceed 100% where reported releases or spending exceed allocation.</p>
        </>
      ) : (
        <EmptyState title="No annual allocation to compare" description="Annual execution rates appear when the sheet reports fiscal-year allocations." />
      )}
    </ChartCard>
  );
}

export function SiteFinancialAnalytics({ site }: { site: Site }) {
  return (
    <section className="site-financial-analytics" aria-labelledby="project-analysis-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PROJECT ANALYSIS</p>
          <h2 id="project-analysis-title">Funding at a glance</h2>
          <p className="section-description">A different view of this project’s annual funding, release and expenditure.</p>
        </div>
      </div>
      <div className="site-analytics-grid">
        <FundingCompositionChart site={site} />
        <CumulativeFundingChart site={site} />
        <AnnualExecutionChart site={site} />
      </div>
    </section>
  );
}
