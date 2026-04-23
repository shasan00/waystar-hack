import { PageHeader, PageBody } from "@/components/app-shell";
import { formatMoney } from "@/lib/demo-data";
import { db } from "@/db/client";
import { paymentPages } from "@/db/schema";
import { asc } from "drizzle-orm";
import {
  breakdownByGlCode,
  breakdownByPaymentMethod,
  listTransactions,
  summarize,
  parseFilters,
} from "@/lib/reports/queries";
import { FilterBar } from "./filter-bar";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") params.set(k, v);
    else if (Array.isArray(v) && v[0]) params.set(k, v[0]);
  }
  // Default to last 30 days if no range specified — matches the filter default.
  if (!params.has("from") && !params.has("range")) {
    params.set(
      "from",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    );
  }
  const filters = parseFilters(params);

  const [pages, { rows, total }, summary, byGl, byMethod] = await Promise.all([
    db
      .select({ id: paymentPages.id, title: paymentPages.title })
      .from(paymentPages)
      .orderBy(asc(paymentPages.title)),
    listTransactions(filters, { limit: 200, offset: 0 }),
    summarize(filters),
    breakdownByGlCode(filters),
    breakdownByPaymentMethod(filters),
  ]);

  const glRows = byGl.map((r) => ({
    label: r.label,
    value: r.amountCents,
  }));
  const methodRows = byMethod.map((r) => ({
    label:
      r.label === "card"
        ? "Credit card"
        : r.label === "wallet"
          ? "Wallet"
          : "ACH",
    value: r.amountCents,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Payment activity"
        description="Filter, inspect, and export transactions across all pages."
      />
      <PageBody>
        <FilterBar pages={pages} totalCount={total} />

        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule bg-rule md:grid-cols-4">
          <Kpi label="Collected" value={formatMoney(summary.collectedCents)} accent />
          <Kpi label="Transactions" value={String(summary.totalCount)} />
          <Kpi label="Avg payment" value={formatMoney(summary.averageCents)} />
          <Kpi
            label="Failure rate"
            value={`${Math.round(summary.failureRate * 100)}%`}
          />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Breakdown title="By GL code" rows={glRows} />
          <Breakdown title="By payment method" rows={methodRows} />
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-rule bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-rule text-[11px] font-mono uppercase tracking-[0.14em] text-ink-muted">
                <th className="px-4 py-3 font-normal">Txn ID</th>
                <th className="px-4 py-3 font-normal">Date</th>
                <th className="px-4 py-3 font-normal">Page</th>
                <th className="px-4 py-3 font-normal">GL</th>
                <th className="px-4 py-3 font-normal">Method</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-[13px] text-ink-muted"
                  >
                    No transactions match the current filters.
                  </td>
                </tr>
              )}
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 font-mono text-[12px] text-ink">
                    {t.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 tabular text-[12.5px] text-ink-muted">
                    {t.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink">
                    {t.pageTitle}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink-muted">
                    {t.glCodeAtPayment ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] capitalize text-ink-muted">
                    {t.paymentMethod}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular text-[13.5px] text-ink">
                    {formatMoney(t.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageBody>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "succeeded"
      ? "border-success/30 text-success"
      : status === "failed"
        ? "border-destructive/30 text-destructive"
        : "border-rule text-ink-muted";
  const dot =
    status === "succeeded"
      ? "bg-success"
      : status === "failed"
        ? "bg-destructive"
        : "bg-ink-muted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white p-5">
      <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </div>
      <div
        className={`mt-1 tabular font-display text-[32px] leading-none ${accent ? "text-waystar" : "text-ink"}`}
      >
        {value}
      </div>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  return (
    <div className="rounded-lg border border-rule bg-white">
      <div className="border-b border-rule px-5 py-3 text-[13px] font-medium">
        {title}
      </div>
      <ul className="p-5">
        {rows.length === 0 && (
          <li className="text-[12.5px] text-ink-muted">No data.</li>
        )}
        {rows.map((r) => (
          <li key={r.label} className="mb-3 last:mb-0">
            <div className="mb-1 flex items-center justify-between text-[12.5px]">
              <span className="font-mono text-ink-muted">{r.label}</span>
              <span className="tabular text-ink">{formatMoney(r.value)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full rounded-full bg-waystar"
                style={{
                  width: `${Math.round((r.value / (max || 1)) * 100)}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
