"use client";

import { useState } from "react";
import { Check, Download } from "lucide-react";
import type { Site } from "@/lib/types";
import { serializeCsv } from "@/lib/csv";
import { getUnspentRelease } from "@/lib/portfolio-filters";

export function PortfolioExportButton({ sites, filtered = false }: { sites: Site[]; filtered?: boolean }) {
  const [exported, setExported] = useState(false);

  function exportPortfolio() {
    const rows: (string | number)[][] = [
      ["Project code", "Project", "District", "Project type", "Approved cost (PKR m)", "Allocated (PKR m)", "Released (PKR m)", "Utilized (PKR m)", "Unspent release (PKR m)", "Financial progress (%)"],
      ...sites.map((site) => [
        site.code ?? "",
        site.name,
        site.district,
        site.category,
        site.approvedCost,
        site.allocated,
        site.released,
        site.utilized,
        Number(getUnspentRelease(site).toFixed(2)),
        Number((site.overallProgress * 100).toFixed(2)),
      ]),
    ];
    const csv = serializeCsv(rows);
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filtered ? "punjab-tourism-portfolio-filtered.csv" : "punjab-tourism-portfolio.csv";
    link.click();
    URL.revokeObjectURL(url);
    setExported(true);
    window.setTimeout(() => setExported(false), 2500);
  }

  return (
    <button className="button button-outline portfolio-export-button" onClick={exportPortfolio}>
      {exported ? <Check size={14} /> : <Download size={14} />}
      <span>{exported ? "Downloaded" : filtered ? "Export selection" : "Export portfolio"}</span>
    </button>
  );
}
