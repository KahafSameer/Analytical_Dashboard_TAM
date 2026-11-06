/**
 * Guided tour: step definitions and the pure geometry used to place the spotlight and the
 * explanation box. The browser-side engine is components/product-tour.tsx. Targets are
 * `[data-tour="…"]` attributes on the components, so styling changes do not break the tour.
 */

export type TourStep = {
  id: string;
  /** Element to highlight (CSS selector); omit for a centred message. */
  target?: string;
  /** Selector to use on phones instead (e.g. the menu button for sidebar items). */
  phoneTarget?: string;
  /** Element to scroll to first when the target is only rendered once it is near the screen. */
  scrollHint?: string;
  title: string;
  body: string;
};

const tour = (name: string) => `[data-tour="${name}"]`;

export const OVERVIEW_TOUR: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome! Here's a 1-minute tour",
    body: "This dashboard follows the money for Punjab's tourism projects: how much each project was given and how much it has spent. Use Next (or the → key) to continue, or Skip at any time.",
  },
  {
    id: "filters",
    target: tour("filters"),
    title: "Find what you need",
    body: "Search by project name, code or district, or pick a filter. Every number and chart on the page then shows only the projects you chose.",
  },
  {
    id: "in-short",
    target: tour("in-short"),
    title: "The story in plain words",
    body: "This box sums up the numbers below in simple sentences. It updates whenever you change the filters.",
  },
  {
    id: "kpis",
    target: tour("kpis"),
    title: "The key numbers",
    body: "The headline figures at a glance. Tap the ⓘ next to any number to see what it means.",
  },
  {
    id: "register-row",
    target: tour("register-row"),
    scrollHint: "#sites",
    title: "One row per project",
    body: "Each row shows a project's budget, how much it has spent and a small chart of its money by year: gold = set aside, blue = handed over, green = spent.",
  },
  {
    id: "view-progress",
    target: tour("view-progress"),
    scrollHint: "#sites",
    title: "See a project's progress",
    body: "This button opens a quick breakdown right here — money flow, years and schedule. Select the project's name instead to open its full page.",
  },
  {
    id: "pipeline",
    target: tour("pipeline"),
    scrollHint: "#portfolio-analytics",
    title: "Where the money is",
    body: "Follow the money step by step: the approved budget, the part set aside, the part handed over and what was finally spent.",
  },
  {
    id: "district-chart",
    target: tour("district-chart"),
    scrollHint: '[data-tour-anchor="analytics"]',
    title: "Explore the charts",
    body: "Select a district's bar to show only that district on the whole page. Every chart has an ⓘ button that explains how to read it.",
  },
  {
    id: "schedule",
    target: tour("schedule-gap"),
    scrollHint: "#schedule",
    title: "Is spending on time?",
    body: "Compares how much of each project's planned time has passed with how much money it has spent. Orange means something needs a closer look.",
  },
  {
    id: "page-actions",
    target: tour("page-actions"),
    title: "Share, save or replay",
    body: "Share this view on WhatsApp or by email, or save it as a PDF — shared links keep your filters. You can restart this tour from here too.",
  },
  {
    id: "assistant",
    target: tour("assistant"),
    title: "Ask the AI Assistant",
    body: "Ask anything in English or Urdu — for example \"Which district has spent the most?\" or \"Explain this dashboard in simple words\".",
  },
  {
    id: "guide",
    target: tour("guide-link"),
    phoneTarget: tour("menu"),
    title: "Need more help?",
    body: "The \"How to read\" guide in the menu explains every word and color on the dashboard. That's the tour — enjoy exploring!",
  },
];

export const PROJECT_TOUR: TourStep[] = [
  {
    id: "project-hero",
    target: tour("project-hero"),
    title: "This project",
    body: "Its name, place and planned dates, and how much of its budget has been spent so far.",
  },
  {
    id: "project-in-short",
    target: tour("in-short"),
    title: "In plain words",
    body: "A short summary of this project's money and schedule, written in everyday language.",
  },
  {
    id: "project-kpis",
    target: tour("project-kpis"),
    title: "Key numbers",
    body: "The approved budget, the money handed over and the money spent. Tap ⓘ for what each one means.",
  },
  {
    id: "project-years",
    target: tour("project-years"),
    title: "Money by budget year",
    body: "How much was set aside, handed over and spent in each budget year (July to June), with the exact numbers next to the chart.",
  },
  {
    id: "project-schedule",
    target: tour("project-schedule"),
    title: "Time passed vs money spent",
    body: "Where the project is in its planned period, compared with how much of its budget has been spent.",
  },
  {
    id: "project-compare",
    target: tour("project-compare"),
    title: "How it compares",
    body: "This project next to the average of its district and of all projects.",
  },
  {
    id: "related",
    target: tour("related"),
    title: "Related projects",
    body: "Other projects in the same district. Select one to open it.",
  },
  {
    id: "project-actions",
    target: tour("project-actions"),
    title: "Share, save or replay",
    body: "Share this project on WhatsApp or by email, save it as a PDF, or take this tour again. That's it — enjoy exploring!",
  },
];

export type Rect = { top: number; left: number; width: number; height: number };
export type Size = { width: number; height: number };
export type Placement = "bottom" | "top" | "right" | "left" | "center";

/**
 * Where to put the explanation box next to a highlighted element: below, above, right or left
 * (first that fits), else over the lower part of the screen. Always kept inside the viewport.
 */
export function placeTooltip(target: Rect | null, box: Size, viewport: Size, gap = 14, edge = 12): { top: number; left: number; placement: Placement } {
  const clampX = (x: number) => Math.min(Math.max(edge, x), Math.max(edge, viewport.width - box.width - edge));
  const clampY = (y: number) => Math.min(Math.max(edge, y), Math.max(edge, viewport.height - box.height - edge));
  if (!target) return { top: clampY((viewport.height - box.height) / 2), left: clampX((viewport.width - box.width) / 2), placement: "center" };
  const bottom = target.top + target.height;
  const right = target.left + target.width;
  const centredLeft = target.left + target.width / 2 - box.width / 2;
  const centredTop = target.top + target.height / 2 - box.height / 2;
  if (viewport.height - bottom - gap >= box.height + edge) return { top: bottom + gap, left: clampX(centredLeft), placement: "bottom" };
  if (target.top - gap >= box.height + edge) return { top: target.top - gap - box.height, left: clampX(centredLeft), placement: "top" };
  if (viewport.width - right - gap >= box.width + edge) return { top: clampY(centredTop), left: right + gap, placement: "right" };
  if (target.left - gap >= box.width + edge) return { top: clampY(centredTop), left: target.left - gap - box.width, placement: "left" };
  // A large target leaves no room beside it: sit over its lower part, still on screen.
  return { top: clampY(viewport.height - box.height - edge * 2), left: clampX(centredLeft), placement: "center" };
}

/** The highlighted area: the target plus padding, clipped to the visible screen. */
export function spotlightRect(target: Rect, viewport: Size, pad = 8, inset = 6): Rect {
  const top = Math.max(target.top - pad, inset);
  const left = Math.max(target.left - pad, inset);
  const bottom = Math.min(target.top + target.height + pad, viewport.height - inset);
  const right = Math.min(target.left + target.width + pad, viewport.width - inset);
  return { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

/**
 * Page scroll position that brings a target into a good spot: centred with room for the box on
 * desktop, or near the top on phones (where the box is a sheet at the bottom of the screen).
 */
export function targetScrollTop(target: Rect, scrollY: number, viewport: Size, phone: boolean, headerHeight = 0): number {
  let desiredTop: number;
  if (phone) {
    const free = viewport.height * 0.52 - headerHeight;
    desiredTop = headerHeight + 12 + Math.max(0, (free - target.height) / 2);
  } else {
    const room = viewport.height - target.height;
    desiredTop = room > 260 ? room / 2 - 70 : 72;
  }
  return Math.max(0, Math.round(scrollY + target.top - desiredTop));
}
