import Link from "next/link";

export function Wordmark({
  href = "/",
  size = "md",
  muted = false,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  muted?: boolean;
}) {
  const sizes = {
    sm: "text-[13px]",
    md: "text-[15px]",
    lg: "text-[17px]",
  } as const;

  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 ${sizes[size]} font-medium tracking-tight ${
        muted ? "text-ink-muted" : "text-ink"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width={size === "lg" ? 22 : 18}
        height={size === "lg" ? 22 : 18}
        aria-hidden
        className="shrink-0"
      >
        <path
          d="M3 20 L9 4 L12 13 L15 4 L21 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-waystar"
        />
      </svg>
      <span>
        waystar<span className="text-waystar">·</span>qpp
      </span>
    </Link>
  );
}

export function ShieldBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-white px-2.5 py-1 text-[11px] font-medium text-ink-muted"
      aria-label="Encrypted, PCI-compliant payment"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 2 L20 5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M8.5 12 L11 14.5 L15.5 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Encrypted · PCI-compliant
    </span>
  );
}
