"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useDashboardData } from "@/components/dashboard-data-provider";

export function DataSourceError({ message }: { message?: string }) {
  const { refresh, isRefreshing } = useDashboardData();
  return (
    <div className="detail-error" role="alert">
      <span className="empty-icon"><AlertCircle size={22} /></span>
      <h1>Google Sheets data unavailable</h1>
      <p>{message ?? "The project data could not be loaded. Check the spreadsheet settings and try again."}</p>
      <button className="button button-primary" onClick={() => void refresh()} disabled={isRefreshing}>
        <RefreshCw size={15} className={isRefreshing ? "spin" : ""} /> {isRefreshing ? "Updating…" : "Retry"}
      </button>
    </div>
  );
}

export function NoProjectsState() {
  return (
    <div className="empty-state" role="status">
      <span className="empty-icon"><AlertCircle size={22} /></span>
      <h3>No projects found in the Google Sheet</h3>
      <p>Add rows with a supported project name to the spreadsheet’s first worksheet.</p>
    </div>
  );
}
