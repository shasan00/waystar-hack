"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatMoney } from "@/lib/demo-data";

type AssistantTurn =
  | { role: "user"; text: string }
  | {
      role: "assistant";
      text: string;
      recommendedInstallmentCount: number | null;
    };

type AssistantResponse = {
  reply?: string;
  recommendedInstallmentCount?: number | null;
  monthlyAmountCents?: number | null;
  matchedExactly?: boolean;
  error?: string;
};

export function PlanAssistant({
  slug,
  total,
  options,
}: {
  slug: string;
  total: number;
  options: number[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (text.length === 0 || loading) return;
    setInput("");
    setError(null);
    setTurns((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch(`/api/public/pages/${slug}/plan-assistant`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const json = (await res.json().catch(() => ({}))) as AssistantResponse;
      if (!res.ok) {
        setError(json.error ?? "The assistant couldn't respond.");
        return;
      }
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          text: json.reply ?? "",
          recommendedInstallmentCount:
            typeof json.recommendedInstallmentCount === "number"
              ? json.recommendedInstallmentCount
              : null,
        },
      ]);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const latestRec =
    [...turns]
      .reverse()
      .find(
        (t): t is Extract<AssistantTurn, { role: "assistant" }> =>
          t.role === "assistant" &&
          typeof t.recommendedInstallmentCount === "number",
      )?.recommendedInstallmentCount ?? null;

  const acceptRecommendation = () => {
    if (latestRec == null) return;
    router.push(`/pay/${slug}?plan=${latestRec}&installment=1`);
  };

  if (!open) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group inline-flex items-center gap-2 rounded-full border border-waystar/30 bg-white px-3 py-1.5 text-[12.5px] text-waystar-deep hover:bg-waystar-wash"
          aria-label="Open the AI payment plan assistant"
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-waystar"
            aria-hidden
          />
          <span className="font-medium">Need a payment plan?</span>
          <span className="text-ink-muted">
            Tell us what you can afford — we'll find a fit.
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="mt-4 rounded-lg border border-rule bg-white"
      role="region"
      aria-label="Payment plan assistant"
    >
      <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-waystar"
            aria-hidden
          />
          <span className="text-[12.5px] font-medium text-ink">
            Plan assistant
          </span>
          <span className="text-[11px] text-ink-muted">· AI-assisted</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close plan assistant"
          className="text-ink-muted hover:text-ink"
        >
          ×
        </button>
      </div>

      <div className="max-h-[260px] space-y-3 overflow-y-auto px-4 py-3 text-[13.5px]">
        {turns.length === 0 && (
          <p className="text-ink-muted">
            Tell us what you can afford each month (for example, "about
            $150/mo") and we'll pick the installment plan that fits.
          </p>
        )}
        {turns.map((t, i) => (
          <Turn key={i} turn={t} total={total} />
        ))}
        {loading && (
          <div className="inline-flex items-center gap-2 text-[12px] text-ink-muted">
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-waystar"
              aria-hidden
            />
            Thinking…
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[12px] text-red-700"
          >
            {error}
          </p>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 border-t border-rule px-3 py-2"
      >
        <label className="sr-only" htmlFor="pa-input">
          Your message
        </label>
        <input
          id="pa-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. I can do $150 a month"
          maxLength={500}
          disabled={loading}
          className="min-w-0 flex-1 rounded-md border border-rule bg-white px-3 py-1.5 text-[13px] outline-none focus:border-waystar focus:ring-2 focus:ring-waystar/20"
        />
        <button
          type="submit"
          disabled={loading || input.trim().length === 0}
          className="inline-flex h-8 items-center rounded-md bg-waystar px-3 text-[12.5px] font-medium text-white hover:bg-waystar-deep disabled:opacity-60"
        >
          Send
        </button>
      </form>

      {latestRec != null && (
        <div className="border-t border-rule bg-canvas px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[12.5px] text-ink">
              Suggested plan:{" "}
              <span className="font-medium">
                {latestRec} months · {formatMoney(Math.round(total / latestRec))}
                /mo
              </span>
            </div>
            <button
              type="button"
              onClick={acceptRecommendation}
              className="inline-flex h-8 items-center rounded-md bg-waystar px-3 text-[12.5px] font-medium text-white hover:bg-waystar-deep"
            >
              Use this plan →
            </button>
          </div>
        </div>
      )}

      <p className="border-t border-rule px-4 py-2 text-[10.5px] text-ink-muted">
        Plans split the same total into equal payments — no interest or fees.
        Suggestions require your confirmation before any charge.
      </p>
    </div>
  );
}

function Turn({
  turn,
  total,
}: {
  turn: AssistantTurn;
  total: number;
}) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-waystar px-3 py-1.5 text-white">
          {turn.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-lg border border-rule bg-canvas px-3 py-1.5 text-ink">
        {turn.text}
        {turn.recommendedInstallmentCount != null && (
          <div className="mt-1 text-[11.5px] text-ink-muted">
            {turn.recommendedInstallmentCount} ×{" "}
            {formatMoney(
              Math.round(total / turn.recommendedInstallmentCount),
            )}
            /mo
          </div>
        )}
      </div>
    </div>
  );
}
