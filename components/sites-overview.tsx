"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  Landmark,
  MapPin,
  ShieldCheck,
  X,
} from "lucide-react";
import { getPortfolioSummary, combineFiscalYears, formatMillions, formatPercent } from "@/lib/analytics";
import {
  ALL_DISTRICTS,
  DEFAULT_FILTERS,
  countActiveFilters,
  describeFilters,
  filterSites,
  filtersFromSearchParams,
  filtersToQueryString,
  getDistricts,
  type PortfolioFilters,
} from "@/lib/portfolio-filters";
import { portfolioSharePayload } from "@/lib/share";
import type { DashboardData } from "@/lib/types";
import { EmptyState, KpiCard, SectionHeading } from "@/components/ui";
import { PageTopline } from "@/components/dashboard-shell";
import { LazyPortfolioAnalytics, LazyPortfolioFundingChart, LazyScheduleInsights } from "@/components/lazy-portfolio-charts";
import { FundingPipeline } from "@/components/funding-pipeline";
import { PortfolioExportButton } from "@/components/portfolio-export-button";
import { PortfolioFilterBar } from "@/components/portfolio-filter-bar";
import { ProjectRegister } from "@/components/project-register";
import { PrintButton, ShareMenu } from "@/components/share-menu";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { DataSourceError, NoProjectsState } from "@/components/data-source-state";

type Toast = { district: string; previous: PortfolioFilters };

export function SitesOverview({
  initialData,
  initialError,
}: {
  initialData: DashboardData | null;
  initialError?: string | null;
}) {
  const query = useSearchParams();
  // Filters live in the URL (?q=&district=&spend=&progress=) so a view can be shared or bookmarked.
  const [filters, setFilters] = useState<PortfolioFilters>(() => filtersFromSearchParams(query));
  const [toast, setToast] = useState<Toast | null>(null);
  const { data, setData, setError } = useDashboardData();
  useEffect(() => {
    if (initialData) setData(initialData);
    else if (initialError) setError(initialError);
  }, [initialData, initialError, setData, setError]);
  const currentData = initialData && (!data || Date.parse(initialData.fetchedAt) >= Date.parse(data.fetchedAt))
    ? initialData
    : data;

  const allSites = currentData?.sites;
  const districts = useMemo(() => (allSites ? getDistricts(allSites) : []), [allSites]);
  // A shared link may name a district that is no longer in the sheet: ignore it rather than show nothing.
  const activeFilters = useMemo(
    () => (filters.district !== ALL_DISTRICTS && districts.length && !districts.includes(filters.district) ? { ...filters, district: ALL_DISTRICTS } : filters),
    [filters, districts],
  );
  const sites = useMemo(() => (allSites ? filterSites(allSites, activeFilters) : []), [allSites, activeFilters]);
  const summary = useMemo(() => getPortfolioSummary(sites), [sites]);
  const yearly = useMemo(() => combineFiscalYears(sites), [sites]);

  useEffect(() => {
    const queryString = filtersToQueryString(activeFilters);
    const next = `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(null, "", next);
    }
  }, [activeFilters]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 7_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!currentData || !allSites) return <DataSourceError message={initialError ?? undefined} />;
  if (!allSites.length) return <NoProjectsState />;

  const isFiltered = countActiveFilters(activeFilters) > 0;
  const selection = describeFilters(activeFilters);
  const areaCount = new Set(sites.map((site) => site.district)).size;
  const scopeLabel = isFiltered ? "selection" : "portfolio";

  const selectDistrict = (district: string) => {
    if (district === activeFilters.district) return;
    setToast({ district, previous: activeFilters });
    setFilters({ ...activeFilters, district });
  };

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
          {isFiltered && <p className="print-only print-selection">Selection: {selection} · {sites.length} of {allSites.length} projects</p>}
        </div>
        <div className="intro-side">
          <div className="intro-context">
            <span className="context-icon"><MapPin size={17} /></span>
            <div><strong>{districts.length} reporting areas</strong><span>Source: Google Sheets · PKR millions</span></div>
          </div>
          <div className="page-actions">
            <ShareMenu
              label={isFiltered ? "Share this view" : "Share"}
              getPayload={(url) => portfolioSharePayload(summary, { total: allSites.length, selection: selection || undefined, url })}
            />
            <PrintButton />
          </div>
        </div>
      </section>

      <PortfolioFilterBar
        filters={activeFilters}
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

          <section id="sites" className="projects-section">
            <SectionHeading
              eyebrow="PROJECT REGISTER"
              title={isFiltered ? "Projects in this selection" : "All projects"}
              description="Each row shows year-wise funding at a glance. Select View progress for the money flow, fiscal years and schedule, or open the full project."
            />
            <ProjectRegister sites={sites} asOf={currentData.fetchedAt} />
          </section>

          <section id="portfolio-analytics" className="portfolio-section">
            <SectionHeading
              eyebrow="FUNDING FLOW"
              title="Where the funding stands"
              description={`Year-wise allocation, release and expenditure for the ${scopeLabel}, and how approved cost converts into spending.`}
            />
            <div className="portfolio-chart-layout">
              <LazyPortfolioFundingChart data={yearly} />
              <FundingPipeline sites={sites} />
            </div>
          </section>

          <LazyPortfolioAnalytics sites={sites} onSelectDistrict={selectDistrict} />

          <LazyScheduleInsights sites={sites} asOf={currentData.fetchedAt} />

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

      {toast && (
        <div className="page-toast" role="status">
          <span>Showing <strong>{toast.district}</strong> · {sites.length} project{sites.length === 1 ? "" : "s"}</span>
          <button type="button" className="page-toast-action" onClick={() => { setFilters(toast.previous); setToast(null); }}>Undo</button>
          <button type="button" className="page-toast-close" aria-label="Dismiss" onClick={() => setToast(null)}><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
