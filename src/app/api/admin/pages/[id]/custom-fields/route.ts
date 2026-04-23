import { NextResponse } from "next/server";
import { and, eq, max } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/db/client";
import { customFields } from "@/db/schema";
import { getAdminPageById } from "@/db/queries";
import {
  validateCustomField,
  type CustomFieldInput,
  type FieldType,
} from "@/lib/validation/page-config";

export const runtime = "nodejs";

const FIELD_LIMIT = 10;

async function ensurePageOwned(pageId: string, orgId: string) {
  return getAdminPageById(pageId, orgId);
}

interface CreateBody {
  label?: unknown;
  type?: unknown;
  options?: unknown;
  required?: unknown;
  placeholder?: unknown;
  helperText?: unknown;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { id: pageId } = await params;
  const page = await ensurePageOwned(pageId, guard.ctx.orgId);
  if (!page) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (page.fields.length >= FIELD_LIMIT) {
    return NextResponse.json(
      { error: `A page can have at most ${FIELD_LIMIT} custom fields.` },
      { status: 400 },
    );
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input: CustomFieldInput = {
    label: typeof body.label === "string" ? body.label : "",
    type: (typeof body.type === "string" ? body.type : "text") as FieldType,
    options: Array.isArray(body.options)
      ? body.options.filter((x): x is string => typeof x === "string")
      : null,
    required: typeof body.required === "boolean" ? body.required : false,
    placeholder:
      typeof body.placeholder === "string" && body.placeholder.length > 0
        ? body.placeholder
        : null,
    helperText:
      typeof body.helperText === "string" && body.helperText.length > 0
        ? body.helperText
        : null,
  };

  const errs = validateCustomField(input);
  if (errs.length > 0) {
    return NextResponse.json(
      { error: errs[0].message, errors: errs },
      { status: 400 },
    );
  }

  const [{ value: currentMax }] = await db
    .select({ value: max(customFields.displayOrder) })
    .from(customFields)
    .where(eq(customFields.pageId, pageId));

  const nextOrder = (currentMax ?? -1) + 1;

  const [row] = await db
    .insert(customFields)
    .values({
      pageId,
      label: input.label.trim(),
      type: input.type,
      options: input.type === "dropdown" ? input.options ?? [] : null,
      required: input.required ?? false,
      placeholder: input.placeholder ?? null,
      helperText: input.helperText ?? null,
      displayOrder: nextOrder,
    })
    .returning();

  return NextResponse.json({ field: row });
}

interface ReorderBody {
  order?: unknown;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { id: pageId } = await params;
  const page = await ensurePageOwned(pageId, guard.ctx.orgId);
  if (!page) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: ReorderBody;
  try {
    body = (await req.json()) as ReorderBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.order)) {
    return NextResponse.json(
      { error: "Expected { order: [fieldId, ...] }." },
      { status: 400 },
    );
  }
  const order = body.order.filter(
    (x): x is number => typeof x === "number" && Number.isFinite(x),
  );
  if (order.length !== page.fields.length) {
    return NextResponse.json(
      { error: "Order array must include every field exactly once." },
      { status: 400 },
    );
  }
  const pageFieldIds = new Set(page.fields.map((f) => f.id));
  for (const fid of order) {
    if (!pageFieldIds.has(fid)) {
      return NextResponse.json(
        { error: "Order array references an unknown field." },
        { status: 400 },
      );
    }
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < order.length; i++) {
      await tx
        .update(customFields)
        .set({ displayOrder: i })
        .where(
          and(
            eq(customFields.id, order[i]),
            eq(customFields.pageId, pageId),
          ),
        );
    }
  });

  return NextResponse.json({ ok: true });
}
