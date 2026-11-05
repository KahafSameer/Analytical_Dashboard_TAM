"use client";

import { useEffect, useRef } from "react";
import { Filter, Search, X } from "lucide-react";
import {
  ALL_DISTRICTS,
  DEFAULT_FILTERS,
  activityOptions,
  countActiveFilters,
  progressRangeOptions,
  type ActivityFilter,
  type PortfolioFilters,
  type ProgressRangeFilter,
} from "@/lib/portfolio-filters";

export function PortfolioFilterBar({
  filters,
  onChange,
  districts,
  matchCount,
  totalCount,
}: {
  filters: PortfolioFilters;
  onChange: (filters: PortfolioFilters) => void;
  districts: string[];
  matchCount: number;
  totalCount: number;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const activeCount = countActiveFilters(filters);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const update = <K extends keyof PortfolioFilters>(key: K, value: PortfolioFilters[K]) => onChange({ ...filters, [key]: value });

  return (
    <section className="filter-bar" aria-label="Portfolio filters">
      <div className="filter-bar-row">
        <div className="site-search-wrap">
          <Search size={17} />
          <input
            ref={searchRef}
            type="search"
            aria-label="Search projects"
            placeholder="Search project, code or district"
            value={filters.search}
            onChange={(event) => update("search", event.target.value)}
          />
          {filters.search
            ? <button type="button" className="search-clear" onClick={() => update("search", "")} aria-label="Clear search"><X size={15} /></button>
            : <kbd>Ctrl K</kbd>}
        </div>
        <label className="filter-field">
          <span>District</span>
          <select value={filters.district} onChange={(event) => update("district", event.target.value)}>
            <option value={ALL_DISTRICTS}>All districts</option>
            {districts.map((district) => <option value={district} key={district}>{district}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Spend status</span>
          <select value={filters.activity} onChange={(event) => update("activity", event.target.value as ActivityFilter)}>
            {activityOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Financial progress</span>
          <select value={filters.progress} onChange={(event) => update("progress", event.target.value as ProgressRangeFilter)}>
            {progressRangeOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
          </select>
        </label>
      </div>
      <div className="filter-bar-status" role="status" aria-live="polite">
        <span>
          <Filter size={13} />
          {activeCount
            ? <>Showing <strong>{matchCount}</strong> of {totalCount} projects · every figure below reflects this selection</>
            : <>All <strong>{totalCount}</strong> projects · filters apply to every figure on this page</>}
        </span>
        {activeCount > 0 && (
          <button type="button" className="filter-reset" onClick={() => onChange(DEFAULT_FILTERS)}>
            <X size={13} /> Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
          </button>
        )}
      </div>
    </section>
  );
}
