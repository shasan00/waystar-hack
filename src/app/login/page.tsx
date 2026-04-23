import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const initialRole: "admin" | "patient" =
    role === "patient" ? "patient" : "admin";

  return (
    <main className="relative min-h-screen bg-canvas">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[1.1fr_1fr]">
        {/* Left: brand side */}
        <div className="chart-grid relative hidden flex-col justify-between border-r border-rule bg-white/60 px-10 py-10 md:flex">
          <Wordmark size="lg" />
          <div>
            <div className="fade-up fade-up-1 mb-4 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-muted">
              <span className="h-px w-5 bg-ink-muted/50" aria-hidden />
              Quick Payment Pages
            </div>
            <h2 className="fade-up fade-up-2 max-w-[20ch] font-display text-[56px] leading-[1.02] tracking-tight text-ink">
              Payment pages that
              <br />
              <em className="not-italic text-waystar">patients</em> actually
              finish.
            </h2>
            <p className="fade-up fade-up-3 mt-6 max-w-[42ch] text-[14px] leading-[1.6] text-ink-muted">
              Sign in to configure, distribute, and track your provider's
              self-service payment pages — or as a patient, to settle an
              outstanding balance in seconds.
            </p>
          </div>
        </div>

        {/* Right: form side */}
        <div className="flex items-center justify-center px-5 py-14 md:px-16">
          <div className="w-full max-w-[400px]">
            <div className="md:hidden mb-8">
              <Wordmark />
            </div>
            <LoginForm initialRole={initialRole} />
            <p className="mt-8 text-[12px] text-ink-muted">
              By signing in, you agree to the{" "}
              <Link href="#" className="text-ink underline underline-offset-2">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="#" className="text-ink underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
