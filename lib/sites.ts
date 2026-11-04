import sourceSites from "@/data/sites.json";
import type { Site } from "@/lib/types";

type SourceSite = Omit<Site, "category" | "image">;

const imagery: Record<string, string> = {
  Heritage: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1100&q=85",
  "Culture & museums": "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1100&q=85",
  "Religious tourism": "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1100&q=85",
  "Eco tourism": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1100&q=85",
  "Adventure tourism": "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1100&q=85",
  "Digital tourism": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1100&q=85",
  "Tourism programs": "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1100&q=85",
  "Visitor infrastructure": "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1100&q=85",
};

function categoryFor(name: string) {
  const text = name.toLowerCase();
  if (/digital|app|portal|mapping|online|website|ithm|it strengthening/.test(text)) return "Digital tourism";
  if (/museum/.test(text)) return "Culture & museums";
  if (/religious|church|temple|mosque|sikh/.test(text)) return "Religious tourism";
  if (/heritage|fort|archaeo|historic|historical|baradari|monument|conservation|preservation|restoration|tomb|walled city|hiran minar|harappa|taxila/.test(text)) return "Heritage";
  if (/eco|forest|nature|lake|wildlife|green tourism/.test(text)) return "Eco tourism";
  if (/adventure|chairlift|chair lift|cable car|glass bridge|sky walk|paraglid|water sport|parasail|speed boat|track|salt range trail/.test(text)) return "Adventure tourism";
  if (/internship|capacity building|management unit|tourism force|business development|training|tourist guide|promotion|branding|marketing|events|strengthening/.test(text)) return "Tourism programs";
  return "Visitor infrastructure";
}

export const sites: Site[] = (sourceSites as SourceSite[]).map((site) => {
  const category = categoryFor(site.name);
  return { ...site, category, image: imagery[category] };
});
