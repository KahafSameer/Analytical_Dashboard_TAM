export type FiscalYear = {
  label: string;
  allocation: number;
  release: number;
  utilized: number;
};

export type Site = {
  id: string;
  projectId?: string;
  code?: string;
  name: string;
  description: string;
  district: string;
  region: string;
  category: string;
  image: string;
  gestationPeriod?: string;
  approvedCost: number;
  allocated: number;
  released: number;
  utilized: number;
  overallProgress: number;
  currentYearProgress?: number;
  fiscalYears: FiscalYear[];
};

export type AnalyticsSummary = {
  siteCount: number;
  weightedProgress: number;
  utilizationRate: number;
  totalApproved: number;
  totalAllocated: number;
  totalReleased: number;
  totalUtilized: number;
  sitesWithSpend: number;
  awaitingSpend: number;
  meanProgress: number;
};

export type DashboardData = {
  sites: Site[];
  sheetName: string;
  skippedRows: number;
  invalidAmountCount: number;
  fetchedAt: string;
};
