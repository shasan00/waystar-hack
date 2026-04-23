"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { SignOutButton } from "@/components/sign-out-button";

export type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
};

export function AppShell({
  role,
  nav,
  user,
  children,
}: {
  role: "admin" | "patient";
  nav: NavItem[];
  user: { name: string; email: string; subtitle?: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed left-0 top-0 hidden h-screen w-[232px] flex-col border-r border-rule bg-white md:flex">
        <div className="flex h-14 items-center px-5 border-b border-rule">
          <Wordmark />
        </div>
        <div className="px-3 pt-2 pb-1">
          <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.18em] text-ink-muted">
            <span className="h-px w-4 bg-ink-muted/40" aria-hidden />
            {role === "admin" ? "Admin portal" : "Patient portal"}
          </div>
        </div>
        <nav className="flex flex-col gap-0.5 px-2 py-2">
          {nav.map((n) => {
            const active =
              pathname === n.href ||
              (n.href !== "/admin" &&
                n.href !== "/portal" &&
                pathname.startsWith(n.href));
            const exactRoot =
              (n.href === "/admin" || n.href === "/portal") &&
              pathname === n.href;
            const isActive = active || exactRoot;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={[
                  "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors",
                  isActive
                    ? "bg-waystar-wash text-waystar-deep"
                    : "text-ink hover:bg-muted",
                ].join(" ")}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 bg-waystar"
                    aria-hidden
                  />
                )}
                {n.icon && <span className="opacity-80">{n.icon}</span>}
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-rule p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-waystar-wash text-[11px] font-mono uppercase text-waystar-deep">
              {user.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[12.5px] font-medium text-ink">
                {user.name}
              </div>
              <div className="truncate text-[11px] text-ink-muted">
                {user.subtitle ?? user.email}
              </div>
            </div>
          </div>
          <div className="mt-1 flex items-center justify-end px-2">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="md:pl-[232px]">{children}</main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="border-b border-rule bg-white/60 px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-end justify-between gap-6">
        <div>
          {eyebrow && (
            <div className="fade-up fade-up-1 mb-2 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-muted">
              <span className="h-px w-5 bg-ink-muted/50" aria-hidden />
              {eyebrow}
            </div>
          )}
          <h1 className="fade-up fade-up-2 font-display text-[38px] leading-[1.05] tracking-tight text-ink md:text-[44px]">
            {title}
          </h1>
          {description && (
            <p className="fade-up fade-up-3 mt-2 max-w-[62ch] text-[14px] text-ink-muted">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="fade-up fade-up-3 flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function PageBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-[1120px]">{children}</div>
    </div>
  );
}
