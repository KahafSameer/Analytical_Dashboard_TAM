import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard-shell";
import { getSites } from "@/lib/site-repository";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fieldnotes — Tourism Intelligence",
  description: "A clear view of tourism and heritage project funding across Punjab.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let siteCount = 0;
  try {
    siteCount = getSites().length;
  } catch {
    // The route renders a data-source error state if the master workbook is unavailable.
  }

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body suppressHydrationWarning><DashboardShell siteCount={siteCount}>{children}</DashboardShell></body>
    </html>
  );
}
