import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fieldnotes — Tourism Intelligence",
  description: "A clear view of tourism and heritage project funding across Punjab.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body suppressHydrationWarning><DashboardShell siteCount={0}>{children}</DashboardShell></body>
    </html>
  );
}
