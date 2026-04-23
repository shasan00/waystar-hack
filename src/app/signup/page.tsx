"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    dateOfBirth: "",
    mrn: "",
  });

  const set =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.fullName.trim().length === 0) {
      setError("Full name is required.");
      return;
    }
    if (!form.email.includes("@")) {
      setError("A valid email is required.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          profileData: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim() || null,
            dateOfBirth: form.dateOfBirth || null,
            mrn: form.mrn.trim() || null,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not create account.");
        setLoading(false);
        return;
      }
      // Auto-login using the credentials we just created so the patient lands
      // in the portal with a session, not back on the login screen.
      const signInRes = await signIn.email({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      if (signInRes.error) {
        // Account was created but auto-login failed — fall back to login page.
        router.push("/login?registered=true");
        return;
      }
      router.push("/portal");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto grid min-h-screen max-w-[1120px] grid-cols-1 md:grid-cols-2">
        <aside className="hidden border-r border-rule px-10 py-16 md:flex md:flex-col md:justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-px w-5 bg-ink-muted/50" aria-hidden />
                Patient signup
              </span>
            </div>
            <h2 className="mt-6 font-display text-[34px] leading-[1.1] tracking-tight text-ink">
              Create your account to view bills and pay online.
            </h2>
            <p className="mt-4 max-w-[46ch] text-[14px] leading-[1.6] text-ink-muted">
              Your account lets you see outstanding balances from your
              provider, pay from any device, and keep a history of every
              payment. Your data is encrypted in transit and at rest.
            </p>
          </div>
        </aside>

        <section className="flex items-center justify-center px-6 py-12 md:px-10">
          <div className="w-full max-w-[420px]">
            <div className="mb-2 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-muted md:hidden">
              Patient signup
            </div>
            <h1 className="font-display text-[36px] leading-[1.05] tracking-tight text-ink">
              Create an account.
            </h1>
            <p className="mt-2 text-[13.5px] text-ink-muted">
              Already have one?{" "}
              <Link
                href="/login"
                className="text-waystar-deep underline underline-offset-4 hover:text-waystar"
              >
                Sign in
              </Link>
              .
            </p>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-3" noValidate>
              <Field label="Full name" id="su-name">
                <input
                  id="su-name"
                  type="text"
                  value={form.fullName}
                  onChange={set("fullName")}
                  autoComplete="name"
                  required
                  className="w-full bg-transparent px-3 py-3 text-[14px] outline-none"
                />
              </Field>
              <Field label="Email" id="su-email">
                <input
                  id="su-email"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  autoComplete="email"
                  required
                  className="w-full bg-transparent px-3 py-3 text-[14px] outline-none"
                />
              </Field>
              <Field
                label="Password"
                id="su-password"
                hint="At least 8 characters."
              >
                <input
                  id="su-password"
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="w-full bg-transparent px-3 py-3 text-[14px] outline-none"
                />
              </Field>

              <details className="rounded-md border border-rule bg-white px-3 py-2">
                <summary className="cursor-pointer text-[12.5px] text-ink-muted hover:text-ink">
                  Optional details
                </summary>
                <div className="mt-3 grid gap-3">
                  <Field label="Phone" id="su-phone" compact>
                    <input
                      id="su-phone"
                      type="tel"
                      value={form.phone}
                      onChange={set("phone")}
                      autoComplete="tel"
                      className="w-full bg-transparent px-3 py-3 text-[14px] outline-none"
                    />
                  </Field>
                  <Field label="Date of birth" id="su-dob" compact>
                    <input
                      id="su-dob"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={set("dateOfBirth")}
                      className="w-full bg-transparent px-3 py-3 text-[14px] outline-none"
                    />
                  </Field>
                  <Field label="MRN" id="su-mrn" compact>
                    <input
                      id="su-mrn"
                      type="text"
                      value={form.mrn}
                      onChange={set("mrn")}
                      className="w-full bg-transparent px-3 py-3 text-[14px] outline-none"
                    />
                  </Field>
                </div>
              </details>

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-waystar px-4 text-[14px] font-medium text-white hover:bg-waystar-deep disabled:opacity-60"
              >
                {loading ? "Creating account…" : "Create account →"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  id,
  hint,
  compact,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className={[
          "block rounded-md border border-rule bg-white focus-within:border-waystar focus-within:ring-2 focus-within:ring-waystar/20",
          compact ? "" : "",
        ].join(" ")}
      >
        <span className="block px-3 pt-2 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-muted">
          {label}
        </span>
        {children}
      </label>
      {hint && (
        <p className="mt-1 px-1 text-[11px] text-ink-muted">{hint}</p>
      )}
    </div>
  );
}
