import type { FiscalYear, Site } from "@/lib/types";

export type CumulativeFunding = {
  label: string;
  allocation: number;
  released: number;
  utilized: number;
};

export function getCumulativeFunding(site: Site): CumulativeFunding[] {
  let allocation = 0;
  let released = 0;
  let utilized = 0;

  return site.fiscalYears.map((year: FiscalYear) => {
    allocation += year.allocation;
    released += year.release;
    utilized += year.utilized;
    return { label: year.label, allocation, released, utilized };
  });
}

export function getFiscalYearRates(site: Site) {
  return site.fiscalYears
    .filter((year) => year.allocation > 0)
    .map((year) => ({
      label: year.label,
      allocation: year.allocation,
      release: year.release,
      utilized: year.utilized,
      releaseRate: (year.release / year.allocation) * 100,
      utilizationRate: (year.utilized / year.allocation) * 100,
    }));
}

export function getAllocationComposition(site: Site) {
  const utilizedWithinAllocation = Math.min(site.utilized, site.allocated);
  const unspentAllocation = Math.max(site.allocated - site.utilized, 0);
  const spendingAboveAllocation = Math.max(site.utilized - site.allocated, 0);

  return [
    { name: "Spent", value: utilizedWithinAllocation, color: "#1f7a55" },
    { name: "Set aside, not spent yet", value: unspentAllocation, color: "#dce8df" },
    { name: "Spent above the amount set aside", value: spendingAboveAllocation, color: "#d08a12" },
  ].filter((segment) => segment.value > 0);
}
