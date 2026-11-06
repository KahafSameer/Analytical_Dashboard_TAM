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
  Compass,
  Download,
  FileSpreadsheet,
  Landmark,
  MapPin,
  Wallet,
} from "lucide-react";
import { getPortfolioSummary, formatMillions, formatPercent } from "@/lib/analytics";
import { serializeCsv } from "@/lib/csv";
import { formatLocation, isSpecified } from "@/lib/portfolio-filters";
import { projectSharePayload } from "@/lib/share";
import { GLOSSARY_BY_ID, KPI_HELP } from "@/lib/guide-content";
import { projectInShort } from "@/lib/plain-summary";
import { getScheduleStatus, referenceDate } from "@/lib/schedule";
import { InShort } from "@/components/in-short";
import { ProductTour } from "@/components/product-tour";
import { PROJECT_TOUR } from "@/lib/tour";
import { LazySiteFinancialAnalytics, LazySiteFiscalYearChart } from "@/components/lazy-site-charts";
import type { DashboardData, Site } from "@/lib/types";
import { KpiCard, ProgressBar, StatusBadge } from "@/components/ui";
import { PageTopline } from "@/components/dashboard-shell";
import { Reveal } from "@/components/motion";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { DataSourceError } from "@/components/data-source-state";
import { PrintButton, ShareMenu } from "@/components/share-menu";
import { RelatedProjects, SiteContext } from "@/components/site-insights";

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
  const csv = serializeCsv(rows);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `${site.id}-financial-report.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function ProjectDetail({ site, sites, asOf, invalidAmountCount }: { site: Site; sites: Site[]; asOf: string; invalidAmountCount: number }) {
  const [exported, setExported] = useState(false);
  const summary = useMemo(() => getPortfolioSummary([site]), [site]);
  const inShort = useMemo(() => projectInShort(site, getScheduleStatus(site, referenceDate(asOf))), [site, asOf]);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourRun, setTourRun] = useState(0);
  return (
    <div className="page-stack">
      {invalidAmountCount > 0 && (
        <p className="inline-alert" role="status">
          {invalidAmountCount} malformed financial value{invalidAmountCount === 1 ? " was" : "s were"} treated as zero in the source data.
        </p>
      )}
      <PageTopline section="Project detail" date="Google Sheets" />
      <div className="detail-toolbar">
        <Link href="/" className="back-link"><ArrowLeft size={15} /> All tourism projects</Link>
        <div className="page-actions" data-tour="project-actions">
          <button type="button" className="button button-outline tour-trigger" onClick={() => { setTourRun((run) => run + 1); setTourOpen(true); }}>
            <Compass size={15} /> Tour this page
          </button>
          <ShareMenu label="Share project" getPayload={(url) => projectSharePayload(site, url)} />
          <PrintButton />
        </div>
      </div>

      <section className="detail-hero" data-tour="project-hero">
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
          {isSpecified(site.category) && <span className="detail-category"><Landmark size={14} /> {site.category}</span>}
          <h1>{site.name}</h1>
          {site.description.trim().toLowerCase() !== site.name.trim().toLowerCase() && <p className="detail-hero-description">{site.description}</p>}
          <div className="detail-meta">
            <span><MapPin size={13} />{formatLocation(site)}</span>
            {site.code && <span><FileSpreadsheet size={13} /> Project {site.code}</span>}
            {site.gestationPeriod && <span><CalendarDays size={13} />{site.gestationPeriod}</span>}
            <StatusBadge status={site.utilized > 0 ? "Spending started" : "No spending yet"} tone={site.utilized > 0 ? "green" : "gold"} />
          </div>
        </div>
        <div className="detail-hero-stat">
          <div className="hero-stat-top"><span>Budget spent so far</span><strong>{formatPercent(site.overallProgress)}</strong></div>
          <ProgressBar value={site.overallProgress} />
          <div className="hero-stat-note"><span>Spent of the approved budget</span><strong>{formatMillions(site.utilized)}</strong></div>
        </div>
      </section>

      <InShort sentences={inShort} />

      <section aria-label="Project financial summary">
        <div className="summary-section-label"><span>KEY NUMBERS</span><span className="summary-privacy"><Check size={13} /> From the project records</span></div>
        <div className="kpi-grid detail-kpis" data-tour="project-kpis">
          <KpiCard label="Financial progress" value={formatPercent(site.overallProgress)} supporting="Share of the budget spent" icon={<ArrowUpRight size={17} />} accent help={KPI_HELP.financialProgress} helpAnchor="financial-progress" />
          <KpiCard label="Approved cost" value={formatMillions(site.approvedCost)} supporting="Total budget for the project" icon={<Landmark size={17} />} help={KPI_HELP.approvedCost} helpAnchor="approved-cost" />
          <KpiCard label="Money spent" value={formatMillions(site.utilized)} supporting={`of ${formatMillions(site.allocated)} set aside`} icon={<Banknote size={17} />} help={GLOSSARY_BY_ID.spent.short} helpAnchor="spent" />
          <KpiCard label="Money handed over" value={formatMillions(site.released)} supporting={`${formatPercent(summary.utilizationRate)} of the money set aside is spent`} icon={<Wallet size={17} />} help={KPI_HELP.released} helpAnchor="released" />
        </div>
      </section>

      <section>
        <div className="section-heading">
          <div><p className="eyebrow">MONEY BY YEAR</p><h2>Set aside, handed over and spent</h2><p className="section-description">For each budget year (July–June) · millions of rupees.</p></div>
        </div>
        <div className="detail-grid" data-tour="project-years">
          <LazySiteFiscalYearChart site={site} />

          <Reveal className="detail-table-reveal">
          <section className="chart-card detail-table-card">
            <div className="table-headline">
              <div className="chart-card-heading"><div><h3>Year-by-year numbers</h3><p>Exact amounts in millions of rupees.</p></div></div>
            </div>
            <div className="fiscal-table-wrap">
              <table className="fiscal-table">
                <thead><tr><th>Budget year</th><th>Allocated</th><th>Released</th><th>Spent</th></tr></thead>
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

      <SiteContext site={site} sites={sites} asOf={asOf} />

      <LazySiteFinancialAnalytics site={site} />

      <RelatedProjects site={site} sites={sites} />

      <section className="detail-note-section">
        <div className="data-note">
          <div className="data-note-icon"><CalendarDays size={17} /></div>
          <div><p className="data-note-title">Money only, not construction work</p><p className="data-note-copy">These records track budgets and spending — not how much building work, tasks or milestones are finished.</p></div>
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
      <footer className="page-footer"><span>FIELDNOTES <b>·</b> TOURISM INTELLIGENCE</span><span>Project {site.code ?? site.id} · millions of rupees · <Link href="/guide">How to read this page</Link></span></footer>
      <ProductTour key={tourRun} steps={PROJECT_TOUR} open={tourOpen} onClose={() => setTourOpen(false)} label="Project page tour" />
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
  return <ProjectDetail site={site} sites={currentData.sites} asOf={currentData.fetchedAt} invalidAmountCount={currentData.invalidAmountCount} />;
}
