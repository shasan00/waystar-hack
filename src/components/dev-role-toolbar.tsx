"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const JUMPS = [
  { label: "Admin", href: "/admin", accent: "admin" as const },
  { label: "Patient", href: "/portal", accent: "patient" as const },
  { label: "Demo Pay", href: "/pay/memorial-health-mar-12", accent: "pay" as const },
  { label: "Inbox", href: "/dev/inbox", accent: "inbox" as const },
  { label: "Login", href: "/login", accent: "login" as const },
];

export function DevRoleToolbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const showInProd =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("dev") === "1";
  if (process.env.NODE_ENV === "production" && !showInProd) return null;
  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className="fixed bottom-3 right-3 z-50 h-8 w-8 rounded-full border border-rule bg-white/80 backdrop-blur text-[10px] font-mono text-ink-muted hover:text-ink"
        aria-label="Show dev toolbar"
      >
        dev
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-3 right-3 z-50 flex items-center gap-1 rounded-full border border-rule bg-white/85 px-1.5 py-1 shadow-[0_8px_32px_-12px_rgba(10,10,10,0.15)] backdrop-blur-md"
      role="navigation"
      aria-label="Developer role switcher"
    >
      <span className="px-2 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-muted">
        dev
      </span>
      <span className="h-4 w-px bg-rule" aria-hidden />
      {JUMPS.map((j) => {
        const active = pathname === j.href || pathname.startsWith(j.href + "/");
        return (
          <Link
            key={j.href}
            href={j.href}
            className={[
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
              active
                ? "bg-waystar text-white"
                : "text-ink hover:bg-waystar-wash hover:text-waystar-deep",
            ].join(" ")}
          >
            {j.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => setHidden(true)}
        className="ml-1 h-6 w-6 rounded-full text-[14px] leading-none text-ink-muted hover:bg-muted hover:text-ink"
        aria-label="Hide dev toolbar"
        title="Hide"
      >
        ×
      </button>
    </div>
  );
}
