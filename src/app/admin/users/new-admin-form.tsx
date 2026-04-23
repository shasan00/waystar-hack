"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewAdminForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setOk(false);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, title, password }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create admin.");
      return;
    }
    setOk(true);
    setEmail("");
    setFullName("");
    setTitle("");
    setPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <Field label="Full name" id="fullName">
        <input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          className="w-full bg-transparent px-3 py-2.5 text-[14px] outline-none"
        />
      </Field>
      <Field label="Email" id="email">
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="off"
          className="w-full bg-transparent px-3 py-2.5 text-[14px] outline-none"
        />
      </Field>
      <Field label="Title (optional)" id="title">
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent px-3 py-2.5 text-[14px] outline-none"
        />
      </Field>
      <Field label="Temporary password" id="password">
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full bg-transparent px-3 py-2.5 text-[14px] outline-none"
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
      {ok && (
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700"
        >
          Admin created. Share their credentials securely.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 inline-flex h-10 items-center justify-center rounded-md bg-waystar px-4 text-[13.5px] font-medium text-white hover:bg-waystar-deep disabled:opacity-60"
      >
        {submitting ? "Creating…" : "Create admin"}
      </button>
    </form>
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
