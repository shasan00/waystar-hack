import Link from "next/link";
import { headers } from "next/headers";
import { PageHeader, PageBody } from "@/components/app-shell";
import { formatMoney } from "@/lib/demo-data";
import { ArrowRightIcon } from "@/components/icons";
import { auth } from "@/lib/auth";
import {
  getOutstandingBillsForPatient,
  getRecentTransactionsForPatient,
} from "@/db/queries";

export default async function PortalDashboard() {
  const session = await auth.api.getSession({ headers: await headers() });
  const firstName = session?.user.name?.split(" ")[0] ?? "there";

  const patientId = session?.user.id;
  const [outstanding, recent] = patientId
    ? await Promise.all([
        getOutstandingBillsForPatient(patientId),
        getRecentTransactionsForPatient(patientId, 5),
      ])
    : [[], []];

  const totalOutstanding = outstanding.reduce((s, b) => s + b.amountCents, 0);
  const nextDue = outstanding
    .map((b) => b.dueDate)
    .filter((d): d is string => !!d)
    .sort()[0];

  return (
    <>
      <PageHeader
        eyebrow="Your balances"
        title={`Hi ${firstName} — you have ${outstanding.length} ${
          outstanding.length === 1 ? "bill" : "bills"
        } outstanding.`}
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
              Across {outstanding.length}{" "}
              {outstanding.length === 1 ? "provider" : "providers"}.
              {nextDue && (
                <>
                  {" "}
                  Next due <span className="text-ink">{nextDue}</span>.
                </>
              )}
            </div>
          </div>
        </div>

        {outstanding.length > 0 && (
          <>
            <h2 className="mb-3 mt-8 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-px w-5 bg-ink-muted/50" aria-hidden />
                Outstanding bills
              </span>
            </h2>
            <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-white">
              {outstanding.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-4 px-5 py-5"
                >
                  <div>
                    <div className="text-[14px] font-medium text-ink">
                      {b.provider}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-ink-muted">
                      {b.description}
                      {b.dueDate && ` · Due ${b.dueDate}`}
                    </div>
                    {b.allowPlans && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-waystar-wash px-2 py-0.5 text-[11px] font-medium text-waystar-deep">
                        Payment plan available
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="tabular font-display text-[28px] leading-none text-ink">
                      {formatMoney(b.amountCents)}
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
          </>
        )}

        {recent.length > 0 && (
          <>
            <h2 className="mb-3 mt-8 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-px w-5 bg-ink-muted/50" aria-hidden />
                Recent payments
              </span>
            </h2>
            <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-white">
              {recent.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div>
                    <div className="text-[13.5px] text-ink">{r.provider}</div>
                    <div className="text-[11.5px] text-ink-muted">
                      {r.createdAt.toISOString().slice(0, 10)}
                    </div>
                  </div>
                  <div className="tabular text-[13.5px] text-ink">
                    {formatMoney(r.amountCents)}
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
          </>
        )}
      </PageBody>
    </>
  );
}
