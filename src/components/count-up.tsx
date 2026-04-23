"use client";

import { useEffect, useRef, useState } from "react";

const currencyFormatter = (n: number) =>
  (n / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const FORMATTERS = {
  currencyCents: currencyFormatter,
} as const;

export function CountUp({
  to,
  durationMs = 700,
  format = "currencyCents",
  className,
}: {
  to: number;
  durationMs?: number;
  format?: keyof typeof FORMATTERS;
  className?: string;
}) {
  const formatFn = FORMATTERS[format];
  const [value, setValue] = useState(0);
  const start = useRef<number | null>(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion.current) {
      setValue(to);
      return;
    }

    let raf = 0;
    const step = (ts: number) => {
      if (start.current === null) start.current = ts;
      const elapsed = ts - start.current;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, durationMs]);

  return (
    <span className={className} aria-live="polite">
      {formatFn(value)}
    </span>
  );
}
