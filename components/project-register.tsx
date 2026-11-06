"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Activity, ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, MapPin, Rows3 } from "lucide-react";
import type { Site } from "@/lib/types";
import { formatPercent } from "@/lib/analytics";
import {
  getUnspentRelease,
  sortSites,
  type ProjectSortKey,
  type SortDirection,
} from "@/lib/portfolio-filters";
import { SiteCard } from "@/components/site-card";
import { StatusBadge } from "@/components/ui";
import { FundingSparkbars, ProgressRing, SparkLegend } from "@/components/funding-sparkbars";
import { ProjectProgressPanel } from "@/components/project-progress-panel";
import { useMediaQuery } from "@/components/use-media-query";
import { InfoTip } from "@/components/info-tip";
import { KPI_HELP } from "@/lib/guide-content";

type View = "table" | "cards";

/** Columns with a sort key get a sortable header; district and released remain in the Sort menu. */
const columns: { key: ProjectSortKey | null; label: string; numeric?: boolean; className: string }[] = [
  { key: "name", label: "Project", className: "col-project" },
  { key: null, label: "Money by year", className: "col-trend" },
  { key: "approvedCost", label: "Approved", numeric: true, className: "col-approved" },
  { key: "utilized", label: "Spent", numeric: true, className: "col-utilized" },
  { key: "unspentRelease", label: "Not spent", numeric: true, className: "col-unspent-release" },
  { key: "overallProgress", label: "Progress", numeric: true, className: "col-progress" },
  { key: null, label: "Details", className: "col-action" },
];

const sortLabels: Record<ProjectSortKey, string> = {
  name: "Name",
  district: "District",
  approvedCost: "Approved budget",
  released: "Handed over",
  utilized: "Money spent",
  unspentRelease: "Handed over, not spent",
  overallProgress: "Share of budget spent",
};

const PAGE_SIZE: Record<View, number> = { table: 15, cards: 12 };
/** On phones each row is a tall card, so fewer per page keeps the analytics within reach. */
const PHONE_PAGE_SIZE = 8;
/** Amounts below this round to "0.0" at one decimal, so they are shown as a dash instead. */
const MIN_DISPLAYED_AMOUNT = 0.05;

function amount(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function ProjectRegister({ sites, asOf }: { sites: Site[]; asOf: string }) {
  const [selectedView, setView] = useState<View>("table");
  const isPhone = useMediaQuery("(max-width: 760px)");
  // On phones the table already renders as cards, so the view switch is hidden and not needed.
  const view: View = isPhone ? "table" : selectedView;
  const [sortKey, setSortKey] = useState<ProjectSortKey>("overallProgress");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Return to the first page when filters change the result set, but not on background refreshes.
  const membership = sites.map((site) => site.id).join("|");
  const [previousMembership, setPreviousMembership] = useState(membership);
  if (membership !== previousMembership) {
    setPreviousMembership(membership);
    setPage(0);
  }

  const sorted = useMemo(() => sortSites(sites, sortKey, direction), [direction, sites, sortKey]);
  const showImages = useMemo(() => new Set(sites.map((site) => site.image)).size > 1, [sites]);
  const pageSize = isPhone ? PHONE_PAGE_SIZE : PAGE_SIZE[view];
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  function changeSort(key: ProjectSortKey) {
    if (key === sortKey) setDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDirection(key === "name" || key === "district" ? "asc" : "desc");
    }
    setPage(0);
  }

  return (
    <div className="register">
      <div className="register-toolbar">
        <div className="register-summary">
          <span className="register-count">
            <strong>{sites.length}</strong> project{sites.length === 1 ? "" : "s"} · amounts in millions of rupees
            <InfoTip title="What the columns mean" label="What do the columns mean?" guideAnchor="glossary">{KPI_HELP.registerColumns}</InfoTip>
          </span>
          <SparkLegend />
        </div>
        <div className="register-controls">
          <label className="sort-select-wrap">
            <span className="register-control-label">Sort</span>
            <select
              aria-label="Sort projects by"
              value={sortKey}
              onChange={(event) => changeSort(event.target.value as ProjectSortKey)}
            >
              {Object.entries(sortLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="icon-toggle"
            onClick={() => { setDirection((current) => (current === "asc" ? "desc" : "asc")); setPage(0); }}
            aria-label={direction === "asc" ? "Sorted ascending, switch to descending" : "Sorted descending, switch to ascending"}
          >
            {direction === "asc" ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
          </button>
          <div className="view-toggle" role="group" aria-label="Project view">
            <button type="button" aria-pressed={view === "table"} onClick={() => { setView("table"); setPage(0); }}><Rows3 size={15} /> Table</button>
            <button type="button" aria-pressed={view === "cards"} onClick={() => { setView("cards"); setPage(0); }}><LayoutGrid size={15} /> Cards</button>
          </div>
        </div>
      </div>

      {view === "table" ? (
        <div className="register-table-wrap">
          <table className="register-table">
            <caption className="sr-only">Project register, sorted by {sortLabels[sortKey]} {direction === "asc" ? "ascending" : "descending"}</caption>
            <thead>
              <tr>
                {columns.map((column) => {
                  const sortKeyForColumn = column.key;
                  if (!sortKeyForColumn) {
                    return <th key={column.label} scope="col" className={column.className}><span className="th-static">{column.label}</span></th>;
                  }
                  const active = sortKeyForColumn === sortKey;
                  return (
                    <th
                      key={column.label}
                      scope="col"
                      className={`${column.numeric ? "num " : ""}${column.className}`}
                      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <button type="button" className={`th-sort${active ? " is-active" : ""}`} onClick={() => changeSort(sortKeyForColumn)}>
                        {column.label}
                        {active ? (direction === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="th-sort-idle" />}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((site) => {
                const unspent = getUnspentRelease(site);
                const expanded = expandedId === site.id;
                const panelId = `progress-${site.id}`;
                return (
                  <Fragment key={site.id}>
                    <tr className={`register-row${expanded ? " is-expanded" : ""}`}>
                      <th scope="row" className="cell-project">
                        <Link href={`/sites/${site.id}`}>{site.name}</Link>
                        <span className="cell-sub">
                          <span className="cell-district"><MapPin size={11} aria-hidden="true" />{site.district}</span>
                          {site.code && <span className="cell-code">#{site.code}</span>}
                          {site.utilized === 0 && <StatusBadge status="No spend yet" tone="gold" />}
                        </span>
                      </th>
                      <td className="cell-trend" data-label="Money by year"><FundingSparkbars years={site.fiscalYears} /></td>
                      <td className="num cell-approved" data-label="Approved budget">{amount(site.approvedCost)}</td>
                      <td className="num cell-utilized" data-label="Spent">{amount(site.utilized)}</td>
                      <td className={`num cell-unspent${unspent >= MIN_DISPLAYED_AMOUNT ? " is-attention" : ""}`} data-label="Not spent">
                        {unspent >= MIN_DISPLAYED_AMOUNT ? amount(unspent) : "—"}
                      </td>
                      <td className="num cell-ring">
                        <span className="ring-wrap">
                          <ProgressRing value={site.overallProgress} />
                          <span>{formatPercent(site.overallProgress)}</span>
                        </span>
                      </td>
                      <td className="cell-action">
                        <button
                          type="button"
                          className={`progress-toggle${expanded ? " is-open" : ""}`}
                          aria-expanded={expanded}
                          aria-controls={expanded ? panelId : undefined}
                          aria-label={`${expanded ? "Hide" : "View"} progress details for ${site.name}`}
                          onClick={() => setExpandedId(expanded ? null : site.id)}
                        >
                          <Activity size={14} aria-hidden="true" />
                          <span className="progress-toggle-long">{expanded ? "Hide" : "View progress"}</span>
                          <span className="progress-toggle-short" aria-hidden="true">{expanded ? "Hide" : "Details"}</span>
                          <ChevronDown size={14} className="progress-toggle-chevron" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="register-detail-row">
                        <td colSpan={columns.length}>
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                            style={{ overflow: "hidden" }}
                          >
                            <ProjectProgressPanel site={site} asOf={asOf} id={panelId} />
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="site-grid">
          {visible.map((site, index) => (
            <div key={site.id}><SiteCard site={site} showImage={showImages} priority={index === 0} /></div>
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav className="pager" aria-label="Project pages">
          <span>Showing {start + 1}–{start + visible.length} of {sorted.length}</span>
          <div>
            <button type="button" className="icon-toggle" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0} aria-label="Previous page"><ChevronLeft size={16} /></button>
            <span className="pager-index">Page {currentPage + 1} of {pageCount}</span>
            <button type="button" className="icon-toggle" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1} aria-label="Next page"><ChevronRight size={16} /></button>
          </div>
        </nav>
      )}
    </div>
  );
}
