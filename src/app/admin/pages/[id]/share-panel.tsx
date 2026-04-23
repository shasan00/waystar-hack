"use client";

import { useEffect, useMemo, useState } from "react";
import { CopyIcon, LinkIcon, QRCodeIcon } from "@/components/icons";

type CopyKey = "url" | "iframe";

export function SharePanel({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState<string | null>(
    process.env.NEXT_PUBLIC_SITE_URL ?? null,
  );
  const [copied, setCopied] = useState<CopyKey | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!origin && typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, [origin]);

  const publicUrl = useMemo(
    () => (origin ? `${origin.replace(/\/$/, "")}/pay/${slug}` : `/pay/${slug}`),
    [origin, slug],
  );

  const iframeSnippet = useMemo(
    () =>
      `<iframe src="${publicUrl}" width="100%" height="800" style="border:0"></iframe>`,
    [publicUrl],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const QRCode = (await import("qrcode")).default;
      const data = await QRCode.toDataURL(publicUrl, { margin: 1, width: 192 });
      if (!cancelled) setQrPreview(data);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  async function copyText(key: CopyKey, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      // Clipboard blocked — nothing useful to fall back to in modern browsers.
    }
  }

  async function downloadPng() {
    const QRCode = (await import("qrcode")).default;
    const dataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 512 });
    triggerDownload(dataUrl, `${slug}-qr.png`);
  }

  async function downloadSvg() {
    const QRCode = (await import("qrcode")).default;
    const svg = await QRCode.toString(publicUrl, { type: "svg", margin: 1 });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${slug}-qr.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="space-y-4 p-5">
      <Row
        icon={<LinkIcon />}
        title="Public URL"
        subtitle={publicUrl}
        action={
          <button
            type="button"
            onClick={() => copyText("url", publicUrl)}
            className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-2.5 py-1.5 text-[12px] hover:border-waystar"
          >
            <CopyIcon /> {copied === "url" ? "Copied!" : "Copy"}
          </button>
        }
      />
      <Row
        icon={<QRCodeIcon />}
        title="QR code"
        subtitle="Resolves to the public URL when scanned"
        action={
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={downloadPng}
              className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-2.5 py-1.5 text-[12px] hover:border-waystar"
            >
              PNG
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-2.5 py-1.5 text-[12px] hover:border-waystar"
            >
              SVG
            </button>
          </div>
        }
      />
      {qrPreview && (
        <div className="flex justify-center rounded-md border border-rule bg-canvas p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrPreview} alt="QR preview" className="h-32 w-32" />
        </div>
      )}
      <Row
        icon={<CopyIcon />}
        title="Embed iframe"
        subtitle={iframeSnippet}
        action={
          <button
            type="button"
            onClick={() => copyText("iframe", iframeSnippet)}
            className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-2.5 py-1.5 text-[12px] hover:border-waystar"
          >
            <CopyIcon /> {copied === "iframe" ? "Copied!" : "Copy snippet"}
          </button>
        }
      />
    </div>
  );
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function Row({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-rule bg-canvas text-ink-muted">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-ink">{title}</div>
        <div className="truncate text-[12px] text-ink-muted">{subtitle}</div>
      </div>
      {action}
    </div>
  );
}
