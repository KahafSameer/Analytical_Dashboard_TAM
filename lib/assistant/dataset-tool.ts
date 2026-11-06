import "server-only";

import type { AssistantHistoryMessage, AssistantSource } from "@/lib/assistant-context";
import { publicSchema, type DatasetSchema } from "@/lib/data-schema";
import { executeDataQuery, getQueryPlanFieldIds, validateDataQueryPlan, type QueryResult } from "@/lib/dataset-query";
import { PLANNER_INSTRUCTION, parsePlanText, planDashboardQuery, plannerPrompt } from "@/lib/gemini";
import { completeJsonWithFailover, getChatProviders } from "@/lib/assistant/openai-compatible";
import type { DashboardData } from "@/lib/types";

const MAX_RESULT_CHARS = 14_000;

/**
 * Plans with Gemini; if every Gemini planner model is rate limited or failing, plans with a
 * backup model in JSON mode. The plan is validated against the schema either way.
 */
async function planQuery(question: string, history: AssistantHistoryMessage[], schema: DatasetSchema, correction?: string) {
  try {
    return await planDashboardQuery(question, history, schema, correction, { skipCoolingModels: getChatProviders().length > 0 });
  } catch (error) {
    const backup = await completeJsonWithFailover({
      system: PLANNER_INSTRUCTION,
      user: plannerPrompt(question, history, schema, correction),
      maxTokens: 1_200,
      timeoutMs: 15_000,
    });
    if (backup === undefined) throw error;
    return parsePlanText(backup);
  }
}

function formatFieldValue(value: unknown, unit?: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) return String(value ?? "Not reported");
  if (unit?.includes("percent")) return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
  if (unit?.includes("PKR millions")) return `PKR ${value.toLocaleString("en-PK", { maximumFractionDigits: 2 })}m`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

function makeAnswerSources(result: QueryResult, schema: DatasetSchema, dashboard: DashboardData): AssistantSource[] {
  const fields = new Map(schema.fields.map((field) => [field.id, field]));
  const idByName = new Map(dashboard.sites.map((site) => [site.name, site.id]));
  if (result.rows?.length) {
    return result.rows.slice(0, 8).flatMap((row) => {
      const label = String(row.name ?? row.projectId ?? row.code ?? "Project");
      const siteId = idByName.get(label);
      return Object.entries(row)
        .filter(([id]) => !["name", "projectId", "code"].includes(id))
        .slice(0, 2)
        .map(([id, value]) => ({
          site: label,
          field: fields.get(id)?.label ?? id,
          value: formatFieldValue(value, fields.get(id)?.unit),
          ...(siteId ? { href: `/sites/${siteId}` } : {}),
        }));
    }).slice(0, 8);
  }
  if (result.aggregations?.length) {
    return result.aggregations.slice(0, 8).map((entry) => ({
      site: "Portfolio",
      field: entry.operation === "count" ? `Projects counted (${entry.label})` : `${entry.operation} ${entry.label}`,
      // A count is a number of records, not an amount in the measured field's unit.
      value: entry.operation === "count" ? String(entry.value ?? 0) : formatFieldValue(entry.value, entry.unit),
    }));
  }
  if (result.groups?.length) {
    const groupFields = result.groups[0] ? Object.entries(result.groups[0].key) : [];
    return result.groups.slice(0, 8).map((group) => ({
      site: groupFields.map(([id]) => `${fields.get(id)?.label ?? id}: ${String(group.key[id] ?? "Not reported")}`).join(" · "),
      field: "Record count",
      value: String(group.count),
    }));
  }
  return [];
}

/** Keeps the tool result within a size the model can use, trimming rows first. */
function boundResult(result: QueryResult): QueryResult & { rowsOmittedForLength?: number } {
  if (JSON.stringify(result).length <= MAX_RESULT_CHARS || !result.rows?.length) return result;
  const rows = [...result.rows];
  let omitted = 0;
  while (rows.length > 1 && JSON.stringify({ ...result, rows }).length > MAX_RESULT_CHARS) {
    rows.pop();
    omitted += 1;
  }
  return { ...result, rows, rowsOmittedForLength: omitted };
}

/**
 * Answers a question about the connected sheet: the model only plans; TypeScript validates
 * the plan against the live schema and computes every number.
 */
export async function runDatasetQuestion(
  question: string,
  history: AssistantHistoryMessage[],
  dashboard: DashboardData,
  schema: DatasetSchema,
): Promise<{ result: Record<string, unknown>; sources: AssistantSource[] }> {
  let rawPlan = await planQuery(question, history, schema);
  let validation = validateDataQueryPlan(rawPlan, schema);
  if (!validation.plan && validation.invalidFields.length) {
    const availableIds = schema.fields.map((field) => field.id).join(", ");
    rawPlan = await planQuery(
      question,
      history,
      schema,
      `Unknown field IDs: ${validation.invalidFields.join(", ")}. Available field IDs: ${availableIds}`,
    );
    validation = validateDataQueryPlan(rawPlan, schema);
  }

  const plan = validation.plan;
  if (!plan) {
    return {
      result: {
        status: "query_plan_needs_clarification",
        note: "The question could not be mapped to a validated project-data query. Do not invent figures; ask a concise clarification or answer from other tools.",
        availableFields: publicSchema(schema).fields.map(({ id, label }) => ({ id, label })),
        validationError: validation.error,
      },
      sources: [],
    };
  }
  if (plan.output === "clarify") {
    return {
      result: {
        status: "not_a_project_data_question",
        reason: plan.clarification ?? "The request is not a query about the dashboard's project data.",
      },
      sources: [],
    };
  }
  if (plan.unavailableFields.length) {
    return {
      result: {
        status: "requested_fields_unavailable",
        unavailableFields: plan.unavailableFields,
        availableFields: publicSchema(schema).fields.map(({ id, label }) => ({ id, label })),
      },
      sources: [],
    };
  }

  const result = executeDataQuery(dashboard.sites, schema, plan);
  const labelOf = (id: string) => schema.fields.find((field) => field.id === id)?.label ?? id;
  const relevantFieldIds = new Set(getQueryPlanFieldIds(plan));
  if (plan.output === "analysis") for (const field of schema.fields) relevantFieldIds.add(field.id);

  return {
    result: {
      status: "query_complete",
      querySummary: {
        output: plan.output,
        filters: plan.filters.map((filter) => ({
          field: labelOf(filter.field),
          operator: filter.operator,
          ...(filter.value !== undefined ? { value: filter.value } : {}),
          ...(filter.value2 !== undefined ? { value2: filter.value2 } : {}),
        })),
        filterLogic: plan.filterLogic,
        groupBy: plan.groupBy.map(labelOf),
        sort: plan.sort.map((entry) => ({
          field: schema.fields.find((field) => field.id === entry.field)?.label
            ?? plan.calculations.find((calculation) => calculation.id === entry.field)?.id
            ?? entry.field,
          direction: entry.direction,
        })),
        limit: plan.limit,
        aggregations: plan.aggregations.map((aggregation) => ({
          id: aggregation.id,
          operation: aggregation.operation,
          field: aggregation.field ? labelOf(aggregation.field) : undefined,
        })),
        calculations: plan.calculations.map((calculation) => ({
          id: calculation.id,
          operation: calculation.operation,
          left: labelOf(calculation.left),
          right: labelOf(calculation.right),
        })),
        ...(plan.scenario ? { scenario: plan.scenario } : {}),
      },
      result: boundResult(result),
      relevantFields: schema.fields
        .filter((field) => relevantFieldIds.has(field.id))
        .map(({ id, label, type, unit }) => ({ id, label, type, ...(unit ? { unit } : {}) })),
    },
    sources: makeAnswerSources(result, schema, dashboard),
  };
}
