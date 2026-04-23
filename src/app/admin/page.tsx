import Link from "next/link";
import { PageHeader, PageBody } from "@/components/app-shell";
import { PlusIcon, ArrowRightIcon } from "@/components/icons";
import { formatMoney, DEMO_PAGES } from "@/lib/demo-data";

const FAKE_STATS = [
  { label: "Collected today", value: 2847_50, delta: "+12%" },
  { label: "Transactions", value: 18, suffix: "" },
  { label: "Avg payment", value: 158_19 },
  { label: "Plans active", value: 6, suffix: "" },
];

const FAKE_RECENT = [
  {
    id: "QPP-8F2A-91QC",
    page: "Memorial Health — 3/12 Visit",
    amount: 282_33,
    status: "succeeded",
    when: "2m ago",
    plan: "1/3",
  },
  {
    id: "QPP-7D11-02KA",
    page: "Summit Pediatrics — Well-visit",
    amount: 45_00,
    status: "succeeded",
    when: "14m ago",
  },
  {
    id: "QPP-1F3C-55TE",
    page: "Memorial Health — 3/12 Visit",
    amount: 84_700,
    status: "failed",
    when: "31m ago",
  },
  {
    id: "QPP-6B92-88MD",
    page: "Summit Pediatrics — Well-visit",
    amount: 75_00,
    status: "succeeded",
    when: "58m ago",
  },
];

export default function AdminOverviewPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin overview"
        title="Good afternoon, Sarah."
        description="Here's your billing activity across all Quick Payment Pages."
        actions={
          <Link
            href="/admin/pages?new=1"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-waystar px-4 text-[13px] font-medium text-white hover:bg-waystar-deep"
          >
            <PlusIcon /> New payment page
          </Link>
        }
      />
      <PageBody>
        {/* KPI tiles */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule bg-rule md:grid-cols-4">
          {FAKE_STATS.map((s, i) => (
            <div
              key={s.label}
              className={`fade-up fade-up-${Math.min(i + 1, 5)} bg-white p-6`}
            >
              <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-muted">
                {s.label}
              </div>
              <div className="mt-2 tabular font-display text-[36px] leading-none text-ink">
                {typeof s.value === "number" && s.value > 999
                  ? formatMoney(s.value)
                  : s.value}
              </div>
              {s.delta && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-waystar-wash px-2 py-0.5 text-[11px] font-medium text-waystar-deep">
                  {s.delta} vs yesterday
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Two columns: recent activity + pages */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg border border-rule bg-white">
            <div className="flex items-center justify-between border-b border-rule px-5 py-3">
              <div className="text-[13px] font-medium">Recent activity</div>
              <Link
                href="/admin/reports"
                className="inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-waystar-deep"
              >
                Full report <ArrowRightIcon />
              </Link>
            </div>
            <ul className="divide-y divide-rule">
              {FAKE_RECENT.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] text-ink">
                      {r.page}
                      {r.plan && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-waystar-wash px-2 py-0.5 text-[10px] font-mono tracking-wider text-waystar-deep">
                          PLAN {r.plan}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-ink-muted">
                      <span className="font-mono">{r.id}</span>
                      <span aria-hidden>·</span>
                      <span>{r.when}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabular text-[14px] text-ink">
                      {formatMoney(r.amount)}
                    </div>
                    <div
                      className={`text-[11px] ${
                        r.status === "succeeded"
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {r.status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-rule bg-white">
            <div className="flex items-center justify-between border-b border-rule px-5 py-3">
              <div className="text-[13px] font-medium">Payment pages</div>
              <Link
                href="/admin/pages"
                className="inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-waystar-deep"
              >
                Manage <ArrowRightIcon />
              </Link>
            </div>
            <ul className="divide-y divide-rule">
              {Object.values(DEMO_PAGES).map((p) => (
                <li key={p.slug} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13.5px] font-medium text-ink">
                        {p.orgName}
                      </div>
                      <div className="text-[12px] text-ink-muted">
                        /pay/{p.slug}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-white px-2 py-0.5 text-[10.5px] font-medium text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      live
                    </span>
                  </div>
                  <div className="mt-2 text-[12px] text-ink-muted">
                    {p.title}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PageBody>
    </>
  );
}
