"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  BarChart3,
  ChevronDown,
  Command,
  FileText,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  Settings2,
  X,
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Sites & projects", href: "/#sites", icon: PanelLeftClose },
  { label: "Analytics", href: "/#portfolio-analytics", icon: BarChart3 },
  { label: "Reports", href: "/#report-export", icon: FileText },
];

export function DashboardShell({ children, siteCount }: { children: React.ReactNode; siteCount: number }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <MotionConfig reducedMotion="user">
    <div className="app-shell">
      <button type="button" className={`mobile-scrim${drawerOpen ? " is-open" : ""}`} aria-label="Close navigation" tabIndex={drawerOpen ? 0 : -1} onClick={() => setDrawerOpen(false)} />
      <aside id="primary-navigation" className={`sidebar${drawerOpen ? " sidebar-open" : ""}`}>
        <Link href="/" className="brand-lockup" aria-label="Fieldnotes home" onClick={() => setDrawerOpen(false)}>
          <span className="brand-mark"><Command size={18} strokeWidth={2.2} /></span>
          <span className="brand-copy"><strong>Fieldnotes</strong><small>TOURISM INTELLIGENCE</small></span>
          <button className="drawer-close" aria-label="Close navigation" onClick={(event) => { event.preventDefault(); setDrawerOpen(false); }}><X size={19} /></button>
        </Link>

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
                {label === "Sites & projects" && <span className="nav-count">{siteCount}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-region">
            <span className="region-indicator" />
            <div><strong>Tourism portfolio</strong><small>{siteCount} projects in source</small></div>
            <ChevronDown size={14} />
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
              <span>Source: master Excel workbook</span>
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
          initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.34, ease: [0.22, 1, 0.36, 1] }}
        >{children}</motion.main>
      </div>
    </div>
    </MotionConfig>
  );
}

export function PageTopline({ section, date = "Master workbook" }: { section: string; date?: string }) {
  return (
    <div className="page-topline">
      <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{section}</strong></div>
      <div className="topline-meta"><Activity size={14} /><span>Data snapshot · {date}</span></div>
    </div>
  );
}
