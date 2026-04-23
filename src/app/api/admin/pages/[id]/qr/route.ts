import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getAdminPageById } from "@/db/queries";

export const runtime = "nodejs";

/**
 * Proxy a QR code for the page's public URL from a public QR service.
 *
 * Kept server-side so the browser never calls a third-party host directly
 * (cleaner CSP, and downloads via same-origin avoid CORS headaches).
 *
 * Query:
 *   ?format=png (default) or svg
 *   ?size=512   (default) 128-1024
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { id } = await params;
  const page = await getAdminPageById(id, guard.ctx.orgId);
  if (!page) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "svg" ? "svg" : "png";
  const sizeRaw = Number(url.searchParams.get("size") ?? 512);
  const size = Number.isFinite(sizeRaw)
    ? Math.min(1024, Math.max(128, Math.round(sizeRaw)))
    : 512;

  const origin = url.origin;
  const targetUrl = `${origin}/pay/${page.slug}`;
  const service = new URL("https://api.qrserver.com/v1/create-qr-code/");
  service.searchParams.set("data", targetUrl);
  service.searchParams.set("size", `${size}x${size}`);
  service.searchParams.set("format", format);
  service.searchParams.set("margin", "8");

  try {
    const res = await fetch(service.toString(), {
      headers: { accept: format === "svg" ? "image/svg+xml" : "image/png" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `QR service returned ${res.status}` },
        { status: 502 },
      );
    }
    const body = await res.arrayBuffer();
    const contentType =
      format === "svg" ? "image/svg+xml" : "image/png";
    const filename = `${page.slug}-qr.${format}`;
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, max-age=0, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "QR service unreachable." },
      { status: 502 },
    );
  }
}
