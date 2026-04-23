import Link from "next/link";
import { formatMoney } from "@/lib/demo-data";
import { getPaymentPageBySlug } from "@/db/queries";
import { Wordmark, ShieldBadge } from "@/components/wordmark";

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    amount?: string;
    name?: string;
    email?: string;
    plan?: string;
    installment?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const config = await getPaymentPageBySlug(slug);
  const amount = Number(sp.amount ?? 0);
  const plan = sp.plan ? Number(sp.plan) : null;
  const installment = sp.installment ? Number(sp.installment) : 1;
  const txId =
    "QPP-" +
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase();

  return (
    <main className="relative min-h-screen bg-canvas">
      <header className="border-b border-rule bg-white/60 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-5">
          <div className="text-[13px] font-medium text-ink">
            {config?.orgName ?? "Your provider"}
          </div>
          <ShieldBadge />
        </div>
      </header>

      <section className="mx-auto max-w-[620px] px-5 pt-16">
        {/* Checkmark animation */}
        <div className="fade-up fade-up-1 mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-waystar-wash">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            aria-hidden
            className="text-success"
          >
            <path
              d="M4 12.5 L10 18.5 L20 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 40,
                strokeDashoffset: 0,
                animation: "draw 600ms cubic-bezier(0.2,0.7,0.2,1) both",
                animationDelay: "180ms",
              }}
            />
          </svg>
          <style>{`
            @keyframes draw {
              from { stroke-dashoffset: 40; }
              to   { stroke-dashoffset: 0; }
            }
          `}</style>
        </div>

        <h1 className="fade-up fade-up-2 font-display text-[46px] leading-[1.05] tracking-tight text-ink md:text-[52px]">
          Payment received.
        </h1>
        <p className="fade-up fade-up-3 mt-3 max-w-[52ch] text-[15px] leading-[1.6] text-ink-muted">
          Thank you, {sp.name || "friend"}. A receipt is on its way to{" "}
          <span className="text-ink">{sp.email || "your email"}</span>.
        </p>

        <div className="fade-up fade-up-4 mt-10 divide-y divide-rule rounded-lg border border-rule bg-white">
          <Row label="Amount" value={formatMoney(amount)} emphasis />
          {plan && (
            <Row
              label="Payment plan"
              value={`${installment} of ${plan}`}
              helper={
                plan > installment
                  ? `Next payment scheduled in 30 days.`
                  : "Final payment received. Plan complete."
              }
            />
          )}
          <Row label="Transaction ID" value={txId} mono />
          <Row label="Provider" value={config?.orgName ?? "—"} />
          <Row
            label="Date"
            value={new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          />
        </div>

        {plan && plan > installment && (
          <div className="fade-up fade-up-5 mt-6 rounded-lg border border-rule bg-waystar-wash/60 p-4 text-[13px] text-waystar-deep">
            <div className="font-medium">Your remaining plan</div>
            <ul className="mt-2 space-y-1">
              {Array.from({ length: plan - installment }).map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() + i + 1);
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between border-t border-waystar/20 pt-1 text-ink-muted first:border-t-0 first:pt-0"
                  >
                    <span>
                      Payment {installment + i + 1} of {plan} —{" "}
                      {d.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="tabular text-ink">
                      {formatMoney(amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="fade-up fade-up-5 mt-8 flex flex-wrap items-center gap-3 text-[13px]">
          <Link
            href="/portal"
            className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-white hover:bg-ink/90"
          >
            View my payments
          </Link>
          <Link
            href={`/pay/${slug}`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-rule bg-white px-4 text-ink hover:border-waystar hover:text-waystar-deep"
          >
            Make another payment
          </Link>
        </div>
      </section>

      <footer className="mt-16 border-t border-rule">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-6 text-[12px] text-ink-muted">
          <span>Keep this page or your email as proof of payment.</span>
          <Wordmark size="sm" muted />
        </div>
      </footer>
    </main>
  );
}

function Row({
  label,
  value,
  helper,
  mono,
  emphasis,
}: {
  label: string;
  value: string;
  helper?: string;
  mono?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="text-[12px] font-mono uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </div>
      <div className="text-right">
        <div
          className={`tabular ${mono ? "font-mono" : ""} ${
            emphasis
              ? "font-display text-[28px] leading-none text-waystar"
              : "text-[14px] text-ink"
          }`}
        >
          {value}
        </div>
        {helper && (
          <div className="mt-1 text-[11px] text-ink-muted">{helper}</div>
        )}
      </div>
    </div>
  );
}
