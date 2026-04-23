import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, PageBody } from "@/components/app-shell";
import { PlusIcon, CopyIcon, ArrowRightIcon } from "@/components/icons";
import { formatMoney } from "@/lib/demo-data";
import { requireAdmin } from "@/lib/auth-guard";
import { listAdminPages } from "@/db/queries";

export default async function AdminPagesListPage() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    if (guard.status === 401) redirect("/login");
    return (
      <PageBody>
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
          {guard.error}
        </div>
      </PageBody>
    );
  }
  const pages = await listAdminPages(guard.ctx.orgId);

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
        {pages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-rule bg-white px-6 py-10 text-center">
            <p className="text-[14px] text-ink">No payment pages yet.</p>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              Create one to get a shareable /pay/&lt;slug&gt; URL.
            </p>
          </div>
        ) : (
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
                  <tr key={p.id} className="hover:bg-canvas">
                    <td className="px-5 py-4">
                      <div className="text-[13.5px] font-medium text-ink">
                        {p.title}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-2 py-1 text-[12px] font-mono text-ink"
                        title={`/pay/${p.slug}`}
                      >
                        /pay/{p.slug}
                        <CopyIcon />
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[12.5px] text-ink">
                        {p.amountMode === "fixed" &&
                          `Fixed · ${formatMoney(p.fixedAmountCents ?? 0)}`}
                        {p.amountMode === "range" &&
                          `Range · ${formatMoney(p.minAmountCents ?? 0)}–${formatMoney(
                            p.maxAmountCents ?? 0,
                          )}`}
                        {p.amountMode === "open" && "Open"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {p.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-white px-2 py-0.5 text-[10.5px] font-medium text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          live
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-white px-2 py-0.5 text-[10.5px] font-medium text-ink-muted">
                          <span className="h-1.5 w-1.5 rounded-full bg-ink-muted" />
                          disabled
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/pages/${p.id}`}
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
        )}

        <p className="mt-6 text-[12px] text-ink-muted">
          Tip: keep your slugs short and readable. They appear in the URL your
          patients click from a text, email, or QR code.
        </p>
      </PageBody>
    </>
  );
}
