import { PageHeader, PageBody } from "@/components/app-shell";
import { formatMoney } from "@/lib/demo-data";

const HISTORY = [
  { id: "QPP-8F2A-91QC", date: "2026-04-23", provider: "Memorial Health", amount: 28233, status: "succeeded", note: "Plan 1/3" },
  { id: "QPP-4C52-71WX", date: "2026-04-01", provider: "Memorial Health", amount: 14117, status: "succeeded" },
  { id: "QPP-2X01-10LP", date: "2026-03-15", provider: "Riverside Dental", amount: 27500, status: "succeeded" },
  { id: "QPP-9Z81-48MA", date: "2026-02-28", provider: "Summit Pediatrics", amount: 4500, status: "succeeded" },
  { id: "QPP-1A77-66CD", date: "2026-02-01", provider: "Memorial Health", amount: 19900, status: "refunded" },
];

export default function HistoryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Payment history"
        title="All of your payments, in one ledger."
        description="Download receipts or dispute a charge. We store every transaction for 7 years per healthcare retention guidelines."
      />
      <PageBody>
        <div className="overflow-hidden rounded-lg border border-rule bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-rule text-[11px] font-mono uppercase tracking-[0.14em] text-ink-muted">
                <th className="px-5 py-3 font-normal">Date</th>
                <th className="px-5 py-3 font-normal">Provider</th>
                <th className="px-5 py-3 font-normal">Note</th>
                <th className="px-5 py-3 font-normal">Status</th>
                <th className="px-5 py-3 text-right font-normal">Amount</th>
                <th className="px-5 py-3 text-right font-normal">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {HISTORY.map((t) => (
                <tr key={t.id} className="hover:bg-canvas">
                  <td className="px-5 py-4 tabular text-[13px] text-ink">
                    {t.date}
                  </td>
                  <td className="px-5 py-4 text-[13.5px] text-ink">
                    {t.provider}
                  </td>
                  <td className="px-5 py-4 text-[12.5px] text-ink-muted">
                    {t.note ?? "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${
                        t.status === "succeeded"
                          ? "border-success/30 text-success"
                          : "border-rule text-ink-muted"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          t.status === "succeeded"
                            ? "bg-success"
                            : "bg-ink-muted"
                        }`}
                      />
                      {t.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right tabular text-[13.5px] text-ink">
                    {formatMoney(t.amount)}
                  </td>
                  <td className="px-5 py-4 text-right text-[12.5px]">
                    <button className="text-ink-muted hover:text-waystar-deep">
                      Download
                    </button>
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
