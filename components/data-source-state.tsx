"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";

export function DataSourceError() {
  const router = useRouter();
  return (
    <div className="detail-error" role="alert">
      <span className="empty-icon"><AlertCircle size={22} /></span>
      <h1>Master workbook unavailable</h1>
      <p>The project data could not be read. Check the master Excel workbook and its column headers, then retry.</p>
      <button className="button button-primary" onClick={() => router.refresh()}>
        <RefreshCw size={15} /> Retry
      </button>
    </div>
  );
}

export function NoProjectsState() {
  return (
    <div className="empty-state" role="status">
      <span className="empty-icon"><AlertCircle size={22} /></span>
      <h3>No projects found in the master workbook</h3>
      <p>Add rows with a project name to the workbook’s first worksheet and restart or rebuild the application.</p>
    </div>
  );
}
