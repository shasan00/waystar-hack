"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  to: number;
  durationMs?: number;
  className?: string;
  /**
   * Built-in format modes — keep this a plain string so the component can be
   * used from server components (Next.js 16 disallows passing function props
   * across the RSC boundary).
   */
  mode?: "currency-cents" | "integer";
}

export function CountUp({
  to,
  durationMs = 700,
  className,
  mode = "integer",
}: Props) {
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
      {format(value, mode)}
    </span>
  );
}

function format(n: number, mode: Props["mode"]): string {
  if (mode === "currency-cents") {
    return (n / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  }
  return n.toLocaleString("en-US");
}
