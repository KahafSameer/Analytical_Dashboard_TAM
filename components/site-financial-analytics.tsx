"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
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
import { formatMillions, formatPercent } from "@/lib/analytics";
import { getAllocationComposition, getCumulativeFunding, getFiscalYearRates } from "@/lib/site-analytics";
import type { Site } from "@/lib/types";
import { ChartCard, EmptyState } from "@/components/ui";

function FundingCompositionChart({ site }: { site: Site }) {
  const segments = useMemo(() => getAllocationComposition(site), [site]);
  const displayTotal = Math.max(site.allocated, site.utilized);

  return (
    <ChartCard
      title="Allocation utilization"
      description="Reported expenditure compared with allocated funds."
      className="detail-analytics-card"
    >
      {displayTotal > 0 ? (
        <>
          <div className="detail-donut-wrap">
            <div className="detail-donut" role="img" aria-label="Donut chart showing allocated funds utilized and remaining">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={segments} dataKey="value" nameKey="name" innerRadius="69%" outerRadius="92%" paddingAngle={2} stroke="none">
                    {segments.map((segment) => <Cell key={segment.name} fill={segment.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 9, border: "1px solid #e6ebe7", boxShadow: "0 8px 26px rgba(24,44,33,.08)", fontSize: 10 }}
                    formatter={(value) => [formatMillions(Number(value)), ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
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

  return (
    <ChartCard
      title="Cumulative funding movement"
      description="Running total of allocation, release and expenditure by fiscal year."
      className="detail-analytics-card"
    >
      {hasData ? (
        <>
          <div className="cumulative-chart" role="img" aria-label="Cumulative allocation, release and expenditure by fiscal year">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 9, right: 6, bottom: 1, left: -18 }}>
                <defs>
                  <linearGradient id="cumulativeAllocation" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4a017" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#d4a017" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cumulativeUtilized" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f4c3a" stopOpacity={0.13} />
                    <stop offset="100%" stopColor="#0f4c3a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#edf0ed" strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#718078" }} dy={7} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: "#87918a" }} tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`} />
                <Tooltip
                  contentStyle={{ borderRadius: 9, border: "1px solid #e6ebe7", boxShadow: "0 8px 26px rgba(24,44,33,.08)", fontSize: 10 }}
                  formatter={(value) => [formatMillions(Number(value)), ""]}
                  labelStyle={{ color: "#1f2937", fontWeight: 600, marginBottom: 4 }}
                />
                <Area type="monotone" dataKey="allocation" name="Allocation" stroke="#d4a017" fill="url(#cumulativeAllocation)" strokeWidth={1.8} />
                <Area type="monotone" dataKey="released" name="Released" stroke="#8bab98" fill="transparent" strokeWidth={1.8} />
                <Area type="monotone" dataKey="utilized" name="Utilized" stroke="#0f4c3a" fill="url(#cumulativeUtilized)" strokeWidth={2.2} />
              </AreaChart>
            </ResponsiveContainer>
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

  return (
    <ChartCard
      title="Annual funding execution"
      description="Release and expenditure as a share of each year’s allocation."
      className="detail-analytics-card detail-execution-card"
    >
      {data.length ? (
        <>
          <div className="execution-chart" role="img" aria-label="Annual release and expenditure rates relative to allocation">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 6, right: 24, bottom: 1, left: 3 }} barCategoryGap="30%">
                <CartesianGrid horizontal={false} stroke="#edf0ed" strokeDasharray="3 5" />
                <XAxis
                  type="number"
                  domain={[0, Math.ceil(maxRate / 25) * 25]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 8, fill: "#829087" }}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <YAxis type="category" dataKey="label" width={58} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#65736a" }} />
                <Tooltip
                  cursor={{ fill: "#f5f8f5" }}
                  contentStyle={{ borderRadius: 9, border: "1px solid #e6ebe7", boxShadow: "0 8px 26px rgba(24,44,33,.08)", fontSize: 10 }}
                  formatter={(value, name) => [`${formatPercent(Number(value) / 100)} of annual allocation`, name]}
                  labelStyle={{ color: "#1f2937", fontWeight: 600, marginBottom: 4 }}
                />
                <Bar dataKey="releaseRate" name="Released / allocated" fill="#8bab98" radius={[0, 3, 3, 0]} maxBarSize={12} />
                <Bar dataKey="utilizationRate" name="Utilized / allocated" fill="#0f4c3a" radius={[0, 3, 3, 0]} maxBarSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="detail-analytics-legend">
            <span><i className="legend-release" />Released / allocated</span>
            <span><i className="legend-utilized" />Utilized / allocated</span>
          </div>
          <p className="detail-chart-footnote">Rates may exceed 100% where reported releases or spending exceed allocation.</p>
        </>
      ) : (
        <EmptyState title="No annual allocation to compare" description="Annual execution rates appear when the workbook reports fiscal-year allocations." />
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
