"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({
  initialRole,
}: {
  initialRole: "admin" | "patient";
}) {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "patient">(initialRole);
  const [email, setEmail] = useState(
    initialRole === "admin"
      ? "billing@memorialhealth.demo"
      : "patient@demo.com",
  );
  const [password, setPassword] = useState("demopassword");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: wire Supabase Auth. For now, route by role.
    await new Promise((r) => setTimeout(r, 450));
    router.push(role === "admin" ? "/admin" : "/portal");
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

      <div className="mt-4 flex items-center justify-between text-[12px] text-ink-muted">
        <span>
          Demo creds are pre-filled.{" "}
          <span className="text-ink">Click sign in.</span>
        </span>
      </div>
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
