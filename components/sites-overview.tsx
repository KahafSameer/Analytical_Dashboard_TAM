"use client";

import { useEffect } from "react";
import {
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  CircleAlert,
  Landmark,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { getPortfolioSummary, combineFiscalYears, formatMillions, formatPercent } from "@/lib/analytics";
import type { DashboardData } from "@/lib/types";
import { KpiCard, SectionHeading } from "@/components/ui";
import { PageTopline } from "@/components/dashboard-shell";
import { PortfolioFundingChart } from "@/components/portfolio-chart";
import { PortfolioAnalytics } from "@/components/portfolio-analytics";
import { PortfolioExportButton } from "@/components/portfolio-export-button";
import { SiteGrid } from "@/components/site-grid";
import { Reveal } from "@/components/motion";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { DataSourceError, NoProjectsState } from "@/components/data-source-state";

export function SitesOverview({
  initialData,
  initialError,
}: {
  initialData: DashboardData | null;
  initialError?: string | null;
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
  if (!currentData.sites.length) return <NoProjectsState />;

  const sites = currentData.sites;
  const summary = getPortfolioSummary(sites);
  const yearly = combineFiscalYears(sites);
  return (
    <div className="page-stack">
      {currentData.skippedRows > 0 && (
        <p className="inline-alert" role="status">
          {currentData.skippedRows} non-empty row{currentData.skippedRows === 1 ? " was" : "s were"} skipped because no valid project name was found.
        </p>
      )}
      <PageTopline section="Tourism sites" date="Google Sheets" />
      <section className="page-intro">
        <div>
          <div className="intro-kicker"><span className="intro-kicker-line" /> TOURISM & HERITAGE PORTFOLIO</div>
          <h1>Tourism sites<span className="title-period">.</span></h1>
          <p>One clear view of project funding and financial progress across the portfolio.</p>
        </div>
        <div className="intro-context">
          <span className="context-icon"><MapPin size={17} /></span>
          <div><strong>Google Sheets</strong><span>Current source of project data</span></div>
        </div>
      </section>

      <section aria-label="Portfolio summary">
        <div className="summary-section-label"><span>PORTFOLIO AT A GLANCE</span><span className="summary-privacy"><ShieldCheck size={13} /> Source-backed figures</span></div>
        <div className="kpi-grid">
          <KpiCard label="Tourism projects" value={`${summary.siteCount}`} supporting={`Across ${new Set(sites.map((site) => site.district)).size} reporting areas`} icon={<Landmark size={17} />} />
          <KpiCard label="Financial progress" value={formatPercent(summary.weightedProgress)} supporting="Weighted by approved cost" icon={<ArrowUpRight size={17} />} accent />
          <KpiCard label="Funds utilized" value={formatMillions(summary.totalUtilized)} supporting={`of ${formatMillions(summary.totalApproved)} approved`} icon={<Banknote size={17} />} />
          <KpiCard label="Projects with spend" value={`${summary.sitesWithSpend} of ${summary.siteCount}`} supporting={`${summary.awaitingSpend} with no spend recorded`} icon={<BriefcaseBusiness size={17} />} trend={summary.awaitingSpend ? "down" : "up"} />
        </div>
      </section>

      <section id="sites" className="projects-section">
        <SectionHeading
          eyebrow="THE PORTFOLIO"
          title="Projects across the region"
          description="Select a project to explore its funding, releases and utilization by fiscal year."
          action={<span className="district-count"><MapPin size={14} /> {new Set(sites.map((site) => site.district)).size} reporting areas</span>}
        />
        <SiteGrid initialSites={sites} />
      </section>

      <section id="portfolio-analytics" className="portfolio-section">
        <SectionHeading
          eyebrow="PORTFOLIO INSIGHT"
          title="Where the funding stands"
          description="Approved project costs compared with year-wise allocation and expenditure."
        />
        <div className="portfolio-chart-layout">
          <PortfolioFundingChart data={yearly} />
          <Reveal className="funding-note-reveal">
          <aside className="funding-note">
            <span className="funding-note-icon"><CircleAlert size={18} /></span>
            <p className="eyebrow">HOW TO READ THIS</p>
            <h3>Financial progress, not construction progress.</h3>
            <p>This source reports budgets, releases and expenditure. Activity completion, visitor counts and physical progress aren’t included.</p>
            <div className="funding-stat"><span>Portfolio utilized</span><strong>{formatPercent(summary.utilizationRate)}</strong></div>
            <div className="funding-stat"><span>Released to date</span><strong>{formatMillions(summary.totalReleased)}</strong></div>
            <a href="#report-export" className="text-link">About this dataset <ArrowUpRight size={14} /></a>
          </aside>
          </Reveal>
        </div>
      </section>

      <PortfolioAnalytics sites={sites} />

      <section id="report-export" className="report-strip">
        <div className="report-icon"><Banknote size={19} /></div>
        <div><strong>Built from the master Google Sheet</strong><span>{sites.length} source projects · PKR millions · Fiscal-year data from the sheet</span></div>
        <PortfolioExportButton sites={sites} />
      </section>
      <footer className="page-footer"><span>FIELDNOTES <b>·</b> TOURISM INTELLIGENCE</span><span>Google Sheets · Financial reporting snapshot</span></footer>
    </div>
  );
}
