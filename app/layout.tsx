import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard-shell";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const description = "Funding, releases, expenditure and schedules for Punjab's tourism and heritage projects, live from the master Google Sheet.";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: "Fieldnotes — Tourism Intelligence", template: "%s · Fieldnotes" },
  description,
  applicationName: "Fieldnotes",
  openGraph: {
    type: "website",
    siteName: "Fieldnotes — Tourism Intelligence",
    title: "Punjab tourism portfolio",
    description,
    locale: "en_PK",
  },
  twitter: { card: "summary_large_image", title: "Punjab tourism portfolio", description },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body suppressHydrationWarning><DashboardShell siteCount={0}>{children}</DashboardShell></body>
    </html>
  );
}
