"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  filterSites,
  getDistricts,
  type PortfolioFilters,
} from "@/lib/portfolio-filters";
import type { DashboardData } from "@/lib/types";
import { EmptyState, KpiCard, SectionHeading } from "@/components/ui";
import { PageTopline } from "@/components/dashboard-shell";
import { LazyPortfolioAnalytics, LazyPortfolioFundingChart } from "@/components/lazy-portfolio-charts";
import { PortfolioExportButton } from "@/components/portfolio-export-button";
import { PortfolioFilterBar } from "@/components/portfolio-filter-bar";
import { ProjectRegister } from "@/components/project-register";
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
  const query = useSearchParams();
  const [filters, setFilters] = useState<PortfolioFilters>(() => ({ ...DEFAULT_FILTERS, search: query.get("q") ?? "" }));
  const { data, setData, setError } = useDashboardData();
  useEffect(() => {
    if (initialData) setData(initialData);
    else if (initialError) setError(initialError);
  }, [initialData, initialError, setData, setError]);
  const currentData = initialData && (!data || Date.parse(initialData.fetchedAt) >= Date.parse(data.fetchedAt))
    ? initialData
    : data;

  const allSites = currentData?.sites;
  const sites = useMemo(() => (allSites ? filterSites(allSites, filters) : []), [allSites, filters]);
  const districts = useMemo(() => (allSites ? getDistricts(allSites) : []), [allSites]);
  const summary = useMemo(() => getPortfolioSummary(sites), [sites]);
  const yearly = useMemo(() => combineFiscalYears(sites), [sites]);

  if (!currentData || !allSites) return <DataSourceError message={initialError ?? undefined} />;
  if (!allSites.length) return <NoProjectsState />;

  const isFiltered = countActiveFilters(filters) > 0;
  const areaCount = new Set(sites.map((site) => site.district)).size;
  const scopeLabel = isFiltered ? "selection" : "portfolio";

  return (
    <div className="page-stack">
      {currentData.skippedRows > 0 && (
        <p className="inline-alert" role="status">
          {currentData.skippedRows} non-empty row{currentData.skippedRows === 1 ? " was" : "s were"} skipped because no valid project name was found.
        </p>
      )}
      {currentData.invalidAmountCount > 0 && (
        <p className="inline-alert" role="status">
          {currentData.invalidAmountCount} malformed financial value{currentData.invalidAmountCount === 1 ? " was" : "s were"} treated as zero in the source data.
        </p>
      )}
      <PageTopline section="Portfolio overview" date="Google Sheets" />
      <section className="page-intro">
        <div>
          <div className="intro-kicker"><span className="intro-kicker-line" /> TOURISM & HERITAGE PORTFOLIO</div>
          <h1>Portfolio overview<span className="title-period">.</span></h1>
          <p>Funding, releases and expenditure across {allSites.length} tourism projects, live from the master sheet.</p>
        </div>
        <div className="intro-context">
          <span className="context-icon"><MapPin size={17} /></span>
          <div><strong>{districts.length} reporting areas</strong><span>Source: Google Sheets · PKR millions</span></div>
        </div>
      </section>

      <PortfolioFilterBar
        filters={filters}
        onChange={setFilters}
        districts={districts}
        matchCount={sites.length}
        totalCount={allSites.length}
      />

      {sites.length === 0 ? (
        <EmptyState
          title="No projects match these filters"
          description="Try another search term or widen the district, spend status or progress filters."
          action={<button type="button" className="button button-outline" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear all filters</button>}
        />
      ) : (
        <>
          <section aria-label={`${isFiltered ? "Selection" : "Portfolio"} summary`}>
            <div className="summary-section-label">
              <span>{isFiltered ? "SELECTION AT A GLANCE" : "PORTFOLIO AT A GLANCE"}</span>
              <span className="summary-privacy"><ShieldCheck size={13} /> Source-backed figures</span>
            </div>
            <div className="kpi-grid">
              <KpiCard label="Projects" value={`${summary.siteCount}`} supporting={isFiltered ? `of ${allSites.length} · ${areaCount} reporting area${areaCount === 1 ? "" : "s"}` : `Across ${areaCount} reporting areas`} icon={<Landmark size={17} />} />
              <KpiCard label="Financial progress" value={formatPercent(summary.weightedProgress)} supporting="Utilized ÷ approved cost" icon={<ArrowUpRight size={17} />} accent />
              <KpiCard label="Funds utilized" value={formatMillions(summary.totalUtilized)} supporting={`of ${formatMillions(summary.totalApproved)} approved`} icon={<Banknote size={17} />} />
              <KpiCard label="Projects with spend" value={`${summary.sitesWithSpend} of ${summary.siteCount}`} supporting={`${summary.awaitingSpend} with no spend recorded`} icon={<BriefcaseBusiness size={17} />} trend={summary.awaitingSpend ? "down" : "up"} />
            </div>
          </section>

          <section id="portfolio-analytics" className="portfolio-section">
            <SectionHeading
              eyebrow="FUNDING FLOW"
              title="Where the funding stands"
              description={`Year-wise allocation, release and expenditure for the ${scopeLabel}.`}
            />
            <div className="portfolio-chart-layout">
              <LazyPortfolioFundingChart data={yearly} />
              <Reveal className="funding-note-reveal">
                <aside className="funding-note">
                  <span className="funding-note-icon"><CircleAlert size={18} /></span>
                  <p className="eyebrow">HOW TO READ THIS</p>
                  <h3>Financial progress, not construction progress.</h3>
                  <p>This source reports budgets, releases and expenditure. Activity completion, visitor counts and physical progress aren’t included.</p>
                  <div className="funding-stat"><span>Utilized of allocation</span><strong>{formatPercent(summary.utilizationRate)}</strong></div>
                  <div className="funding-stat"><span>Released to date</span><strong>{formatMillions(summary.totalReleased)}</strong></div>
                  <div className="funding-stat"><span>Released, not yet spent</span><strong>{formatMillions(Math.max(0, summary.totalReleased - summary.totalUtilized))}</strong></div>
                </aside>
              </Reveal>
            </div>
          </section>

          <LazyPortfolioAnalytics sites={sites} />

          <section id="sites" className="projects-section">
            <SectionHeading
              eyebrow="PROJECT REGISTER"
              title={isFiltered ? "Projects in this selection" : "All projects"}
              description="Sort any column, then open a project for its fiscal-year breakdown."
            />
            <ProjectRegister sites={sites} />
          </section>

          <section id="report-export" className="report-strip">
            <div className="report-icon"><Banknote size={19} /></div>
            <div>
              <strong>Export {isFiltered ? `these ${sites.length} projects` : "the full portfolio"}</strong>
              <span>CSV · PKR millions · built from the master Google Sheet{isFiltered ? " · current filters applied" : ""}</span>
            </div>
            <PortfolioExportButton sites={sites} filtered={isFiltered} />
          </section>
        </>
      )}
      <footer className="page-footer"><span>FIELDNOTES <b>·</b> TOURISM INTELLIGENCE</span><span>Google Sheets · Financial reporting snapshot</span></footer>
    </div>
  );
}
