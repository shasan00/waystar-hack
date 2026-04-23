import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, PageBody } from "@/components/app-shell";
import { DEMO_PAGES, formatMoney } from "@/lib/demo-data";
import { SmsIcon } from "@/components/icons";
import { EditorTabs } from "./editor-tabs";
import { SharePanel } from "./share-panel";

export default async function PageEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const config = DEMO_PAGES[id];
  if (!config) return notFound();

  return (
    <>
      <PageHeader
        eyebrow={`Page · /pay/${config.slug}`}
        title={config.title}
        description={config.subtitle}
        actions={
          <>
            <label className="inline-flex h-10 items-center gap-2 rounded-md border border-rule bg-white px-3 text-[12.5px] text-ink">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 accent-waystar"
                aria-label="Page is enabled"
              />
              <span className="font-medium">Enabled</span>
              <span className="text-[11px] text-ink-muted">
                (payers can pay)
              </span>
            </label>
            <Link
              href={`/pay/${config.slug}`}
              target="_blank"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-rule bg-white px-3 text-[13px] text-ink hover:border-waystar"
            >
              Open live page
            </Link>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-waystar px-4 text-[13px] font-medium text-white hover:bg-waystar-deep"
            >
              <SmsIcon /> Send by text
            </button>
          </>
        }
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <EditorTabs config={config} />

          {/* Live preview & distribution */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-lg border border-rule bg-white">
              <div className="flex items-center justify-between border-b border-rule px-5 py-3">
                <div className="text-[13px] font-medium">Live preview</div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                  /pay/{config.slug}
                </span>
              </div>
              <div className="bg-canvas p-6">
                <div className="mx-auto max-w-[420px] rounded-md border border-rule bg-white p-5 shadow-[0_8px_32px_-20px_rgba(10,10,10,0.25)]">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                    {config.orgName}
                  </div>
                  <div className="mt-1 font-display text-[24px] leading-tight text-ink">
                    {config.title}
                  </div>
                  <div className="mt-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                    Amount due
                  </div>
                  <div className="tabular font-display text-[42px] leading-none text-waystar">
                    {config.fixedAmount
                      ? formatMoney(config.fixedAmount)
                      : formatMoney(config.minAmount ?? 0)}
                  </div>
                  <button className="mt-5 h-10 w-full rounded-md bg-waystar text-[13px] font-medium text-white">
                    Pay now
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-rule bg-white">
              <div className="border-b border-rule px-5 py-3 text-[13px] font-medium">
                Share this page
              </div>
              <SharePanel slug={config.slug} />
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}