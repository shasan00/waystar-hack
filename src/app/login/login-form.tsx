"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { finalizeSignupAction, getSessionRoleAction } from "./actions";

type Role = "admin" | "patient";
type Mode = "signin" | "signup";

const DEMO_CREDS: Record<Role, { email: string; password: string }> = {
  admin: { email: "billing@memorialhealth.demo", password: "demopassword" },
  patient: { email: "patient@demo.com", password: "demopassword" },
};

export function LoginForm({ initialRole }: { initialRole: Role }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState(DEMO_CREDS[initialRole].email);
  const [password, setPassword] = useState(DEMO_CREDS[initialRole].password);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function swapRole(r: Role) {
    setRole(r);
    setError(null);
    if (mode === "signin") {
      setEmail(DEMO_CREDS[r].email);
      setPassword(DEMO_CREDS[r].password);
    }
  }

  function swapMode(m: Mode) {
    setMode(m);
    setError(null);
    if (m === "signin") {
      setEmail(DEMO_CREDS[role].email);
      setPassword(DEMO_CREDS[role].password);
    } else {
      setEmail("");
      setPassword("");
      setFullName("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) {
          throw new Error(res.error.message ?? "Invalid email or password");
        }
        // Fetch the actual stored role (demo users' roles are set by the seed)
        const dbRole = (await getSessionRoleAction()) ?? role;
        router.push(dbRole === "admin" ? "/admin" : "/portal");
        router.refresh();
      } else {
        const res = await authClient.signUp.email({
          email,
          password,
          name: fullName || email.split("@")[0],
        });
        if (res.error) {
          throw new Error(res.error.message ?? "Sign up failed");
        }
        await finalizeSignupAction({
          role,
          fullName: fullName || email.split("@")[0],
        });
        router.push(role === "admin" ? "/admin" : "/portal");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-2 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-5 bg-ink-muted/50" aria-hidden />
          {mode === "signin" ? "Sign in" : "Create account"}
        </span>
      </div>
      <h1 className="font-display text-[40px] leading-[1.05] tracking-tight text-ink">
        {mode === "signin" ? "Welcome back." : "Welcome."}
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
            onClick={() => swapRole(r)}
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

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3" noValidate>
        {mode === "signup" && (
          <Field label="Full name" id="fullname">
            <input
              id="fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
              className="w-full bg-transparent px-3 py-3 text-[14px] outline-none"
            />
          </Field>
        )}
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
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            minLength={8}
            required
            className="w-full bg-transparent px-3 py-3 text-[14px] outline-none"
          />
        </Field>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12.5px] text-destructive"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-waystar px-4 text-[14px] font-medium text-white hover:bg-waystar-deep disabled:opacity-60"
        >
          {loading
            ? mode === "signin"
              ? "Signing in…"
              : "Creating account…"
            : mode === "signin"
              ? role === "admin"
                ? "Sign in to admin →"
                : "Sign in to portal →"
              : role === "admin"
                ? "Create admin account →"
                : "Create patient account →"}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-[12px] text-ink-muted">
        {mode === "signin" ? (
          <>
            <span>
              Demo creds are pre-filled.{" "}
              <span className="text-ink">Click sign in.</span>
            </span>
            <button
              type="button"
              className="text-waystar-deep hover:underline"
              onClick={() => swapMode("signup")}
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            <span>
              {role === "admin"
                ? "Admin accounts attach to the default organization."
                : "Patients can see and pay their outstanding bills."}
            </span>
            <button
              type="button"
              className="text-waystar-deep hover:underline"
              onClick={() => swapMode("signin")}
            >
              Already have an account?
            </button>
          </>
        )}
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
