import { PageHeader, PageBody } from "@/components/app-shell";
import { formatMoney } from "@/lib/demo-data";

const TXNS = [
  { id: "QPP-8F2A-91QC", date: "2026-04-23 14:02", page: "Memorial Health — 3/12", amount: 28233, method: "card", status: "succeeded", gl: "4201-PAT" },
  { id: "QPP-7D11-02KA", date: "2026-04-23 13:50", page: "Summit Pediatrics", amount: 4500, method: "card", status: "succeeded", gl: "4120-COP" },
  { id: "QPP-1F3C-55TE", date: "2026-04-23 13:33", page: "Memorial Health — 3/12", amount: 84700, method: "card", status: "failed", gl: "4201-PAT" },
  { id: "QPP-6B92-88MD", date: "2026-04-23 13:06", page: "Summit Pediatrics", amount: 7500, method: "card", status: "succeeded", gl: "4120-COP" },
  { id: "QPP-9A40-20FE", date: "2026-04-23 12:17", page: "Memorial Health — 3/12", amount: 28233, method: "card", status: "succeeded", gl: "4201-PAT" },
  { id: "QPP-4C52-71WX", date: "2026-04-23 11:02", page: "Memorial Health — 3/12", amount: 14117, method: "card", status: "succeeded", gl: "4201-PAT" },
  { id: "QPP-2E89-03BN", date: "2026-04-23 10:45", page: "Summit Pediatrics", amount: 12500, method: "card", status: "succeeded", gl: "4120-COP" },
];

export default function ReportsPage() {
  const total = TXNS.filter((t) => t.status === "succeeded").reduce(
    (s, t) => s + t.amount,
    0,
  );
  const avg = Math.round(total / Math.max(1, TXNS.filter((t) => t.status === "succeeded").length));

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Payment activity"
        description="Filter, inspect, and export transactions across all pages."
        actions={
          <button className="inline-flex h-10 items-center gap-2 rounded-md border border-rule bg-white px-3 text-[13px] hover:border-waystar">
            Export CSV
          </button>
        }
      />
      <PageBody>
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rule bg-white p-2">
          <select className="h-8 rounded-md border border-rule bg-canvas px-2 text-[12.5px]">
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
          <select className="h-8 rounded-md border border-rule bg-canvas px-2 text-[12.5px]">
            <option>All pages</option>
            <option>Memorial Health — 3/12</option>
            <option>Summit Pediatrics</option>
          </select>
          <select className="h-8 rounded-md border border-rule bg-canvas px-2 text-[12.5px]">
            <option>All statuses</option>
            <option>Succeeded</option>
            <option>Failed</option>
          </select>
          <div className="ml-auto text-[11.5px] text-ink-muted">
            {TXNS.length} transactions
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule bg-rule md:grid-cols-4">
          <Kpi label="Collected" value={formatMoney(total)} accent />
          <Kpi label="Transactions" value={String(TXNS.length)} />
          <Kpi label="Avg payment" value={formatMoney(avg)} />
          <Kpi label="Failure rate" value={`${Math.round((TXNS.filter(t => t.status === "failed").length / TXNS.length) * 100)}%`} />
        </div>

        {/* Breakdowns */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Breakdown
            title="By GL code"
            rows={[
              { label: "4201-PAT", value: 70583, bar: 0.8 },
              { label: "4120-COP", value: 24500, bar: 0.26 },
            ]}
          />
          <Breakdown
            title="By payment method"
            rows={[
              { label: "Credit card", value: 95083, bar: 1.0 },
              { label: "Wallet", value: 0, bar: 0 },
              { label: "ACH", value: 0, bar: 0 },
            ]}
          />
        </div>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-lg border border-rule bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-rule text-[11px] font-mono uppercase tracking-[0.14em] text-ink-muted">
                <th className="px-4 py-3 font-normal">Txn ID</th>
                <th className="px-4 py-3 font-normal">Date</th>
                <th className="px-4 py-3 font-normal">Page</th>
                <th className="px-4 py-3 font-normal">GL</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {TXNS.map((t) => (
                <tr key={t.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 font-mono text-[12px] text-ink">
                    {t.id}
                  </td>
                  <td className="px-4 py-3 tabular text-[12.5px] text-ink-muted">
                    {t.date}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink">{t.page}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink-muted">
                    {t.gl}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${
                        t.status === "succeeded"
                          ? "border-success/30 text-success"
                          : "border-destructive/30 text-destructive"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${t.status === "succeeded" ? "bg-success" : "bg-destructive"}`}
                      />
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular text-[13.5px] text-ink">
                    {formatMoney(t.amount)}
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
  rows: { label: string; value: number; bar: number }[];
}) {
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <div className="rounded-lg border border-rule bg-white">
      <div className="border-b border-rule px-5 py-3 text-[13px] font-medium">
        {title}
      </div>
      <ul className="p-5">
        {rows.map((r) => (
          <li key={r.label} className="mb-3 last:mb-0">
            <div className="mb-1 flex items-center justify-between text-[12.5px]">
              <span className="font-mono text-ink-muted">{r.label}</span>
              <span className="tabular text-ink">
                {formatMoney(r.value)}
              </span>
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
