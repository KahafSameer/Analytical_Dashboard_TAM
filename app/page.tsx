import { Suspense } from "react";
import { SitesOverview } from "@/components/sites-overview";
import { DataSourceError, NoProjectsState } from "@/components/data-source-state";
import { getMasterWorkbook } from "@/lib/site-repository";
import type { WorkbookResult } from "@/lib/excel";

export default function HomePage() {
  let workbook: WorkbookResult;
  try {
    workbook = getMasterWorkbook();
  } catch {
    return <DataSourceError />;
  }

  if (!workbook.sites.length) return <NoProjectsState />;

  return (
    <Suspense fallback={<div className="loading-page">Loading portfolio…</div>}>
      <>
        {workbook.skippedRows > 0 && (
          <p className="inline-alert" role="status">
            {workbook.skippedRows} non-empty row{workbook.skippedRows === 1 ? " was" : "s were"} skipped because no valid project name was found.
          </p>
        )}
        <SitesOverview sites={workbook.sites} />
      </>
    </Suspense>
  );
}
