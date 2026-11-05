"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, LayoutGrid, Rows3 } from "lucide-react";
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

type View = "table" | "cards";

const columns: { key: ProjectSortKey; label: string; numeric?: boolean; className?: string }[] = [
  { key: "name", label: "Project" },
  { key: "district", label: "District", className: "col-district" },
  { key: "approvedCost", label: "Approved", numeric: true },
  { key: "released", label: "Released", numeric: true, className: "col-released" },
  { key: "utilized", label: "Utilized", numeric: true },
  { key: "unspentRelease", label: "Unspent release", numeric: true, className: "col-unspent" },
  { key: "overallProgress", label: "Progress", numeric: true },
];

const sortLabels: Record<ProjectSortKey, string> = {
  name: "Name",
  district: "District",
  approvedCost: "Approved cost",
  released: "Released",
  utilized: "Utilized",
  unspentRelease: "Unspent release",
  overallProgress: "Financial progress",
};

const PAGE_SIZE: Record<View, number> = { table: 15, cards: 12 };
/** Amounts below this round to "0.0" at one decimal, so they are shown as a dash instead. */
const MIN_DISPLAYED_AMOUNT = 0.05;

function amount(value: number) {
  return value.toLocaleString("en-PK", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function ProjectRegister({ sites }: { sites: Site[] }) {
  const [view, setView] = useState<View>("table");
  const [sortKey, setSortKey] = useState<ProjectSortKey>("overallProgress");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(0);
  // Return to the first page when filters change the result set, but not on background refreshes.
  const membership = sites.map((site) => site.id).join("|");
  const [previousMembership, setPreviousMembership] = useState(membership);
  if (membership !== previousMembership) {
    setPreviousMembership(membership);
    setPage(0);
  }

  const sorted = useMemo(() => sortSites(sites, sortKey, direction), [direction, sites, sortKey]);
  const showImages = useMemo(() => new Set(sites.map((site) => site.image)).size > 1, [sites]);
  const pageSize = PAGE_SIZE[view];
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
        <span className="register-count"><strong>{sites.length}</strong> project{sites.length === 1 ? "" : "s"} · amounts in PKR millions</span>
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
                  const active = column.key === sortKey;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      className={`${column.numeric ? "num " : ""}${column.className ?? ""}`}
                      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <button type="button" className={`th-sort${active ? " is-active" : ""}`} onClick={() => changeSort(column.key)}>
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
                return (
                  <tr key={site.id}>
                    <th scope="row" className="cell-project">
                      <Link href={`/sites/${site.id}`}>{site.name}</Link>
                      <span className="cell-sub">
                        {site.code ? `#${site.code}` : "No code"}
                        {site.utilized === 0 && <StatusBadge status="No spend yet" tone="gold" />}
                      </span>
                    </th>
                    <td className="col-district">{site.district}</td>
                    <td className="num">{amount(site.approvedCost)}</td>
                    <td className="num col-released">{amount(site.released)}</td>
                    <td className="num">{amount(site.utilized)}</td>
                    <td className={`num col-unspent${unspent >= MIN_DISPLAYED_AMOUNT ? " is-attention" : ""}`}>{unspent >= MIN_DISPLAYED_AMOUNT ? amount(unspent) : "—"}</td>
                    <td className="num cell-progress">
                      <span className="mini-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, site.overallProgress * 100)}%` }} /></span>
                      <span>{formatPercent(site.overallProgress)}</span>
                    </td>
                  </tr>
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
