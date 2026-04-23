import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/db/client";
import { paymentPages } from "@/db/schema";
import { listAdminPages } from "@/db/queries";
import { validateCreate } from "@/lib/validation/page-config";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const rows = await listAdminPages(guard.ctx.orgId);
  return NextResponse.json({ pages: rows });
}

interface CreateBody {
  title?: unknown;
  slug?: unknown;
  subtitle?: unknown;
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const subtitle =
    typeof body.subtitle === "string" && body.subtitle.trim().length > 0
      ? body.subtitle.trim()
      : null;

  const errs = validateCreate({ title, slug, subtitle });
  if (errs.length > 0) {
    return NextResponse.json(
      { error: errs[0].message, errors: errs },
      { status: 400 },
    );
  }

  try {
    const [row] = await db
      .insert(paymentPages)
      .values({
        orgId: guard.ctx.orgId,
        title,
        slug,
        subtitle,
        amountMode: "open",
        glCodes: [],
        planInstallmentOptions: [],
        allowPlans: false,
        isActive: false,
      })
      .returning({ id: paymentPages.id, slug: paymentPages.slug });
    return NextResponse.json({ id: row.id, slug: row.slug });
  } catch (e) {
    // Postgres unique_violation
    if (
      typeof e === "object" &&
      e !== null &&
      (e as { code?: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "That URL slug is already in use. Try another." },
        { status: 409 },
      );
    }
    console.error("[POST /api/admin/pages] insert failed", e);
    return NextResponse.json(
      { error: "Failed to create page." },
      { status: 500 },
    );
  }
}
