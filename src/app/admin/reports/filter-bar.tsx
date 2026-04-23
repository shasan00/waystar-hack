"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

interface PageOption {
  id: string;
  title: string;
}

export function FilterBar({
  pages,
  totalCount,
}: {
  pages: PageOption[];
  totalCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  }

  const range = params.get("range") ?? "30d";
  const pageId = params.get("pageId") ?? "";
  const status = params.get("status") ?? "";

  function handleRange(v: string) {
    const next = new URLSearchParams(params.toString());
    next.set("range", v);
    const now = new Date();
    if (v === "24h") {
      next.set("from", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());
      next.delete("to");
    } else if (v === "7d") {
      next.set("from", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
      next.delete("to");
    } else if (v === "30d") {
      next.set("from", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());
      next.delete("to");
    } else {
      next.delete("from");
      next.delete("to");
    }
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  }

  const exportHref = `/api/admin/reports/export.csv?${params.toString()}`;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rule bg-white p-2">
      <select
        value={range}
        onChange={(e) => handleRange(e.target.value)}
        aria-label="Date range"
        className="h-8 rounded-md border border-rule bg-canvas px-2 text-[12.5px]"
      >
        <option value="24h">Last 24 hours</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="all">All time</option>
      </select>
      <select
        value={pageId}
        onChange={(e) => setParam("pageId", e.target.value)}
        aria-label="Payment page"
        className="h-8 rounded-md border border-rule bg-canvas px-2 text-[12.5px]"
      >
        <option value="">All pages</option>
        {pages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => setParam("status", e.target.value)}
        aria-label="Status"
        className="h-8 rounded-md border border-rule bg-canvas px-2 text-[12.5px]"
      >
        <option value="">All statuses</option>
        <option value="succeeded">Succeeded</option>
        <option value="failed">Failed</option>
        <option value="pending">Pending</option>
        <option value="refunded">Refunded</option>
      </select>
      <div className="ml-auto flex items-center gap-3 text-[11.5px] text-ink-muted">
        <span>{totalCount} transactions</span>
        <a
          href={exportHref}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-rule bg-white px-3 text-[12.5px] text-ink hover:border-waystar"
        >
          Export CSV
        </a>
      </div>
    </div>
  );
}
