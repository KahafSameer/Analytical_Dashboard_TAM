"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  Download,
  FileSpreadsheet,
  Landmark,
  MapPin,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getPortfolioSummary, formatMillions, formatPercent } from "@/lib/analytics";
import { SiteFinancialAnalytics } from "@/components/site-financial-analytics";
import type { DashboardData, Site } from "@/lib/types";
import { ChartCard, EmptyState, KpiCard, ProgressBar, StatusBadge } from "@/components/ui";
import { PageTopline } from "@/components/dashboard-shell";
import { Reveal, useChartEntrance } from "@/components/motion";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { DataSourceError } from "@/components/data-source-state";

function exportCsv(site: Site) {
  const rows = [
    ["Project", site.name],
    ["Project code", site.code ?? ""],
    ["District", site.district],
    ["Project type", site.category],
    ["Approved cost (PKR millions)", site.approvedCost],
    ["Allocated (PKR millions)", site.allocated],
    ["Released (PKR millions)", site.released],
    ["Utilized (PKR millions)", site.utilized],
    ["Financial progress", formatPercent(site.overallProgress)],
    [],
    ["Fiscal year", "Allocation (PKR m)", "Release (PKR m)", "Utilized (PKR m)"],
    ...site.fiscalYears.map((year) => [year.label, year.allocation, year.release, year.utilized]),
  ];
  const csv = rows.map((row) => row.map((cell) => {
    const text = String(cell ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `${site.id}-financial-report.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function ProjectDetail({ site }: { site: Site }) {
  const [exported, setExported] = useState(false);
  const summary = useMemo(() => getPortfolioSummary([site]), [site]);
  const { ref: chartRef, isInView: chartInView, animate: animateChart } = useChartEntrance();
  return (
    <div className="page-stack">
      <PageTopline section="Project detail" date="Google Sheets" />
      <Link href="/" className="back-link"><ArrowLeft size={15} /> All tourism projects</Link>

      <section className="detail-hero">
        <div className="detail-hero-image">
          <Image
            src={site.image}
            alt={`${site.category} project in ${site.district}`}
            fill
            sizes="(max-width: 760px) 100vw, 1200px"
            priority
            loading="eager"
          />
        </div>
        <div className="detail-hero-copy">
          <span className="detail-category"><Landmark size={14} /> {site.category}</span>
          <h1>{site.name}</h1>
          <p className="detail-hero-description">{site.description}</p>
          <div className="detail-meta">
            <span><MapPin size={13} />{site.district}, {site.region}</span>
            {site.code && <span><FileSpreadsheet size={13} /> Project {site.code}</span>}
            {site.gestationPeriod && <span><CalendarDays size={13} />{site.gestationPeriod}</span>}
            <StatusBadge status={site.utilized > 0 ? "Spend recorded" : "No spend yet"} tone={site.utilized > 0 ? "green" : "gold"} />
          </div>
        </div>
        <div className="detail-hero-stat">
          <div className="hero-stat-top"><span>Overall financial progress</span><strong>{formatPercent(site.overallProgress)}</strong></div>
          <ProgressBar value={site.overallProgress} />
          <div className="hero-stat-note"><span>Utilized against approved cost</span><strong>{formatMillions(site.utilized)}</strong></div>
        </div>
      </section>

      <section aria-label="Project financial summary">
        <div className="summary-section-label"><span>FINANCIAL SNAPSHOT</span><span className="summary-privacy"><Check size={13} /> From Google Sheets</span></div>
        <div className="kpi-grid detail-kpis">
          <KpiCard label="Financial progress" value={formatPercent(site.overallProgress)} supporting="Utilized / approved cost" icon={<ArrowUpRight size={17} />} accent />
          <KpiCard label="Approved cost" value={formatMillions(site.approvedCost)} supporting="Total project approval" icon={<Landmark size={17} />} />
          <KpiCard label="Funds utilized" value={formatMillions(site.utilized)} supporting={`of ${formatMillions(site.allocated)} allocated`} icon={<Banknote size={17} />} />
          <KpiCard label="Funds released" value={formatMillions(site.released)} supporting={`${formatPercent(summary.utilizationRate)} of allocation utilized`} icon={<Wallet size={17} />} />
        </div>
      </section>

      <section>
        <div className="section-heading">
          <div><p className="eyebrow">FINANCIAL PERFORMANCE</p><h2>Allocation to expenditure</h2><p className="section-description">Year-wise allocation, release and expenditure · PKR millions.</p></div>
        </div>
        <div className="detail-grid">
          <ChartCard title="Funds by fiscal year" description="Compare planned funding with releases and spend.">
            {site.fiscalYears.some((year) => year.allocation || year.release || year.utilized) ? (
              <>
                <div ref={chartRef} className="detail-chart" role="img" aria-label="Bar chart comparing annual allocation, release and utilization">
                  {chartInView && <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={site.fiscalYears} margin={{ top: 10, right: 6, bottom: 1, left: -20 }} barGap={3} barCategoryGap="26%">
                      <CartesianGrid vertical={false} stroke="#edf0ed" strokeDasharray="3 5" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#718078" }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#87918a" }} tickFormatter={(value: number) => value.toLocaleString("en-US")} />
                      <Tooltip
                        cursor={{ fill: "#f5f8f5" }}
                        contentStyle={{ borderRadius: 9, border: "1px solid #e6ebe7", boxShadow: "0 8px 26px rgba(24,44,33,.08)", fontSize: 11 }}
                        formatter={(value) => [formatMillions(Number(value)), ""]}
                        labelStyle={{ color: "#1f2937", fontWeight: 600, marginBottom: 4 }}
                      />
                      <Bar dataKey="allocation" name="Allocated" fill="#d4a017" radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={animateChart} animationDuration={750} animationEasing="ease-out" />
                      <Bar dataKey="release" name="Released" fill="#8bab98" radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={animateChart} animationDuration={750} animationEasing="ease-out" />
                      <Bar dataKey="utilized" name="Utilized" fill="#0f4c3a" radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={animateChart} animationDuration={750} animationEasing="ease-out" />
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

          <Reveal className="detail-table-reveal">
          <section className="chart-card detail-table-card">
            <div className="table-headline">
              <div className="chart-card-heading"><div><h3>Fiscal-year breakdown</h3><p>Reported funding flows, PKR millions.</p></div></div>
            </div>
            <div className="fiscal-table-wrap">
              <table className="fiscal-table">
                <thead><tr><th>Fiscal year</th><th>Allocated</th><th>Released</th><th>Utilized</th></tr></thead>
                <tbody>
                  {site.fiscalYears.map((year) => (
                    <tr key={year.label}><td>{year.label}</td><td>{year.allocation.toFixed(2)}</td><td>{year.release.toFixed(2)}</td><td>{year.utilized.toFixed(2)}</td></tr>
                  ))}
                  <tr><td>Total</td><td>{site.allocated.toFixed(2)}</td><td>{site.released.toFixed(2)}</td><td className="money-total">{site.utilized.toFixed(2)}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="table-footnote">Small differences may occur due to source rounding.</p>
          </section>
          </Reveal>
        </div>
      </section>

      <SiteFinancialAnalytics site={site} />

      <section className="detail-note-section">
        <div className="data-note">
          <div className="data-note-icon"><CalendarDays size={17} /></div>
          <div><p className="data-note-title">Activity-level reporting not included</p><p className="data-note-copy">This source tracks project finances, not task completion, physical works or milestones.</p></div>
          <Check size={15} className="data-note-check" />
        </div>
        <div className="detail-export">
          <div className="detail-export-copy"><strong>Take this project offline</strong><span>Download a source-backed fiscal-year summary.</span></div>
          <button className="button button-primary" onClick={() => { exportCsv(site); setExported(true); }}>
            {exported ? <Check size={15} /> : <Download size={15} />}
            {exported ? "Report downloaded" : "Export report"}
          </button>
        </div>
      </section>
      <footer className="page-footer"><span>FIELDNOTES <b>·</b> TOURISM INTELLIGENCE</span><span>Project {site.code ?? site.id} · PKR millions</span></footer>
    </div>
  );
}

export function SiteDetail({
  initialData,
  initialError,
  siteId,
}: {
  initialData: DashboardData | null;
  initialError?: string | null;
  siteId: string;
}) {
  const { data, setData, setError } = useDashboardData();
  useEffect(() => {
    if (initialData) setData(initialData);
    else if (initialError) setError(initialError);
  }, [initialData, initialError, setData, setError]);
  const currentData = initialData && (!data || Date.parse(initialData.fetchedAt) >= Date.parse(data.fetchedAt))
    ? initialData
    : data;
  if (!currentData) return <DataSourceError message={initialError ?? undefined} />;
  const site = currentData.sites.find((item) => item.id === siteId) ?? null;
  if (!site) {
    return (
      <div className="detail-error">
        <span className="empty-icon"><FileSpreadsheet size={22} /></span>
        <h1>Project not found in Google Sheets</h1>
        <p>Project {siteId} isn’t present in the current dataset. Return to the portfolio to choose an available project.</p>
        <Link href="/" className="button button-primary"><ArrowLeft size={15} /> Back to projects</Link>
      </div>
    );
  }
  return <ProjectDetail site={site} />;
}
