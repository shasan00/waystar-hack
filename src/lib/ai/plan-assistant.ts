import "server-only";

/**
 * Plan Assistant — AI-assisted installment negotiator.
 *
 * Given a payer's free-text reply ("I can afford about $150/mo") and the
 * page's configured plan options, returns a structured recommendation
 * plus a short conversational message.
 *
 * Uses the Claude API via fetch (no SDK install) with prompt caching on
 * the system prompt so repeated negotiation turns stay cheap.
 */

export type PlanRecommendation = {
  reply: string;
  recommendedInstallmentCount: number | null;
  monthlyAmountCents: number | null;
  // When the payer's target differs materially from our installments, we
  // surface an explicit counter-offer in the reply and still pick the
  // closest supported option as the machine-readable default.
  matchedExactly: boolean;
};

export type NegotiationContext = {
  pageTitle: string;
  orgName: string;
  totalCents: number;
  installmentOptions: number[]; // e.g., [2, 3, 4, 6]
  payerMessage: string;
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are the payment assistant for a healthcare billing portal. Your job is to help a patient pick an installment plan for an outstanding balance.

Rules you must follow every time:
1. You never invent plan options. Only offer installment counts from the list you're given.
2. You never change the total balance owed. All plans divide the exact total.
3. You give one short, friendly reply (2–4 sentences, no bullet lists, no headings).
4. You always end by asking a yes/no or single-choice question so the patient can confirm.
5. You never mention credit checks, interest, late fees, or collections.
6. You never ask for SSN, card numbers, or medical information.
7. You respond with a strict JSON object and nothing else: { "reply": string, "recommendedInstallmentCount": integer | null, "matchedExactly": boolean }. No markdown fences, no prose outside JSON.

How to pick recommendedInstallmentCount:
- If the patient states a monthly budget, pick the installment count whose per-month amount is closest to (but not above) that budget. If every available monthly amount exceeds their budget, pick the largest installment count (lowest monthly) and acknowledge it's still above their stated budget.
- matchedExactly = true only when the per-month amount exactly equals their stated budget (within 1 cent after integer division).
- If the patient asks an open question ("what plans do you have?") without stating a budget, set recommendedInstallmentCount to null and list the options in the reply.
- If the patient rejects plans or asks to pay in full, set recommendedInstallmentCount to null and reply acknowledging they'll pay in full.

Do not output anything except the JSON object.`;

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function buildUserPrompt(ctx: NegotiationContext): string {
  const optionLines = ctx.installmentOptions
    .filter((n) => ctx.totalCents % n === 0)
    .map((n) => {
      const per = ctx.totalCents / n;
      return `- ${n} months at ${formatUsd(per)}/month`;
    })
    .join("\n");

  return `Balance context:
- Provider: ${ctx.orgName}
- Bill: ${ctx.pageTitle}
- Total owed: ${formatUsd(ctx.totalCents)}

Available installment plans (each divides the total exactly):
${optionLines.length > 0 ? optionLines : "(no plans available for this exact total)"}

Patient said:
"${ctx.payerMessage.slice(0, 500)}"

Respond with the JSON object as specified.`;
}

function pickFallback(ctx: NegotiationContext): PlanRecommendation {
  const valid = ctx.installmentOptions.filter((n) => ctx.totalCents % n === 0);
  if (valid.length === 0) {
    return {
      reply:
        "We don't have a monthly plan that splits this balance evenly. You're welcome to pay in full below.",
      recommendedInstallmentCount: null,
      monthlyAmountCents: null,
      matchedExactly: false,
    };
  }
  const largest = Math.max(...valid);
  return {
    reply: `We can split this into ${largest} monthly payments of ${formatUsd(
      ctx.totalCents / largest,
    )}. Would that work?`,
    recommendedInstallmentCount: largest,
    monthlyAmountCents: ctx.totalCents / largest,
    matchedExactly: false,
  };
}

export async function negotiatePlan(
  ctx: NegotiationContext,
): Promise<PlanRecommendation> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // Dev fallback so the UI still works without a key configured.
    return pickFallback(ctx);
  }

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            // Cache the static system prompt so repeated negotiation
            // turns only pay for the per-turn user message.
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          { role: "user", content: buildUserPrompt(ctx) },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("[plan-assistant] Anthropic non-2xx", res.status);
      return pickFallback(ctx);
    }
    const json = (await res.json()) as AnthropicResponse;
    const text = json.content?.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson(text);
    if (!parsed) {
      console.warn("[plan-assistant] could not parse JSON", text.slice(0, 200));
      return pickFallback(ctx);
    }

    // Validate the model's recommendation is actually a configured option.
    let rec = parsed.recommendedInstallmentCount;
    if (
      typeof rec === "number" &&
      (!ctx.installmentOptions.includes(rec) ||
        ctx.totalCents % rec !== 0)
    ) {
      rec = null;
    }
    const monthly =
      typeof rec === "number" ? Math.round(ctx.totalCents / rec) : null;

    return {
      reply:
        typeof parsed.reply === "string" && parsed.reply.trim().length > 0
          ? parsed.reply.trim()
          : pickFallback(ctx).reply,
      recommendedInstallmentCount: rec,
      monthlyAmountCents: monthly,
      matchedExactly: Boolean(parsed.matchedExactly),
    };
  } catch (e) {
    console.warn("[plan-assistant] fetch failed", e);
    return pickFallback(ctx);
  }
}

function extractJson(
  raw: string,
): { reply?: unknown; recommendedInstallmentCount?: unknown; matchedExactly?: unknown } | null {
  // Accept fenced or raw JSON; strip surrounding prose if the model slipped.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? raw).trim();
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  if (first < 0 || last < 0 || last < first) return null;
  try {
    return JSON.parse(body.slice(first, last + 1));
  } catch {
    return null;
  }
}
