import { NextResponse, type NextRequest } from "next/server";
import {
  prepareAssistantContext,
  type AssistantHistoryMessage,
} from "@/lib/assistant-context";
import {
  getGeminiErrorStatus,
  generateDashboardAnswer,
  interpretDashboardQuestion,
  isGeminiRateLimitError,
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
    let lookupQuestion: string | undefined;
    let prepared = prepareAssistantContext(dashboard, message, history);
    if (prepared.kind === "language-fallback") {
      lookupQuestion = await interpretDashboardQuestion(message, history);
      prepared = prepareAssistantContext(dashboard, lookupQuestion, []);
      if (prepared.kind === "language-fallback") {
        prepared = {
          kind: "off-topic",
          context: {},
          sources: [],
          immediateAnswer: "I could not match that request to available dashboard data. Offer dashboard questions about site progress, locations, funding, or fiscal years.",
        };
      }
    }
    const answerContext = prepared.immediateAnswer
      ? { ...prepared.context, responseGuidance: prepared.immediateAnswer }
      : prepared.context;
    const answer = await generateDashboardAnswer(
      message,
      history,
      answerContext,
    );

    return NextResponse.json(
      { answer, sources: prepared.sources },
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
