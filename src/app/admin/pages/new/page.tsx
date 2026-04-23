import { PageHeader, PageBody } from "@/components/app-shell";

export default function NewPaymentPage() {
  return (
    <>
      <PageHeader
        eyebrow="New page"
        title="Create a Quick Payment Page"
        description="Name the page, pick a URL slug, then configure branding, amount, and fields."
      />
      <PageBody>
        <div className="mx-auto max-w-[640px] rounded-lg border border-rule bg-white p-6">
          <div className="mb-4 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-muted">
            Basics
          </div>
          <div className="grid gap-3">
            <input
              placeholder="Page title — e.g. March visit balance"
              className="w-full rounded-md border border-rule bg-white px-3 py-2.5 text-[14px] outline-none focus:border-waystar focus:ring-2 focus:ring-waystar/20"
            />
            <div className="flex rounded-md border border-rule bg-white focus-within:border-waystar focus-within:ring-2 focus-within:ring-waystar/20">
              <span className="rounded-l-md bg-canvas px-3 py-2.5 font-mono text-[12.5px] text-ink-muted">
                /pay/
              </span>
              <input
                placeholder="memorial-health-mar-12"
                className="w-full bg-transparent px-3 py-2.5 font-mono text-[13px] outline-none"
              />
            </div>
            <textarea
              rows={3}
              placeholder="Short description shown to the payer"
              className="w-full rounded-md border border-rule bg-white px-3 py-2.5 text-[13.5px] outline-none focus:border-waystar focus:ring-2 focus:ring-waystar/20"
            />
          </div>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button className="inline-flex h-10 items-center rounded-md border border-rule bg-white px-4 text-[13px] hover:border-waystar">
              Cancel
            </button>
            <button className="inline-flex h-10 items-center rounded-md bg-waystar px-4 text-[13px] font-medium text-white hover:bg-waystar-deep">
              Continue to configuration →
            </button>
          </div>
        </div>
      </PageBody>
    </>
  );
}
