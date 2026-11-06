"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMillions } from "@/lib/analytics";
import { AXIS_TICK, GRID_STROKE, SERIES_COLORS, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE, formatAxisMillions } from "@/lib/chart-theme";
import type { FiscalYear } from "@/lib/types";
import { ChartCard } from "@/components/ui";
import { useChartEntrance } from "@/components/motion";

const SERIES = [
  { key: "allocation", label: "Allocated", color: SERIES_COLORS.allocation },
  { key: "release", label: "Released", color: SERIES_COLORS.release },
  { key: "utilized", label: "Utilized", color: SERIES_COLORS.utilized },
] as const;

export function PortfolioFundingChart({ data }: { data: FiscalYear[] }) {
  const { ref, isInView, animate } = useChartEntrance();
  return (
    <ChartCard title="Funding by fiscal year" description="Allocated, released and utilized for the projects shown · PKR millions">
      <div className="chart-legend" aria-hidden="true">
        {SERIES.map((series) => <span key={series.key}><i className="legend-dot" style={{ backgroundColor: series.color }} /> {series.label}</span>)}
      </div>
      <div ref={ref} className="overview-chart" role="img" aria-label="Grouped bar chart of allocation, release and expenditure by fiscal year">
        {isInView && <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }} barGap={3} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 5" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={formatAxisMillions} />
            <Tooltip
              cursor={{ fill: "#f5f8f5" }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, name) => [formatMillions(Number(value)), name]}
              labelStyle={TOOLTIP_LABEL_STYLE}
            />
            {SERIES.map((series) => (
              <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color} radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={animate} animationDuration={750} animationEasing="ease-out" />
            ))}
          </BarChart>
        </ResponsiveContainer>}
      </div>
      <details className="chart-data-table">
        <summary>View data table</summary>
        <div className="chart-data-table-scroll">
          <table>
            <caption className="sr-only">Portfolio funding by fiscal year, PKR millions</caption>
            <thead><tr><th scope="col">Fiscal year</th><th scope="col">Allocated</th><th scope="col">Released</th><th scope="col">Utilized</th></tr></thead>
            <tbody>{data.map((year) => (
              <tr key={year.label}><th scope="row">{year.label}</th><td>{formatMillions(year.allocation)}</td><td>{formatMillions(year.release)}</td><td>{formatMillions(year.utilized)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </ChartCard>
  );
}
