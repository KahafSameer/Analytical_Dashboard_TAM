"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DashboardData } from "@/lib/types";

type DashboardDataContextValue = {
  data: DashboardData | null;
  isRefreshing: boolean;
  error: string | null;
  setData: (data: DashboardData) => void;
  setError: (message: string | null) => void;
  refresh: () => Promise<void>;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);
const REFRESH_INTERVAL_MS = 30_000;

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<DashboardData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestInFlight = useRef(false);

  const setData = useCallback((nextData: DashboardData) => {
    setDataState(nextData);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setIsRefreshing(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/dashboard-data", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("refresh-failed");
      const nextData = await response.json() as DashboardData;
      if (!Array.isArray(nextData.sites) || nextData.sites.length === 0 || !Array.isArray(nextData.sourceHeaders) || !nextData.fetchedAt) {
        throw new Error("invalid-refresh-payload");
      }
      setDataState(nextData);
      setError(null);
    } catch {
      setError("Unable to refresh data. Showing last available data.");
    } finally {
      window.clearTimeout(timeout);
      requestInFlight.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const value = { data, isRefreshing, error, setData, setError, refresh };
  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (!context) throw new Error("useDashboardData must be used inside DashboardDataProvider");
  return context;
}
