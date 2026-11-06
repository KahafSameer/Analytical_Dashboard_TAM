/**
 * Pure helpers for provider rate limits: read retry hints from Gemini and Groq errors and track
 * per-model cooldowns, so a used-up daily quota is skipped instead of retried on every question.
 * No network access here.
 */

/** Cooldowns longer than this cannot recover within one question (daily caps, revoked access). */
export const EXHAUSTED_AFTER_MS = 2 * 60_000;
/** Even a daily cap is re-checked at least hourly (the plan may be upgraded or the quota reset). */
export const MAX_COOLDOWN_MS = 60 * 60_000;
const SHORT_COOLDOWN_MIN_MS = 5_000;
const SHORT_COOLDOWN_MAX_MS = 2 * 60_000;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 30_000;

/** Durations such as "7.5" (seconds), "42501s", "2m52.8s", "11h46m16.19s" or "802ms", in ms. */
export function parseDurationMs(value: string | null | undefined): number | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text) * 1000);
  const match = text.match(/^(?:(\d+)h)?(?:(\d+)m(?!s))?(?:(\d+(?:\.\d+)?)s)?(?:(\d+(?:\.\d+)?)ms)?$/);
  if (!match || !(match[1] || match[2] || match[3] || match[4])) return undefined;
  return Math.round(Number(match[1] ?? 0) * 3_600_000 + Number(match[2] ?? 0) * 60_000 + Number(match[3] ?? 0) * 1000 + Number(match[4] ?? 0));
}

/**
 * Suggested wait in a Gemini error. The SDK's streaming errors nest the API's JSON as an escaped
 * string (\"retryDelay\": \"42501s\"), so quotes may be preceded by backslashes.
 */
export function parseGeminiRetryDelayMs(text: string): number | undefined {
  const field = text.match(/retryDelay\\*"\s*:\s*\\*"(\d+(?:\.\d+)?)s/);
  if (field) return Math.round(Number(field[1]) * 1000);
  const prose = text.match(/retry in ([\d.hms]+?)\.?(?:\s|\\|"|$)/i);
  return prose ? parseDurationMs(prose[1]) : undefined;
}

/** Quota metric name from a Gemini error (e.g. "generate_content_free_tier_requests"). */
export function parseGeminiQuotaMetric(text: string): string | undefined {
  return text.match(/quotaMetric\\*"\s*:\s*\\*"([^"\\]+)/)?.[1]?.split("/").pop();
}

/** Groq rate-limit kind from its error message ("... on tokens per minute (TPM): ..."). */
export function parseGroqLimitKind(text: string): string | undefined {
  return text.match(/\((TPM|TPD|RPM|RPD|ASH|ASD)\)/)?.[1];
}

/** True for per-day quotas, which will not recover within minutes. */
export function isDailyQuotaMessage(text: string): boolean {
  return /PerDay|per day|\((?:TPD|RPD|ASD)\)/i.test(text);
}

/**
 * How long to avoid a model after a failure. Rate limits honour the provider's suggested wait:
 * short waits are clamped to 5 s–2 min, long ones (daily caps) are kept up to an hour.
 */
export function cooldownForFailure(status: number | undefined, retryDelayMs?: number, daily = false): number {
  if (status === 429) {
    if (daily) return Math.min(Math.max(retryDelayMs ?? MAX_COOLDOWN_MS, EXHAUSTED_AFTER_MS + 1), MAX_COOLDOWN_MS);
    if (retryDelayMs !== undefined && retryDelayMs > SHORT_COOLDOWN_MAX_MS) return Math.min(retryDelayMs, MAX_COOLDOWN_MS);
    return Math.min(Math.max(retryDelayMs ?? DEFAULT_RATE_LIMIT_COOLDOWN_MS, SHORT_COOLDOWN_MIN_MS), SHORT_COOLDOWN_MAX_MS);
  }
  if (status === 401 || status === 403 || status === 404) return 10 * 60_000;
  if (status === 500 || status === 502 || status === 503 || status === 504) return 20_000;
  return 0;
}

/** Per-key (per-model) cooldowns. Keys are tracked independently because quotas are per model. */
export class CooldownTracker {
  private readonly until = new Map<string, number>();

  constructor(private readonly now: () => number = Date.now) {}

  note(key: string, ms: number) {
    if (ms <= 0) return;
    this.until.set(key, Math.max(this.until.get(key) ?? 0, this.now() + ms));
  }

  remaining(key: string): number {
    return Math.max(0, (this.until.get(key) ?? 0) - this.now());
  }

  isCoolingDown(key: string): boolean {
    return this.remaining(key) > 0;
  }

  /** Unavailable for longer than a question can wait (e.g. a used-up daily quota). */
  isExhausted(key: string): boolean {
    return this.remaining(key) > EXHAUSTED_AFTER_MS;
  }

  /**
   * Healthy keys first (in the given order), then briefly cooling keys (soonest first).
   * Exhausted keys are dropped, so the result can be empty.
   */
  order(keys: string[]): string[] {
    const unique = [...new Set(keys)].filter((key) => !this.isExhausted(key));
    const healthy = unique.filter((key) => !this.isCoolingDown(key));
    const cooling = unique.filter((key) => this.isCoolingDown(key)).sort((a, b) => this.remaining(a) - this.remaining(b));
    return [...healthy, ...cooling];
  }
}
