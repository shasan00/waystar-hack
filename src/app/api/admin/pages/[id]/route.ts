import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/db/client";
import { paymentPages } from "@/db/schema";
import { getAdminPageById } from "@/db/queries";
import {
  normalizeAmountFields,
  validateUpdate,
  type PageUpdateInput,
} from "@/lib/validation/page-config";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
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
  return NextResponse.json({ page });
}

function coerceUpdate(raw: unknown): PageUpdateInput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const out: PageUpdateInput = {};
  const strOrNull = (v: unknown) =>
    typeof v === "string" ? v : v === null ? null : undefined;
  const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
  const intOrNull = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.round(v)
      : v === null
        ? null
        : undefined;

  if ("title" in r && typeof r.title === "string") out.title = r.title;
  if ("subtitle" in r) {
    const v = strOrNull(r.subtitle);
    if (v !== undefined) out.subtitle = v;
  }
  if ("headerMessage" in r) {
    const v = strOrNull(r.headerMessage);
    if (v !== undefined) out.headerMessage = v;
  }
  if ("footerMessage" in r) {
    const v = strOrNull(r.footerMessage);
    if (v !== undefined) out.footerMessage = v;
  }
  if ("brandColor" in r && typeof r.brandColor === "string") {
    out.brandColor = r.brandColor;
  }
  if ("logoUrl" in r) {
    const v = strOrNull(r.logoUrl);
    if (v !== undefined) out.logoUrl = v;
  }
  if (
    "amountMode" in r &&
    (r.amountMode === "fixed" ||
      r.amountMode === "range" ||
      r.amountMode === "open")
  ) {
    out.amountMode = r.amountMode;
  }
  if ("fixedAmountCents" in r) {
    const v = intOrNull(r.fixedAmountCents);
    if (v !== undefined) out.fixedAmountCents = v;
  }
  if ("minAmountCents" in r) {
    const v = intOrNull(r.minAmountCents);
    if (v !== undefined) out.minAmountCents = v;
  }
  if ("maxAmountCents" in r) {
    const v = intOrNull(r.maxAmountCents);
    if (v !== undefined) out.maxAmountCents = v;
  }
  if ("glCodes" in r && Array.isArray(r.glCodes)) {
    out.glCodes = r.glCodes.filter((x): x is string => typeof x === "string");
  }
  if ("emailTemplateBody" in r) {
    const v = strOrNull(r.emailTemplateBody);
    if (v !== undefined) out.emailTemplateBody = v;
  }
  const b = bool(r.allowPlans);
  if (b !== undefined) out.allowPlans = b;
  if (
    "planInstallmentOptions" in r &&
    Array.isArray(r.planInstallmentOptions)
  ) {
    out.planInstallmentOptions = r.planInstallmentOptions.filter(
      (x): x is number => typeof x === "number" && Number.isFinite(x),
    );
  }
  const active = bool(r.isActive);
  if (active !== undefined) out.isActive = active;

  return out;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { id } = await params;

  const existing = await getAdminPageById(id, guard.ctx.orgId);
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = coerceUpdate(raw);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const input = normalizeAmountFields(parsed);
  const errs = validateUpdate(input);
  if (errs.length > 0) {
    return NextResponse.json(
      { error: errs[0].message, errors: errs },
      { status: 400 },
    );
  }

  const updateValues: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) updateValues[k] = v;
  }

  await db
    .update(paymentPages)
    .set(updateValues)
    .where(eq(paymentPages.id, id));

  return NextResponse.json({ ok: true });
}
