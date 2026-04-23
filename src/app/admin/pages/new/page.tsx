"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PageHeader, PageBody } from "@/components/app-shell";
import { SLUG_RE } from "@/lib/validation/page-config";

export default function NewPaymentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedSlug = slug.trim().toLowerCase();
    if (trimmedTitle.length === 0) {
      setError("Title is required.");
      return;
    }
    if (!SLUG_RE.test(trimmedSlug)) {
      setError("Slug must be 3–60 lowercase letters, digits, or hyphens.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          slug: trimmedSlug,
          subtitle: subtitle.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Failed to create page.");
        setSubmitting(false);
        return;
      }
      router.push(`/admin/pages/${json.id}`);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="New page"
        title="Create a Quick Payment Page"
        description="Name the page, pick a URL slug, then configure branding, amount, and fields."
      />
      <PageBody>
        <form
          onSubmit={onSubmit}
          className="mx-auto max-w-[640px] rounded-lg border border-rule bg-white p-6"
        >
          <div className="mb-4 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-muted">
            Basics
          </div>
          <div className="grid gap-3">
            <label className="sr-only" htmlFor="np-title">
              Page title
            </label>
            <input
              id="np-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title — e.g. March visit balance"
              className="w-full rounded-md border border-rule bg-white px-3 py-2.5 text-[14px] outline-none focus:border-waystar focus:ring-2 focus:ring-waystar/20"
              required
            />
            <label className="sr-only" htmlFor="np-slug">
              URL slug
            </label>
            <div className="flex rounded-md border border-rule bg-white focus-within:border-waystar focus-within:ring-2 focus-within:ring-waystar/20">
              <span className="rounded-l-md bg-canvas px-3 py-2.5 font-mono text-[12.5px] text-ink-muted">
                /pay/
              </span>
              <input
                id="np-slug"
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                }
                placeholder="memorial-health-mar-12"
                className="w-full bg-transparent px-3 py-2.5 font-mono text-[13px] outline-none"
                required
                pattern="[a-z0-9-]{3,60}"
                aria-describedby="np-slug-help"
              />
            </div>
            <p id="np-slug-help" className="text-[11px] text-ink-muted">
              Lowercase letters, digits, and hyphens. 3–60 characters. Cannot be
              changed after creation.
            </p>
            <label className="sr-only" htmlFor="np-subtitle">
              Subtitle
            </label>
            <textarea
              id="np-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={3}
              placeholder="Short description shown to the payer"
              className="w-full rounded-md border border-rule bg-white px-3 py-2.5 text-[13.5px] outline-none focus:border-waystar focus:ring-2 focus:ring-waystar/20"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12.5px] text-destructive"
            >
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/pages")}
              className="inline-flex h-10 items-center rounded-md border border-rule bg-white px-4 text-[13px] hover:border-waystar"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center rounded-md bg-waystar px-4 text-[13px] font-medium text-white hover:bg-waystar-deep disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Continue to configuration →"}
            </button>
          </div>
        </form>
      </PageBody>
    </>
  );
}
