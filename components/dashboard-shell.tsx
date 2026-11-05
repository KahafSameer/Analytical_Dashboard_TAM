"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { DashboardDataProvider, useDashboardData } from "@/components/dashboard-data-provider";
import { AssistantWidget } from "@/components/assistant/assistant-widget";
import {
  Activity,
  BarChart3,
  Command,
  FileText,
  LayoutDashboard,
  Menu,
  Settings2,
  Table2,
  X,
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Analytics", href: "/#portfolio-analytics", icon: BarChart3 },
  { label: "Project register", href: "/#sites", icon: Table2 },
  { label: "Export", href: "/#report-export", icon: FileText },
];

export function DashboardShell({ children, siteCount }: { children: React.ReactNode; siteCount: number }) {
  return (
    <DashboardDataProvider>
      <DashboardShellContent siteCount={siteCount}>{children}</DashboardShellContent>
    </DashboardDataProvider>
  );
}

function DashboardShellContent({ children, siteCount }: { children: React.ReactNode; siteCount: number }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const { data } = useDashboardData();
  const currentSiteCount = data?.sites.length ?? siteCount;

  return (
    <MotionConfig reducedMotion="user">
    <div className="app-shell">
      <button type="button" className={`mobile-scrim${drawerOpen ? " is-open" : ""}`} aria-label="Close navigation" tabIndex={drawerOpen ? 0 : -1} onClick={() => setDrawerOpen(false)} />
      <aside id="primary-navigation" className={`sidebar${drawerOpen ? " sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <Link href="/" className="brand-link" aria-label="Fieldnotes home" onClick={() => setDrawerOpen(false)}>
            <span className="brand-mark"><Command size={18} strokeWidth={2.2} /></span>
            <span className="brand-copy"><strong>Fieldnotes</strong><small>TOURISM INTELLIGENCE</small></span>
          </Link>
          <button type="button" className="drawer-close" aria-label="Close navigation" onClick={() => setDrawerOpen(false)}><X size={19} /></button>
        </div>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : href.includes("sites") && pathname.startsWith("/sites");
            return (
              <Link
                href={href}
                key={label}
                className={`nav-link${active ? " nav-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setDrawerOpen(false)}
              >
                {active && <motion.span className="nav-active-indicator" layoutId="sidebar-active-indicator" transition={{ duration: reduceMotion ? 0.12 : 0.3, ease: [0.22, 1, 0.36, 1] }} />}
                <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
                {label === "Project register" && <span className="nav-count">{currentSiteCount}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-region">
            <span className="region-indicator" />
            <div><strong>Tourism portfolio</strong><small>{currentSiteCount} projects in source</small></div>
          </div>
          <button className="profile-button" onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen}>
            <span className="avatar">PT</span>
            <span className="profile-copy"><strong>Tourism Dept.</strong><small>Portfolio viewer</small></span>
            <Settings2 size={16} className="profile-settings" />
          </button>
          <AnimatePresence>
          {settingsOpen && (
            <motion.div
              className="profile-popover"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 5, scale: reduceMotion ? 1 : 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : 4, scale: reduceMotion ? 1 : 0.98 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <strong>Prototype workspace</strong>
              <span>Source: Google Sheets</span>
              <span>Currency: Pakistani rupees (millions)</span>
            </motion.div>
          )}
          </AnimatePresence>
          <div className="sidebar-version">FIELDNOTES <span>PREVIEW 1.0</span></div>
        </div>
      </aside>

      <div className="main-column">
        <header className="mobile-header">
          <button className="icon-button mobile-menu-button" onClick={() => setDrawerOpen(true)} aria-label="Open navigation" aria-expanded={drawerOpen} aria-controls="primary-navigation"><Menu size={20} /></button>
          <Link href="/" className="mobile-brand"><span className="brand-mark"><Command size={15} /></span>Fieldnotes</Link>
          <span className="mobile-header-meta">Punjab</span>
        </header>
        <motion.main
          className="main-content"
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.34, ease: [0.22, 1, 0.36, 1] }}
        >{children}</motion.main>
      </div>
    </div>
    <AssistantWidget />
    </MotionConfig>
  );
}

export function PageTopline({ section, date = "Google Sheets" }: { section: string; date?: string }) {
  const { data, isRefreshing, error } = useDashboardData();
  const freshness = useFreshnessLabel(data?.fetchedAt);
  return (
    <div className="page-topline">
      <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{section}</strong></div>
      <div className={`topline-meta${error ? " topline-meta-stale" : ""}`} title={error ?? undefined}>
        <Activity size={14} />
        <span>{error ? "Refresh failed · showing last data" : isRefreshing ? "Updating…" : freshness ? `Updated ${freshness}` : `Data source · ${date}`}</span>
      </div>
    </div>
  );
}

function useFreshnessLabel(fetchedAt?: string) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const initialUpdate = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 15_000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(timer);
    };
  }, []);
  if (!fetchedAt) return null;
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(fetchedAt).getTime()) / 1000));
  if (elapsedSeconds < 10) return "just now";
  if (elapsedSeconds < 60) return `${elapsedSeconds} seconds ago`;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  return `${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
}
