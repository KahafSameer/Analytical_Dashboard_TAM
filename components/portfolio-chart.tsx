"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMillions } from "@/lib/analytics";
import type { FiscalYear } from "@/lib/types";
import { ChartCard } from "@/components/ui";
import { useChartEntrance } from "@/components/motion";

export function PortfolioFundingChart({ data }: { data: FiscalYear[] }) {
  const { ref, isInView, animate } = useChartEntrance();
  return (
    <ChartCard title="Funds utilized by fiscal year" description="Portfolio-wide expenditure · PKR millions">
      <div className="chart-legend">
        <span><i className="legend-dot legend-green" /> Utilized</span>
        <span><i className="legend-dot legend-gold" /> Allocated</span>
      </div>
      <div ref={ref} className="overview-chart">
        {isInView && <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id="allocatedGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d4a017" stopOpacity={0.12} /><stop offset="100%" stopColor="#d4a017" stopOpacity={0} /></linearGradient>
              <linearGradient id="utilizedGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f4c3a" stopOpacity={0.18} /><stop offset="100%" stopColor="#0f4c3a" stopOpacity={0.01} /></linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#edf0ed" strokeDasharray="3 5" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#59665d" }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#59665d" }} tickFormatter={(value: number) => `${value}`} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid #e6ebe7", boxShadow: "0 8px 26px rgba(24,44,33,.08)", fontSize: 12 }}
              formatter={(value) => [formatMillions(Number(value)), ""]}
              labelStyle={{ color: "#1f2937", fontWeight: 600, marginBottom: 4 }}
            />
            <Area type="monotone" dataKey="allocation" name="Allocated" stroke="#d4a017" fill="url(#allocatedGradient)" strokeWidth={1.8} isAnimationActive={animate} animationDuration={800} animationEasing="ease-out" />
            <Area type="monotone" dataKey="utilized" name="Utilized" stroke="#0f4c3a" fill="url(#utilizedGradient)" strokeWidth={2.5} isAnimationActive={animate} animationDuration={800} animationEasing="ease-out" />
          </AreaChart>
        </ResponsiveContainer>}
      </div>
      <details className="chart-data-table">
        <summary>View data table</summary>
        <div className="chart-data-table-scroll">
          <table>
            <caption className="sr-only">Portfolio funding by fiscal year, PKR millions</caption>
            <thead><tr><th scope="col">Fiscal year</th><th scope="col">Allocated</th><th scope="col">Utilized</th></tr></thead>
            <tbody>{data.map((year) => (
              <tr key={year.label}><th scope="row">{year.label}</th><td>{formatMillions(year.allocation)}</td><td>{formatMillions(year.utilized)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </ChartCard>
  );
}
