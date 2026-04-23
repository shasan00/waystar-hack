import Link from "next/link";
import { PageHeader, PageBody } from "@/components/app-shell";
import { PlusIcon, CopyIcon, ArrowRightIcon } from "@/components/icons";
import { DEMO_PAGES, formatMoney } from "@/lib/demo-data";

export default function AdminPagesListPage() {
  const pages = Object.values(DEMO_PAGES);
  return (
    <>
      <PageHeader
        eyebrow="Payment pages"
        title="Your Quick Payment Pages"
        description="Each page is a reusable, shareable URL your patients can visit, scan, or receive by text."
        actions={
          <Link
            href="/admin/pages/new"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-waystar px-4 text-[13px] font-medium text-white hover:bg-waystar-deep"
          >
            <PlusIcon /> New page
          </Link>
        }
      />
      <PageBody>
        <div className="overflow-hidden rounded-lg border border-rule bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-rule text-[11px] font-mono uppercase tracking-[0.14em] text-ink-muted">
                <th className="px-5 py-3 font-normal">Page</th>
                <th className="px-5 py-3 font-normal">URL</th>
                <th className="px-5 py-3 font-normal">Amount mode</th>
                <th className="px-5 py-3 font-normal">Status</th>
                <th className="px-5 py-3 font-normal" />
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {pages.map((p) => (
                <tr key={p.slug} className="hover:bg-canvas">
                  <td className="px-5 py-4">
                    <div className="text-[13.5px] font-medium text-ink">
                      {p.orgName}
                    </div>
                    <div className="text-[12px] text-ink-muted">{p.title}</div>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      className="group inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-2 py-1 text-[12px] font-mono text-ink hover:border-waystar"
                      title="Copy URL"
                    >
                      /pay/{p.slug}
                      <CopyIcon />
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[12.5px] text-ink">
                      {p.amountMode === "fixed" &&
                        `Fixed · ${formatMoney(p.fixedAmount!)}`}
                      {p.amountMode === "range" &&
                        `Range · ${formatMoney(p.minAmount!)}–${formatMoney(
                          p.maxAmount!,
                        )}`}
                      {p.amountMode === "open" && "Open"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-white px-2 py-0.5 text-[10.5px] font-medium text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      live
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/pages/${p.slug}`}
                      className="inline-flex items-center gap-1 text-[12.5px] text-ink hover:text-waystar-deep"
                    >
                      Edit <ArrowRightIcon />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-[12px] text-ink-muted">
          Tip: keep your slugs short and readable. They appear in the URL your
          patients click from a text, email, or QR code.
        </p>
      </PageBody>
    </>
  );
}
