import { notFound } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/demo-data";
import type { PaymentPageConfig } from "@/lib/demo-data";
import { getPaymentPageBySlug } from "@/db/queries";
import { Wordmark, ShieldBadge } from "@/components/wordmark";
import { CountUp } from "@/components/count-up";
import { PaymentForm } from "./payment-form";
import { PlanAssistant } from "./plan-assistant";

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ plan?: string; installment?: string }>;
}) {
  const { slug } = await params;
  const { plan, installment } = await searchParams;
  const config = await getPaymentPageBySlug(slug);

  if (!config) return notFound();

  const planChoice = plan ? Number(plan) : null;
  const installmentNumber = installment ? Number(installment) : 1;

  return (
    <main className="relative min-h-screen bg-canvas">
      <header className="border-b border-rule bg-white/60 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <div
              className="grid h-7 w-7 place-items-center rounded-sm border border-rule bg-waystar-wash text-[10px] font-mono uppercase tracking-wider text-waystar-deep"
              aria-hidden
            >
              {config.orgName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-medium text-ink">
                {config.orgName}
              </div>
              {config.orgTagline && (
                <div className="text-[11px] text-ink-muted">
                  {config.orgTagline}
                </div>
              )}
            </div>
          </div>
          <ShieldBadge />
        </div>
      </header>

      <section className="chart-grid relative">
        <div className="absolute inset-x-0 bottom-0 h-px bg-rule" aria-hidden />
        <div className="mx-auto max-w-[620px] px-5 pb-10 pt-14 md:pt-20">
          {config.headerMessage && (
            <p className="fade-up fade-up-1 mb-6 inline-block rounded-full border border-rule bg-white px-3 py-1 text-[12px] text-ink-muted">
              {config.headerMessage}
            </p>
          )}

          <h1 className="fade-up fade-up-2 font-display text-[46px] leading-[1.02] tracking-tight text-ink md:text-[56px]">
            {config.title}
          </h1>
          <p className="fade-up fade-up-3 mt-4 max-w-[52ch] text-[15px] leading-[1.6] text-ink-muted md:text-[16px]">
            {config.subtitle}
          </p>

          <div className="fade-up fade-up-4 mt-10">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-muted">
              <span className="h-px w-6 bg-ink-muted/60" aria-hidden />
              {config.amountMode === "fixed"
                ? planChoice
                  ? `Payment ${installmentNumber} of ${planChoice}`
                  : "Amount due"
                : config.amountMode === "range"
                  ? "Enter amount"
                  : "Pay what you'd like"}
            </div>
            <HeroAmount config={config} planChoice={planChoice} />
            {config.amountMode === "fixed" &&
              config.allowPlans &&
              !planChoice && (
                <>
                  <PlanOptions
                    slug={config.slug}
                    total={config.fixedAmount!}
                    options={config.planInstallments ?? []}
                  />
                  {(config.planInstallments?.length ?? 0) > 0 && (
                    <PlanAssistant
                      slug={config.slug}
                      total={config.fixedAmount!}
                      options={config.planInstallments ?? []}
                    />
                  )}
                </>
              )}
            {planChoice && config.fixedAmount && (
              <p className="mt-3 text-[13px] text-ink-muted">
                {formatMoney(Math.round(config.fixedAmount / planChoice))} today,
                then {planChoice - 1} more monthly payments of{" "}
                <span className="tabular text-ink">
                  {formatMoney(Math.round(config.fixedAmount / planChoice))}
                </span>
                .{" "}
                <Link
                  href={`/pay/${config.slug}`}
                  className="text-waystar-deep underline underline-offset-4 hover:text-waystar"
                >
                  Pay in full instead
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[620px] px-5 py-10">
        <div className="fade-up fade-up-5">
          <PaymentForm
            config={config}
            planChoice={planChoice}
            installmentNumber={installmentNumber}
          />
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-2 px-5 py-6 text-[12px] text-ink-muted md:flex-row">
          <p className="max-w-[60ch]">
            {config.footerMessage ??
              "Your payment is encrypted in transit and at rest. You will receive an email receipt on completion."}
          </p>
          <div className="flex items-center gap-3">
            <span>Secured by Stripe</span>
            <span className="h-3 w-px bg-rule" aria-hidden />
            <Wordmark size="sm" muted />
          </div>
        </div>
      </footer>
    </main>
  );
}

function HeroAmount({
  config,
  planChoice,
}: {
  config: PaymentPageConfig;
  planChoice: number | null;
}) {
  let displayCents: number | null = null;
  if (config.amountMode === "fixed" && config.fixedAmount) {
    displayCents = planChoice
      ? Math.round(config.fixedAmount / planChoice)
      : config.fixedAmount;
  }

  if (displayCents !== null) {
    return (
      <div className="mt-2 flex items-baseline gap-3">
        <span className="tabular font-display text-[72px] leading-none text-waystar md:text-[88px]">
          <CountUp to={displayCents} mode="currency-cents" />
        </span>
        <span className="text-[14px] font-mono uppercase tracking-[0.2em] text-ink-muted">
          USD
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 text-[15px] text-ink-muted">
      {config.amountMode === "range" &&
        `Between ${formatMoney(config.minAmount!)} and ${formatMoney(
          config.maxAmount!
        )}.`}
      {config.amountMode === "open" && "Any amount you choose."}
    </div>
  );
}

function PlanOptions({
  slug,
  total,
  options: configured,
}: {
  slug: string;
  total: number;
  options: number[];
}) {
  const options = (configured.length > 0 ? configured : [3, 6])
    .filter((n) => total % n === 0)
    .sort((a, b) => a - b);
  if (options.length === 0) return null;
  return (
    <div className="mt-6 rounded-lg border border-rule bg-white/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-medium text-ink">
            Prefer to spread this out?
          </div>
          <div className="text-[12px] text-ink-muted">
            Split this balance into equal monthly payments. No interest.
          </div>
        </div>
        <div className="flex gap-2">
          {options.map((n) => (
            <Link
              key={n}
              href={`/pay/${slug}?plan=${n}&installment=1`}
              className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:border-waystar hover:text-waystar-deep"
            >
              {n}-pay
              <span className="text-ink-muted">
                · {formatMoney(Math.round(total / n))}/mo
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
