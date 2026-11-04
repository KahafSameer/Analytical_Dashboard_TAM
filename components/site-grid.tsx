"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, Check, ChevronDown, FileUp, LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import type { Site } from "@/lib/types";
import { readImportedSites, parseExcelWorkbook, saveImportedSites } from "@/lib/excel";
import { EmptyState } from "@/components/ui";
import { SiteCard } from "@/components/site-card";

type SortKey = "progress" | "recent" | "name" | "status";

function subscribeToImportedSites(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("tourism-insights:imported-sites", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("tourism-insights:imported-sites", onChange);
  };
}

function getImportedSitesSnapshot() {
  try {
    return window.localStorage.getItem("tourism-insights:imported-sites") ?? "[]";
  } catch {
    return "[]";
  }
}

export function SiteGrid({ initialSites }: { initialSites: Site[] }) {
  const query = useSearchParams();
  const [search, setSearch] = useState(query.get("q") ?? "");
  const [region, setRegion] = useState("All regions");
  const [category, setCategory] = useState("All categories");
  const [status, setStatus] = useState("All progress");
  const [progressRange, setProgressRange] = useState("Any progress");
  const [sort, setSort] = useState<SortKey>("progress");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const importedSnapshot = useSyncExternalStore(subscribeToImportedSites, getImportedSitesSnapshot, () => "[]");
  const imported = useMemo(() => {
    try {
      return JSON.parse(importedSnapshot) as Site[];
    } catch {
      return [];
    }
  }, [importedSnapshot]);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importNotice, setImportNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
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
    const combined = [...initialSites, ...imported];
    const needle = search.trim().toLowerCase();
    const filtered = combined.filter((site) => {
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
      if (sort === "recent") {
        const dateDifference = Date.parse(b.sourceUpdated ?? "") - Date.parse(a.sourceUpdated ?? "");
        return (Number.isNaN(dateDifference) ? 0 : dateDifference) || Number(b.imported) - Number(a.imported);
      }
      return b.overallProgress - a.overallProgress;
    });
  }, [category, imported, initialSites, progressRange, region, search, sort, status]);

  async function importWorkbook(file?: File) {
    if (!file) return;
    setImporting(true);
    setImportError("");
    setImportNotice("");
    let parsed: Site[];
    try {
      parsed = await parseExcelWorkbook(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setImportError(message === "unsupported-format"
        ? "Choose an Excel workbook in .xlsx or .xls format."
        : message === "file-too-large"
          ? "This workbook is larger than 20 MB. Choose a smaller file."
          : "We couldn’t find project rows in this workbook. Check the first sheet and try again.");
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    try {
      const sourceCodes = new Set(initialSites.map((site) => site.code).filter(Boolean));
      const sourceNames = new Set(initialSites.map((site) => site.name.trim().toLowerCase()));
      const additions = parsed.filter((item) =>
        (!item.code || !sourceCodes.has(item.code)) && !sourceNames.has(item.name.trim().toLowerCase()),
      );
      if (!additions.length) {
        setImportNotice("All projects in this workbook are already in the portfolio.");
        return;
      }
      const saved = [
        ...readImportedSites().filter((old) => !additions.some((item) => item.id === old.id)),
        ...additions,
      ];
      saveImportedSites(saved);
      setImportNotice(`${additions.length} project${additions.length === 1 ? "" : "s"} added from ${file.name}`);
    } catch {
      setImportError("Projects were read, but couldn’t be saved in this browser. Check available storage and try again.");
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const regions = [...new Set([...initialSites, ...imported].map((site) => site.region))].sort();
  const categories = [...new Set([...initialSites, ...imported].map((site) => site.category))].sort();
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
              <option value="progress">Most progress</option><option value="recent">Recently updated</option><option value="name">Name A–Z</option><option value="status">Status</option>
            </select><ChevronDown size={13} />
          </label>
          <button className="button button-outline import-button" onClick={() => inputRef.current?.click()} disabled={importing}>
            {importing ? <LoaderCircle size={16} className="spin" /> : <FileUp size={16} />}
            <span>{importing ? "Reading…" : "Import Excel"}</span>
          </button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="sr-only" onChange={(event) => void importWorkbook(event.target.files?.[0])} />
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
      {importError && <p className="inline-alert" role="alert">{importError}</p>}
      {importNotice && <p className="inline-success" role="status"><Check size={15} />{importNotice}</p>}
      <div className="results-meta"><span><strong>{items.length}</strong> projects</span><span>Amounts shown in PKR millions</span></div>
      {items.length > 0 ? (
        <div className="site-grid">{items.map((site, index) => <SiteCard site={site} key={site.id} priority={index === 0} />)}</div>
      ) : (
        <EmptyState title="No projects match your search" description="Try another project name, district or category, or clear your filters." action={<button className="button button-outline" onClick={() => { setSearch(""); setRegion("All regions"); setCategory("All categories"); setStatus("All progress"); setProgressRange("Any progress"); }}>Clear search & filters</button>} />
      )}
    </>
  );
}
