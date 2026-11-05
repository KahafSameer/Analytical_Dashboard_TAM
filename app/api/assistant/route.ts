import { NextResponse, type NextRequest } from "next/server";
import type { AssistantHistoryMessage, AssistantSource } from "@/lib/assistant-context";
import { discoverDatasetSchema, publicSchema } from "@/lib/data-schema";
import {
  executeDataQuery,
  getQueryPlanFieldIds,
  validateDataQueryPlan,
} from "@/lib/dataset-query";
import {
  getGeminiErrorStatus,
  generateDashboardAnswer,
  isGeminiRateLimitError,
  planDashboardQuery,
} from "@/lib/gemini";
import {
  GoogleSheetsDataError,
  getDashboardData,
} from "@/lib/google-sheets";
import { WorkbookDataError } from "@/lib/excel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 16_000;
const MAX_MESSAGE_LENGTH = 1_500;
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_MESSAGE_LENGTH = 500;
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

class RequestValidationError extends Error {}

async function readJsonBody(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) throw new RequestValidationError("empty-body");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RequestValidationError("body-too-large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new RequestValidationError("invalid-json");
  }
}

function validateRequest(value: unknown): { message: string; history: AssistantHistoryMessage[] } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RequestValidationError("invalid-request");
  }
  const body = value as { message?: unknown; history?: unknown };
  if (typeof body.message !== "string" || !body.message.trim()) {
    throw new RequestValidationError("empty-message");
  }
  const message = body.message.trim();
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new RequestValidationError("message-too-long");
  }

  const historyInput = body.history ?? [];
  if (!Array.isArray(historyInput)) throw new RequestValidationError("invalid-history");
  const history = historyInput.slice(-MAX_HISTORY_MESSAGES).map((item): AssistantHistoryMessage => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new RequestValidationError("invalid-history");
    }
    const entry = item as { role?: unknown; content?: unknown };
    if (
      (entry.role !== "user" && entry.role !== "assistant") ||
      typeof entry.content !== "string" ||
      entry.content.length > MAX_HISTORY_MESSAGE_LENGTH
    ) {
      throw new RequestValidationError("invalid-history");
    }
    return { role: entry.role, content: entry.content };
  });
  return { message, history };
}

function isRateLimited(request: NextRequest) {
  const now = Date.now();
  for (const [key, value] of requestCounts) {
    if (value.resetAt <= now) requestCounts.delete(key);
  }
  const key = request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  const current = requestCounts.get(key);
  if (!current || current.resetAt <= now) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (current.count >= RATE_LIMIT) return true;
  current.count += 1;
  if (requestCounts.size > 2_000) {
    const firstKey = requestCounts.keys().next().value;
    if (firstKey) requestCounts.delete(firstKey);
  }
  return false;
}

function formatFieldValue(value: unknown, unit?: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) return String(value ?? "Not reported");
  if (unit?.includes("percent")) return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
  if (unit?.includes("PKR millions")) return `PKR ${value.toLocaleString("en-PK", { maximumFractionDigits: 2 })}m`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

function makeAnswerSources(
  result: ReturnType<typeof executeDataQuery>,
  schema: ReturnType<typeof discoverDatasetSchema>,
): AssistantSource[] {
  const fields = new Map(schema.fields.map((field) => [field.id, field]));
  if (result.rows?.length) {
    return result.rows.slice(0, 8).flatMap((row) => {
      const label = String(row.name ?? row.projectId ?? row.code ?? "Project");
      return Object.entries(row)
        .filter(([id]) => !["name", "projectId", "code"].includes(id))
        .slice(0, 2)
        .map(([id, value]) => ({
          site: label,
          field: fields.get(id)?.label ?? id,
          value: formatFieldValue(value, fields.get(id)?.unit),
        }));
    }).slice(0, 8);
  }
  if (result.aggregations?.length) {
    return result.aggregations.slice(0, 8).map((entry) => ({
      site: "Dataset",
      field: `${entry.operation} ${entry.label}`,
      value: formatFieldValue(entry.value, entry.unit),
    }));
  }
  if (result.groups?.length) {
    const groupFields = result.groups[0] ? Object.entries(result.groups[0].key) : [];
    return result.groups.slice(0, 8).map((group) => ({
      site: groupFields.map(([id, value]) => `${fields.get(id)?.label ?? id}: ${String(value ?? "Not reported")}`).join(" · "),
      field: "Record count",
      value: String(group.count),
    }));
  }
  return [];
}

export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { error: "Please send a valid question about the dashboard." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (isRateLimited(request)) {
    return NextResponse.json(
      { error: "You’ve sent several questions. Please wait a moment and try again." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { message, history } = validateRequest(await readJsonBody(request));
    const dashboard = await getDashboardData();
    const schema = discoverDatasetSchema(dashboard.sites, dashboard.sourceHeaders);
    let rawPlan = await planDashboardQuery(message, history, schema);
    let validation = validateDataQueryPlan(rawPlan, schema);
    if (!validation.plan && validation.invalidFields.length) {
      const availableIds = schema.fields.map((field) => field.id).join(", ");
      rawPlan = await planDashboardQuery(
        message,
        history,
        schema,
        `Unknown field IDs: ${validation.invalidFields.join(", ")}. Available field IDs: ${availableIds}`,
      );
      validation = validateDataQueryPlan(rawPlan, schema);
    }
    let answerContext: Record<string, unknown>;
    let sources: AssistantSource[] = [];

    if (!validation.plan) {
      answerContext = {
        status: "query_plan_needs_clarification",
        message: "The query planner could not map the request to a validated operation. Ask one concise clarification in the user's language. Do not guess or invent results.",
        availableFields: publicSchema(schema).fields,
        validationError: validation.error,
      };
    } else if (validation.plan.output === "clarify") {
      answerContext = {
        status: "clarification_needed",
        reason: validation.plan.clarification ?? "This request is not a query about the connected dataset or needs clarification.",
      };
    } else if (validation.plan.unavailableFields.length) {
      answerContext = {
        status: "requested_fields_unavailable",
        unavailableFields: validation.plan.unavailableFields,
        availableFields: publicSchema(schema).fields,
      };
    } else {
      const result = executeDataQuery(dashboard.sites, schema, validation.plan);
      const relevantFieldIds = new Set(getQueryPlanFieldIds(validation.plan));
      if (validation.plan.output === "analysis") {
        for (const field of schema.fields) relevantFieldIds.add(field.id);
      }
      const querySummary = {
        output: validation.plan.output,
        filters: validation.plan.filters.map((filter) => ({
          field: schema.fields.find((field) => field.id === filter.field)?.label ?? filter.field,
          operator: filter.operator,
          ...(filter.value !== undefined ? { value: filter.value } : {}),
          ...(filter.value2 !== undefined ? { value2: filter.value2 } : {}),
        })),
        filterLogic: validation.plan.filterLogic,
        groupBy: validation.plan.groupBy.map((id) => schema.fields.find((field) => field.id === id)?.label ?? id),
        sort: validation.plan.sort.map((entry) => ({
          field: schema.fields.find((field) => field.id === entry.field)?.label
            ?? validation.plan?.calculations.find((calculation) => calculation.id === entry.field)?.id
            ?? entry.field,
          direction: entry.direction,
        })),
        limit: validation.plan.limit,
        aggregations: validation.plan.aggregations.map((aggregation) => ({
          id: aggregation.id,
          operation: aggregation.operation,
          field: aggregation.field ? schema.fields.find((field) => field.id === aggregation.field)?.label ?? aggregation.field : undefined,
        })),
        calculations: validation.plan.calculations.map((calculation) => ({
          id: calculation.id,
          operation: calculation.operation,
          left: schema.fields.find((field) => field.id === calculation.left)?.label ?? calculation.left,
          right: schema.fields.find((field) => field.id === calculation.right)?.label ?? calculation.right,
        })),
        ...(validation.plan.scenario ? { scenario: validation.plan.scenario } : {}),
      };
      const relevantFields = schema.fields
        .filter((field) => relevantFieldIds.has(field.id))
        .map(({ id, label, type, unit }) => ({ id, label, type, ...(unit ? { unit } : {}) }));
      answerContext = {
        status: "query_complete",
        querySummary,
        result,
        relevantFields,
      };
      sources = makeAnswerSources(result, schema);
    }

    const answer = await generateDashboardAnswer(
      message,
      history,
      { question: message, ...answerContext },
    );

    return NextResponse.json(
      { answer, sources },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json(
        { error: error.message === "message-too-long"
          ? "Please keep your question under 1,500 characters."
          : "Please send a valid question about the dashboard." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (isGeminiRateLimitError(error)) {
      return NextResponse.json(
        { error: "The assistant is busy right now. Please try again in a moment." },
        { status: 429, headers: { "Cache-Control": "no-store" } },
      );
    }
    const geminiStatus = getGeminiErrorStatus(error);
    if (geminiStatus === 400) {
      return NextResponse.json(
        { error: "The assistant setup was rejected. Check the Gemini API key and model access." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (geminiStatus === 401 || geminiStatus === 403) {
      return NextResponse.json(
        { error: "The assistant could not authenticate. Check the Gemini API key and its access." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (geminiStatus === 404) {
      return NextResponse.json(
        { error: "The assistant model is unavailable for this configuration." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (error instanceof Error && error.message === "assistant-not-configured") {
      return NextResponse.json(
        { error: "The assistant is temporarily unavailable. Please try again later." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (error instanceof GoogleSheetsDataError || error instanceof WorkbookDataError) {
      return NextResponse.json(
        { error: "Dashboard data is temporarily unavailable. Please try again." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "Sorry, I couldn’t analyze the dashboard data right now. Please try again." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
