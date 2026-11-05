"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMillions } from "@/lib/analytics";
import type { Site } from "@/lib/types";
import { ChartCard, EmptyState } from "@/components/ui";
import { useChartEntrance } from "@/components/motion";

export function SiteFiscalYearChart({ site }: { site: Site }) {
  const { ref, isInView, animate } = useChartEntrance();
  const hasFunding = site.fiscalYears.some((year) => year.allocation || year.release || year.utilized);

  return (
    <ChartCard title="Funds by fiscal year" description="Compare planned funding with releases and spend.">
      {hasFunding ? (
        <>
          <div ref={ref} className="detail-chart" role="img" aria-label="Bar chart comparing annual allocation, release and utilization">
            {isInView && <ResponsiveContainer width="100%" height="100%">
              <BarChart data={site.fiscalYears} margin={{ top: 10, right: 6, bottom: 1, left: -20 }} barGap={3} barCategoryGap="26%">
                <CartesianGrid vertical={false} stroke="#edf0ed" strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#59665d" }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#59665d" }} tickFormatter={(value: number) => value.toLocaleString("en-US")} />
                <Tooltip
                  cursor={{ fill: "#f5f8f5" }}
                  contentStyle={{ borderRadius: 9, border: "1px solid #e6ebe7", boxShadow: "0 8px 26px rgba(24,44,33,.08)", fontSize: 11 }}
                  formatter={(value) => [formatMillions(Number(value)), ""]}
                  labelStyle={{ color: "#1f2937", fontWeight: 600, marginBottom: 4 }}
                />
                <Bar dataKey="allocation" name="Allocated" fill="#d4a017" radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={animate} animationDuration={750} animationEasing="ease-out" />
                <Bar dataKey="release" name="Released" fill="#8bab98" radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={animate} animationDuration={750} animationEasing="ease-out" />
                <Bar dataKey="utilized" name="Utilized" fill="#0f4c3a" radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={animate} animationDuration={750} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>}
          </div>
          <div className="detail-legend">
            <span><i className="legend-gold" />Allocated</span>
            <span><i className="legend-release" />Released</span>
            <span><i className="legend-utilized" />Utilized</span>
          </div>
        </>
      ) : (
        <EmptyState title="No year-wise funding available" description="This Google Sheet doesn’t contain annual allocation or expenditure for this project." />
      )}
    </ChartCard>
  );
}
