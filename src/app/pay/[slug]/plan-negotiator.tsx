"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/demo-data";

type PlanOption = {
  months: number;
  monthlyCents: number;
  label: string;
};

type NegotiateResponse = {
  message: string;
  options: PlanOption[];
};

export function PlanNegotiator({
  slug,
  totalCents,
}: {
  slug: string;
  totalCents: number;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NegotiateResponse | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ totalCents, userMessage: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't reach the negotiator.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  function choose(option: PlanOption) {
    router.push(`/pay/${slug}?plan=${option.months}&installment=1`);
  }

  return (
    <div className="mt-4 rounded-lg border border-rule bg-white/70 p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-waystar/30 bg-waystar-wash px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] text-waystar-deep">
          AI assist
        </span>
        <div className="text-[13px] font-medium text-ink">
          Tell us what you can afford
        </div>
      </div>
      <div className="mt-1 text-[12px] text-ink-muted">
        Type a monthly amount (e.g.{" "}
        <span className="text-ink">&ldquo;$150/mo max&rdquo;</span>) and we&rsquo;ll
        tailor a plan.
      </div>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="$150/mo max"
          disabled={loading}
          className="flex-1 rounded-md border border-rule bg-white px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-muted/60 focus:border-waystar"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-md border border-waystar bg-waystar px-3 py-2 text-[12px] font-medium text-white hover:bg-waystar-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <p className="text-[13px] leading-[1.5] text-ink">{result.message}</p>
          <div className="flex flex-wrap gap-2">
            {result.options.map((o, i) => (
              <button
                key={i}
                onClick={() => choose(o)}
                className="group inline-flex flex-col items-start rounded-md border border-rule bg-white px-3 py-2 text-left hover:border-waystar hover:bg-waystar-wash"
              >
                <span className="text-[13px] font-medium text-ink group-hover:text-waystar-deep">
                  {o.months}-pay · {formatMoney(o.monthlyCents)}/mo
                </span>
                <span className="text-[11px] text-ink-muted">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
