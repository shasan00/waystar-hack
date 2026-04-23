"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";

export function LoginForm({
  initialRole,
}: {
  initialRole: "admin" | "patient";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const registered = searchParams.get("registered") === "true";
  const [role, setRole] = useState<"admin" | "patient">(initialRole);
  const [email, setEmail] = useState(
    initialRole === "admin"
      ? "billing@memorialhealth.demo"
      : "patient@demo.com",
  );
  const [password, setPassword] = useState("demopassword");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn.email({ email, password });
    if (res.error) {
      setLoading(false);
      setError(res.error.message ?? "Sign-in failed.");
      return;
    }
    const dest =
      redirectParam && redirectParam.startsWith("/")
        ? redirectParam
        : role === "admin"
          ? "/admin"
          : "/portal";
    router.push(dest);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-2 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-5 bg-ink-muted/50" aria-hidden />
          Sign in
        </span>
      </div>
      <h1 className="font-display text-[40px] leading-[1.05] tracking-tight text-ink">
        Welcome back.
      </h1>

      {/* Role tabs */}
      <div
        role="tablist"
        aria-label="Account type"
        className="mt-6 inline-flex rounded-md border border-rule bg-white p-1"
      >
        {(["admin", "patient"] as const).map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            onClick={() => {
              setRole(r);
              setEmail(
                r === "admin"
                  ? "billing@memorialhealth.demo"
                  : "patient@demo.com",
              );
            }}
            className={[
              "rounded-[5px] px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
              role === r
                ? "bg-waystar text-white"
                : "text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {r === "admin" ? "Provider admin" : "Patient"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
        <Field label="Email" id="email">
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full bg-transparent px-3 py-3 text-[14px] outline-none"
          />
        </Field>
        <Field label="Password" id="password">
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full bg-transparent px-3 py-3 text-[14px] outline-none"
          />
        </Field>

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
          {loading
            ? "Signing in…"
            : role === "admin"
              ? "Sign in to admin →"
              : "Sign in to portal →"}
        </button>
      </form>

      {registered && (
        <p
          role="status"
          className="mt-4 rounded-md border border-success/30 bg-white px-3 py-2 text-[12.5px] text-success"
        >
          Account created. Sign in with your new credentials.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between text-[12px] text-ink-muted">
        <span>
          Demo creds are pre-filled.{" "}
          <span className="text-ink">Click sign in.</span>
        </span>
      </div>

      {role === "patient" && (
        <p className="mt-3 text-[12.5px] text-ink-muted">
          New patient?{" "}
          <Link
            href="/signup"
            className="text-waystar-deep underline underline-offset-4 hover:text-waystar"
          >
            Create an account
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="block rounded-md border border-rule bg-white focus-within:border-waystar focus-within:ring-2 focus-within:ring-waystar/20"
    >
      <span className="block px-3 pt-2 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
