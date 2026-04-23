import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

type PlanOption = {
  months: number;
  monthlyCents: number;
  label: string;
};

type NegotiateResponse = {
  message: string;
  options: PlanOption[];
};

const SYSTEM_PROMPT = `You are a warm, concise payment-plan negotiator for a medical billing portal. A patient is telling you what they can afford per month toward an outstanding balance. Your job is to propose two workable interest-free payment-plan options using the propose_plans tool.

Guidelines:
- Plans are interest-free, equal monthly payments.
- Minimum 2 months, maximum 24 months.
- Option A: respects the patient's stated monthly ceiling — pick the shortest plan whose monthly payment is at or below their stated max. Monthly payment should be close to (but not exceeding) the ceiling so the term is as short as possible.
- Option B: a slightly higher monthly payment that finishes faster (typically 1-2 months shorter than Option A), useful if the patient wants to be done sooner.
- If the ceiling is already very low and a plan would exceed 24 months, explain that and offer the longest feasible plan as Option A with a gentle note.
- Keep the "message" field to one or two short sentences, in second person, no emojis, no markdown. Be empathetic but businesslike.`;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  let body: { totalCents?: number; userMessage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const totalCents = Number(body.totalCents);
  const userMessage = typeof body.userMessage === "string" ? body.userMessage.slice(0, 500) : "";
  if (!Number.isFinite(totalCents) || totalCents <= 0 || !userMessage) {
    return NextResponse.json({ error: "Missing totalCents or userMessage" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const totalDollars = (totalCents / 100).toFixed(2);

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        name: "propose_plans",
        description: "Propose two interest-free payment plan options to the patient.",
        input_schema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description:
                "One or two short, warm sentences to the patient summarizing the options. No markdown.",
            },
            options: {
              type: "array",
              minItems: 2,
              maxItems: 2,
              items: {
                type: "object",
                properties: {
                  months: { type: "integer", minimum: 2, maximum: 24 },
                  monthlyCents: {
                    type: "integer",
                    minimum: 1,
                    description: "Monthly payment amount in whole cents.",
                  },
                  label: {
                    type: "string",
                    description:
                      "Short CTA label, e.g. 'Start 6-pay at $141/mo'.",
                  },
                },
                required: ["months", "monthlyCents", "label"],
              },
            },
          },
          required: ["message", "options"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "propose_plans" },
    messages: [
      {
        role: "user",
        content: `Outstanding balance: $${totalDollars}.\n\nPatient says: "${userMessage}"\n\nPropose two plans with the propose_plans tool.`,
      },
    ],
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "Model did not return a plan" }, { status: 502 });
  }

  const input = toolUse.input as NegotiateResponse;

  const options = input.options
    .filter((o) => o.months >= 2 && o.months <= 24 && o.monthlyCents > 0)
    .map((o) => ({
      months: Math.round(o.months),
      monthlyCents: Math.round(o.monthlyCents),
      label: String(o.label).slice(0, 80),
    }));

  return NextResponse.json({
    message: String(input.message).slice(0, 400),
    options,
  } satisfies NegotiateResponse);
}
