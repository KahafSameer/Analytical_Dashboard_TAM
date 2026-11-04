"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import type { Site } from "@/lib/types";
import { EmptyState } from "@/components/ui";
import { SiteCard } from "@/components/site-card";

type SortKey = "progress" | "name" | "status";

export function SiteGrid({ initialSites }: { initialSites: Site[] }) {
  const query = useSearchParams();
  const [search, setSearch] = useState(query.get("q") ?? "");
  const [region, setRegion] = useState("All regions");
  const [category, setCategory] = useState("All categories");
  const [status, setStatus] = useState("All progress");
  const [progressRange, setProgressRange] = useState("Any progress");
  const [sort, setSort] = useState<SortKey>("progress");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const items = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = initialSites.filter((site) => {
      const matchesSearch = !needle || [site.name, site.district, site.category, site.description, site.code]
        .some((value) => value?.toLowerCase().includes(needle));
      const matchesRegion = region === "All regions" || site.region === region;
      const matchesCategory = category === "All categories" || site.category === category;
      const matchesStatus = status === "All progress"
        || (status === "Spend recorded" ? site.utilized > 0 : site.utilized === 0);
      const progress = site.overallProgress * 100;
      const matchesRange = progressRange === "Any progress"
        || (progressRange === "0–25%" && progress < 25)
        || (progressRange === "25–50%" && progress >= 25 && progress < 50)
        || (progressRange === "50–75%" && progress >= 50 && progress < 75)
        || (progressRange === "75–100%" && progress >= 75);
      return matchesSearch && matchesRegion && matchesCategory && matchesStatus && matchesRange;
    });
    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "status") return Number(a.utilized === 0) - Number(b.utilized === 0);
      return b.overallProgress - a.overallProgress;
    });
  }, [category, initialSites, progressRange, region, search, sort, status]);

  const regions = [...new Set(initialSites.map((site) => site.region))].sort();
  const categories = [...new Set(initialSites.map((site) => site.category))].sort();
  const filterCount = [
    region !== "All regions",
    category !== "All categories",
    status !== "All progress",
    progressRange !== "Any progress",
  ].filter(Boolean).length;

  return (
    <>
      <div className="sites-toolbar">
        <div className="site-search-wrap">
          <Search size={17} />
          <input
            ref={searchRef}
            aria-label="Search projects"
            placeholder="Search projects, districts or categories"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}
          {!search && <kbd>Ctrl K</kbd>}
        </div>
        <div className="toolbar-actions">
          <button className={`filter-button${filterCount ? " filter-button-active" : ""}`} onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
            <SlidersHorizontal size={16} /> Filters {filterCount > 0 && <span className="filter-count">{filterCount}</span>}
          </button>
          <label className="sort-select-wrap"><ArrowDownWideNarrow size={15} />
            <select aria-label="Sort projects" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
              <option value="progress">Most progress</option><option value="name">Name A–Z</option><option value="status">Status</option>
            </select><ChevronDown size={13} />
          </label>
        </div>
      </div>
      {filtersOpen && (
        <div className="filter-panel">
          <label className="filter-field">Region<select value={region} onChange={(event) => setRegion(event.target.value)}><option>All regions</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="filter-field">Project type<select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="filter-field">Financial activity<select value={status} onChange={(event) => setStatus(event.target.value)}><option>All progress</option><option>Spend recorded</option><option>No spend yet</option></select></label>
          <label className="filter-field">Financial progress<select value={progressRange} onChange={(event) => setProgressRange(event.target.value)}><option>Any progress</option><option>0–25%</option><option>25–50%</option><option>50–75%</option><option>75–100%</option></select></label>
          {filterCount > 0 && <button className="filter-reset" onClick={() => { setRegion("All regions"); setCategory("All categories"); setStatus("All progress"); setProgressRange("Any progress"); }}>Clear filters</button>}
        </div>
      )}
      <div className="results-meta"><span><strong>{items.length}</strong> projects</span><span>Amounts shown in PKR millions</span></div>
      {items.length > 0 ? (
        <div className="site-grid">{items.map((site, index) => <SiteCard site={site} key={site.id} priority={index === 0} />)}</div>
      ) : (
        <EmptyState title="No projects match your search" description="Try another project name, district or category, or clear your filters." action={<button className="button button-outline" onClick={() => { setSearch(""); setRegion("All regions"); setCategory("All categories"); setStatus("All progress"); setProgressRange("Any progress"); }}>Clear search & filters</button>} />
      )}
    </>
  );
}
