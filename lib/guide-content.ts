import { ATTENTION_COLOR, NEUTRAL_COLOR, SCHEDULE_COLORS, SERIES_COLORS } from "@/lib/chart-theme";

/**
 * Plain-language help shared by the guide page (/guide), the ⓘ tips on charts and KPIs, and the
 * welcome card. Written for someone with no finance background. Keep one source of truth here.
 */

export type GlossaryTerm = {
  id: string;
  term: string;
  /** One sentence, shown in tooltips. */
  short: string;
  /** Extra detail for the guide page. */
  detail?: string;
  example?: string;
};

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: "approved-cost",
    term: "Approved cost",
    short: "The total budget the government approved for the whole project, from start to finish.",
    example: "Approved cost Rs 250.0m means the project may cost up to Rs 250 million (25 crore) in total.",
  },
  {
    id: "allocated",
    term: "Allocated",
    short: "Money set aside for the project in a year's budget.",
    detail: "A project usually gets its approved cost in parts, year by year. The allocation is the part planned for one year.",
  },
  {
    id: "released",
    term: "Released",
    short: "Money the Finance Department has actually handed over to the project.",
    detail: "Allocated money is a plan; released money is in the project's hands and can be spent.",
  },
  {
    id: "spent",
    term: "Spent (utilized)",
    short: "Money the project has actually spent. Official reports call this \"utilized\".",
  },
  {
    id: "not-spent",
    term: "Released but not spent",
    short: "Money handed over to a project that it has not spent yet (released minus spent).",
    detail: "A large amount here is worth a question: the money is available but not being used.",
  },
  {
    id: "financial-progress",
    term: "Financial progress",
    short: "How much of the approved budget has been spent so far (spent ÷ approved cost).",
    detail: "It measures money only. It does not tell how much of the building or work is finished on the ground.",
    example: "Spent Rs 20m of an approved Rs 100m → financial progress 20%.",
  },
  {
    id: "this-year-progress",
    term: "This year's progress",
    short: "How much of this budget year's money the project has spent (reported in the project records as CFY progress).",
  },
  {
    id: "fiscal-year",
    term: "Fiscal (budget) year",
    short: "Pakistan's government budget year runs from 1 July to 30 June.",
    example: "2025–26 means 1 July 2025 to 30 June 2026.",
  },
  {
    id: "rs-millions",
    term: "Rs …m (millions of rupees)",
    short: "All amounts are in millions of rupees: Rs 1m = 10 lakh, Rs 10m = 1 crore, Rs 1,000m = 100 crore.",
    example: "Rs 250.0m = 25 crore rupees. Rs 8,578.6m ≈ 858 crore rupees.",
  },
  {
    id: "planned-period",
    term: "Planned period",
    short: "The project's start date and planned finish date (its \"gestation period\").",
  },
  {
    id: "time-elapsed",
    term: "Time elapsed",
    short: "How much of the planned period has already passed.",
    example: "Half-way between the start and finish dates → 50% of time elapsed.",
  },
  {
    id: "spending-gap",
    term: "Spending gap",
    short: "Time elapsed minus financial progress. A big gap means spending is behind the calendar.",
    detail: "It is a reason to ask questions, not proof that work is delayed: some projects pay most of their bills near the end.",
  },
  {
    id: "punjab-district",
    term: "\"Punjab\" or \"Multiple District\"",
    short: "Projects that cover the whole province or several districts, not one place.",
  },
  {
    id: "dash",
    term: "— (dash)",
    short: "Nothing recorded, or an amount too small to show.",
  },
];

export const GLOSSARY_BY_ID: Record<string, GlossaryTerm> = Object.fromEntries(GLOSSARY.map((term) => [term.id, term]));

export type ColorMeaning = { color: string; name: string; meaning: string; where: string };
export type ColorGroup = { title: string; note?: string; items: ColorMeaning[] };

export const COLOR_GUIDE: ColorGroup[] = [
  {
    title: "The money journey",
    note: "Money moves gold → blue → green: set aside, then handed over, then spent.",
    items: [
      { color: NEUTRAL_COLOR, name: "Light grey", meaning: "Approved cost — the full budget approved", where: "“Where the money is” (first bar)" },
      { color: SERIES_COLORS.allocation, name: "Gold", meaning: "Allocated — money set aside in a year's budget", where: "“Money by budget year”, project mini charts, “Where the money is”" },
      { color: SERIES_COLORS.release, name: "Blue", meaning: "Released — money handed over to the project", where: "“Money by budget year”, project mini charts, “Where the money is”" },
      { color: SERIES_COLORS.utilized, name: "Green", meaning: "Spent — money actually used; also the progress rings and bars", where: "“Money by budget year”, project mini charts, progress rings" },
    ],
  },
  {
    title: "Needs attention",
    items: [
      { color: ATTENTION_COLOR, name: "Orange", meaning: "Worth a look: money handed over but not spent, projects with no spending yet, or a planned finish date that has passed", where: "“Money handed over but not spent”, the “Not spent” column, the “None” bar, schedule charts" },
    ],
  },
  {
    title: "Schedule",
    items: [
      { color: SCHEDULE_COLORS["in-progress"], name: "Green", meaning: "Within its planned period", where: "“When projects are due to finish”, “Project size vs money spent”" },
      { color: SCHEDULE_COLORS["past-end"], name: "Orange", meaning: "Planned finish date has passed", where: "“When projects are due to finish”, “Project size vs money spent”" },
      { color: SCHEDULE_COLORS["not-started"], name: "Blue", meaning: "Not started yet", where: "“Project size vs money spent”" },
      { color: "#8ea0b4", name: "Grey-blue", meaning: "Time passed (shown next to a green bar for money spent)", where: "“Spending behind the calendar”, project page → “Time passed vs money spent”" },
    ],
  },
  {
    title: "Comparing a project",
    items: [
      { color: SERIES_COLORS.utilized, name: "Green", meaning: "This project", where: "Project page → How it compares" },
      { color: SERIES_COLORS.release, name: "Blue", meaning: "Average of its district", where: "Project page → How it compares" },
      { color: NEUTRAL_COLOR, name: "Grey", meaning: "Average of all projects", where: "Project page → How it compares" },
    ],
  },
];

/** Plain "how to read this" text for each chart, keyed by a stable id. */
export const CHART_HELP: Record<string, string> = {
  fiscalYears: "Each group of bars is one budget year (July to June). Gold = money set aside, blue = money handed over, green = money spent. When green is much shorter than blue, released money is still waiting to be spent.",
  pipeline: "Follow the money from top to bottom: the approved budget, the part set aside so far, the part handed over and the part spent. The small arrows show what share moved on to the next step.",
  districtFunding: "A longer bar means more money. Use the menu to switch between approved, allocated, released and spent. Select a bar to show only that district on the whole page.",
  concentration: "Shows how much of the total budget belongs to the biggest projects. When a few projects hold most of the money, their progress matters most.",
  heatmap: "Each row is a district and each column a budget year. Darker green means more money; a dash means nothing that year. Select a district name to show only that district.",
  watchlist: "Projects holding the most money that was handed over but not spent yet. A longer orange bar means more unspent money.",
  progressBands: "How many projects have spent none, 1–25%, 26–50%, 51–75% or 76–100% of their approved budget. The orange bar counts projects that have not spent anything yet.",
  spendingGap: "For each project the grey bar shows how much of its planned time has passed and the green bar how much of its budget is spent. A big difference may mean slow spending — worth asking about, not proof of delay.",
  completions: "How many projects are planned to finish in each year. The orange part counts projects whose planned finish date has already passed. The • marks the current period.",
  sizeProgress: "Each dot is a project. Further right = bigger budget; higher up = more of its budget spent. Dots at the bottom right are big projects that have spent little. Select a dot to open the project.",
  projectYears: "This project's money by budget year: gold = set aside, blue = handed over, green = spent.",
  allocationDonut: "The ring shows how much of the money set aside for this project has been spent (green) and how much is still unspent (light).",
  cumulative: "Running totals over the years: each line keeps adding the money set aside, handed over and spent so far.",
  annualExecution: "For each budget year: what share of that year's allocation was handed over (blue) and spent (green). 100% means all of it.",
  schedule: "The bar runs from the start date to the planned finish date; \"Today\" marks where we are. Compare time passed (grey) with money spent (green).",
  compare: "Compares this project with the average of its district and of all projects. Longer bar = higher share. Averages are weighted by money, so big projects count more.",
};

/** The KPI and column explanations shown next to headline numbers. */
export const KPI_HELP: Record<string, string> = {
  projects: "Number of tourism projects in the current selection, and how many areas they are in.",
  financialProgress: GLOSSARY_BY_ID["financial-progress"].short,
  spent: "Total money spent by these projects, compared with their total approved budget.",
  projectsSpending: "How many projects have spent at least some money. The rest have not started spending yet.",
  approvedCost: GLOSSARY_BY_ID["approved-cost"].short,
  released: GLOSSARY_BY_ID.released.short,
  registerColumns: "Approved = total budget · Spent = money used so far · Not spent = handed over but not yet used · Progress = share of the budget spent. Amounts are in millions of rupees (Rs 10m = 1 crore).",
};
