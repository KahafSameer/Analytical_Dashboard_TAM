import { NextResponse, type NextRequest } from "next/server";
import type { AssistantStreamEvent } from "@/lib/assistant-context";
import { PROVIDERS_UNAVAILABLE, runAssistant } from "@/lib/assistant/agent";
import { detectReplyLanguage, type ReplyLanguage } from "@/lib/assistant/language";
import {
  RequestValidationError,
  validateAssistantRequest,
  type ValidatedAssistantRequest,
} from "@/lib/assistant/request";
import { getGeminiErrorStatus, isGeminiRateLimitError, summarizeGeminiError } from "@/lib/gemini";
import { GoogleSheetsDataError, getDashboardData } from "@/lib/google-sheets";
import { WorkbookDataError } from "@/lib/excel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// The agent may chain several tool calls (sheet, web, maps); allow time for them on Vercel.
export const maxDuration = 60;

const MAX_BODY_BYTES = 24_000;
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;
const MAX_TRACKED_CLIENTS = 2_000;
/** One question can trigger several Gemini/tool calls, so cap concurrent runs per instance. */
const MAX_CONCURRENT_RUNS = 8;
const requestCounts = new Map<string, { count: number; resetAt: number }>();
let activeRuns = 0;

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
    requestCounts.delete(key);
    requestCounts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    while (requestCounts.size > MAX_TRACKED_CLIENTS) {
      const oldest = requestCounts.keys().next().value;
      if (oldest === undefined) break;
      requestCounts.delete(oldest);
    }
    return false;
  }
  if (current.count >= RATE_LIMIT) return true;
  current.count += 1;
  return false;
}

/** End-user messages in the language of the question; setup errors stay in English for the operator. */
const USER_MESSAGES: Record<"busy" | "data" | "generic" | "unavailable", Record<ReplyLanguage, string>> = {
  // Configuration problems (key, model access): details go to the server log, never to visitors.
  unavailable: {
    "english": "The assistant is temporarily unavailable. Please try again later.",
    "urdu-script": "اسسٹنٹ عارضی طور پر دستیاب نہیں۔ براہِ کرم کچھ دیر بعد دوبارہ کوشش کریں۔",
    "roman-urdu": "Assistant abhi dastiyab nahi. Thori der baad dobara koshish karein.",
  },
  busy: {
    "english": "The assistant is busy right now. Please try again in a moment.",
    "urdu-script": "اسسٹنٹ اس وقت مصروف ہے۔ براہِ کرم تھوڑی دیر بعد دوبارہ کوشش کریں۔",
    "roman-urdu": "Assistant abhi masroof hai. Thori der baad dobara koshish karein.",
  },
  data: {
    "english": "Dashboard data is temporarily unavailable. Please try again.",
    "urdu-script": "ڈیش بورڈ کا ڈیٹا عارضی طور پر دستیاب نہیں۔ براہِ کرم دوبارہ کوشش کریں۔",
    "roman-urdu": "Dashboard ka data abhi dastiyab nahi. Dobara koshish karein.",
  },
  generic: {
    "english": "Sorry, I couldn’t answer that right now. Please try again.",
    "urdu-script": "معذرت، میں ابھی اس کا جواب نہیں دے سکا۔ براہِ کرم دوبارہ کوشش کریں۔",
    "roman-urdu": "Maazrat, main abhi iska jawab nahi de saka. Dobara koshish karein.",
  },
};

/** Maps any failure to a user-safe message and HTTP status. Never exposes provider details. */
function describeError(error: unknown, language: ReplyLanguage = "english"): { status: number; message: string } {
  if (error instanceof RequestValidationError) {
    return {
      status: 400,
      message: error.message === "message-too-long"
        ? "Please keep your question under 1,500 characters."
        : "Please send a valid question.",
    };
  }
  if (isGeminiRateLimitError(error) || (error instanceof Error && error.message === PROVIDERS_UNAVAILABLE)) {
    return { status: 429, message: USER_MESSAGES.busy[language] };
  }
  const providerStatus = getGeminiErrorStatus(error);
  if (providerStatus === 400 || providerStatus === 401 || providerStatus === 403 || providerStatus === 404
    || (error instanceof Error && error.message === "assistant-not-configured")) {
    return { status: 503, message: USER_MESSAGES.unavailable[language] };
  }
  if (error instanceof GoogleSheetsDataError || error instanceof WorkbookDataError) {
    return { status: 503, message: USER_MESSAGES.data[language] };
  }
  return { status: 502, message: USER_MESSAGES.generic[language] };
}

function jsonError(error: unknown) {
  const { status, message } = describeError(error);
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return jsonError(new RequestValidationError("invalid-content-type"));
  }
  if (isRateLimited(request)) {
    return NextResponse.json(
      { error: "You’ve sent several questions. Please wait a moment and try again." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  let input: ValidatedAssistantRequest;
  try {
    input = validateAssistantRequest(await readJsonBody(request));
    if (!process.env.GEMINI_API_KEY?.trim()) throw new Error("assistant-not-configured");
  } catch (error) {
    if (error instanceof Error && error.message === "assistant-not-configured") console.error("[assistant] GEMINI_API_KEY is not set");
    return jsonError(error);
  }
  const language = detectReplyLanguage(input.message);
  if (activeRuns >= MAX_CONCURRENT_RUNS) {
    return NextResponse.json(
      { error: USER_MESSAGES.busy[language] },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } },
    );
  }
  activeRuns += 1;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: AssistantStreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };
      try {
        const dashboard = await getDashboardData();
        const answer = await runAssistant({
          ...input,
          dashboard,
          today: new Date().toISOString().slice(0, 10),
          signal: request.signal,
          emit: send,
        });
        send(answer);
      } catch (error) {
        if (!request.signal.aborted) {
          // Log only the status / error class: no user content, keys or provider payloads.
          console.error("[assistant] request failed", summarizeGeminiError(error), error instanceof Error && !getGeminiErrorStatus(error) ? error.message.slice(0, 80) : "");
          send({ type: "error", error: describeError(error, language).message });
        }
      } finally {
        activeRuns -= 1;
        closed = true;
        try { controller.close(); } catch { /* already closed by a disconnected client */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
