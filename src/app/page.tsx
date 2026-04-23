import Link from "next/link";
import { Wordmark, ShieldBadge } from "@/components/wordmark";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-canvas">
      <div className="chart-grid">
        <header className="border-b border-rule">
          <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-5">
            <Wordmark />
            <div className="flex items-center gap-3 text-[13px]">
              <Link
                href="/login?role=admin"
                className="text-ink hover:text-waystar-deep"
              >
                Admin
              </Link>
              <Link
                href="/login?role=patient"
                className="text-ink hover:text-waystar-deep"
              >
                Patient
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-8 items-center rounded-md border border-rule bg-white px-3 text-[12.5px] font-medium text-ink hover:border-waystar hover:text-waystar-deep"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="inline-flex h-8 items-center rounded-md bg-waystar px-3 text-[12.5px] font-medium text-white hover:bg-waystar-deep"
              >
                Sign in →
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-[1120px] px-5 pb-20 pt-20 md:pt-28">
          <div className="fade-up fade-up-1 mb-5 inline-flex items-center gap-2 rounded-full border border-rule bg-white px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-waystar" aria-hidden />
            Waystar QPP — hackathon prototype
          </div>
          <h1 className="fade-up fade-up-2 max-w-[18ch] font-display text-[58px] leading-[1.02] tracking-tight text-ink md:text-[92px]">
            Collect patient
            <br />
            balances the
            <br />
            way <em className="not-italic text-waystar">patients</em> prefer.
          </h1>
          <p className="fade-up fade-up-3 mt-6 max-w-[60ch] text-[16px] leading-[1.6] text-ink-muted">
            Configure branded, self-service payment pages in minutes. Share by
            URL, QR, iframe — or let our assistant text them to your patients
            and negotiate a payment plan on your behalf.
          </p>

          <div className="fade-up fade-up-4 mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex h-11 items-center rounded-md bg-waystar px-5 text-[14px] font-medium text-white hover:bg-waystar-deep"
            >
              Open admin portal
              <span className="ml-2">→</span>
            </Link>
            <Link
              href="/pay/memorial-health-mar-12"
              className="inline-flex h-11 items-center rounded-md border border-rule bg-white px-5 text-[14px] font-medium text-ink hover:border-waystar hover:text-waystar-deep"
            >
              See a live payment page
            </Link>
            <ShieldBadge />
          </div>
        </section>
      </div>

      <footer>
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-6 text-[12px] text-ink-muted">
          <Wordmark size="sm" muted />
          <span>A hackathon build · not affiliated with production Waystar.</span>
        </div>
      </footer>
    </main>
  );
}
