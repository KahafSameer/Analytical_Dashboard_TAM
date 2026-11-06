"use client";

import { useEffect } from "react";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { dismissWelcome } from "@/lib/welcome-state";

/**
 * Runs on the guide page: marks the welcome card as seen (the visitor is reading the guide), and
 * loads dashboard data once so the sidebar counts and "Updated …" label are filled in.
 * Kept in its own module so the guide never depends on a newer export of an already-loaded file.
 */
export function GuideVisit() {
  const { data, refresh } = useDashboardData();
  const hasData = Boolean(data);
  useEffect(() => {
    dismissWelcome();
  }, []);
  useEffect(() => {
    if (!hasData) void refresh();
  }, [hasData, refresh]);
  return null;
}
