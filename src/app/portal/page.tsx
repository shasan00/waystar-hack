import Link from "next/link";
import { PageHeader, PageBody } from "@/components/app-shell";
import { formatMoney } from "@/lib/demo-data";
import { ArrowRightIcon } from "@/components/icons";

const OUTSTANDING = [
  {
    id: "b1",
    provider: "Memorial Health",
    description: "Visit on March 12, 2026",
    amount: 84700,
    dueDate: "2026-04-30",
    slug: "memorial-health-mar-12",
    allowPlans: true,
  },
  {
    id: "b2",
    provider: "Summit Pediatrics",
    description: "Well-child visit copay · April 4",
    amount: 4500,
    dueDate: "2026-05-10",
    slug: "summit-pediatrics-wellvisit",
    allowPlans: false,
  },
];

const RECENT = [
  { id: "t1", provider: "Memorial Health", amount: 14117, date: "2026-04-01" },
  { id: "t2", provider: "Riverside Dental", amount: 27500, date: "2026-03-15" },
];

export default function PortalDashboard() {
  const totalOutstanding = OUTSTANDING.reduce((s, b) => s + b.amount, 0);
  return (
    <>
      <PageHeader
        eyebrow="Your balances"
        title="Hi Jordan — you have 2 bills outstanding."
        description="Pay in full or reply PLAN to any of your text reminders to split into monthly payments."
      />
      <PageBody>
        {/* Hero balance card */}
        <div className="chart-grid relative overflow-hidden rounded-lg border border-rule bg-white">
          <div className="px-6 py-7 md:px-10 md:py-10">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-muted">
              <span className="h-px w-5 bg-ink-muted/50" />
              Total owed
            </div>
            <div className="mt-2 tabular font-display text-[72px] leading-none text-waystar">
              {formatMoney(totalOutstanding)}
            </div>
            <div className="mt-2 text-[13px] text-ink-muted">
              Across {OUTSTANDING.length} providers. Next due{" "}
              <span className="text-ink">April 30, 2026</span>.
            </div>
          </div>
        </div>

        <h2 className="mb-3 mt-8 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-muted">
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-5 bg-ink-muted/50" aria-hidden />
            Outstanding bills
          </span>
        </h2>
        <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-white">
          {OUTSTANDING.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-4 px-5 py-5">
              <div>
                <div className="text-[14px] font-medium text-ink">
                  {b.provider}
                </div>
                <div className="mt-0.5 text-[12.5px] text-ink-muted">
                  {b.description} · Due {b.dueDate}
                </div>
                {b.allowPlans && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-waystar-wash px-2 py-0.5 text-[11px] font-medium text-waystar-deep">
                    Payment plan available
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="tabular font-display text-[28px] leading-none text-ink">
                  {formatMoney(b.amount)}
                </div>
                <div className="mt-2">
                  <Link
                    href={`/pay/${b.slug}?bill=${b.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-waystar px-3 text-[12.5px] font-medium text-white hover:bg-waystar-deep"
                  >
                    Pay now <ArrowRightIcon />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <h2 className="mb-3 mt-8 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-muted">
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-5 bg-ink-muted/50" aria-hidden />
            Recent payments
          </span>
        </h2>
        <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-white">
          {RECENT.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-[13.5px] text-ink">{r.provider}</div>
                <div className="text-[11.5px] text-ink-muted">{r.date}</div>
              </div>
              <div className="tabular text-[13.5px] text-ink">
                {formatMoney(r.amount)}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 text-right">
          <Link
            href="/portal/history"
            className="inline-flex items-center gap-1 text-[12.5px] text-ink-muted hover:text-waystar-deep"
          >
            Full payment history <ArrowRightIcon />
          </Link>
        </div>
      </PageBody>
    </>
  );
}
