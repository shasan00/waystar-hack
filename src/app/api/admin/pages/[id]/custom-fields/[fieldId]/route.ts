import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
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

async function parseFieldId(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { id: pageId, fieldId: rawFieldId } = await params;
  const fieldId = await parseFieldId(rawFieldId);
  if (!fieldId) {
    return NextResponse.json({ error: "Invalid field id." }, { status: 400 });
  }

  const page = await getAdminPageById(pageId, guard.ctx.orgId);
  if (!page) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const existing = page.fields.find((f) => f.id === fieldId);
  if (!existing) {
    return NextResponse.json({ error: "Field not found." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const nextLabel = typeof body.label === "string" ? body.label : existing.label;
  const nextType =
    typeof body.type === "string" &&
    ["text", "number", "dropdown", "date", "checkbox"].includes(body.type)
      ? (body.type as FieldType)
      : (existing.type as FieldType);
  const nextOptions = Array.isArray(body.options)
    ? body.options.filter((x): x is string => typeof x === "string")
    : ((existing.options as string[] | null) ?? null);
  const nextRequired =
    typeof body.required === "boolean" ? body.required : existing.required;
  const nextPlaceholder =
    typeof body.placeholder === "string"
      ? body.placeholder
      : body.placeholder === null
        ? null
        : existing.placeholder;
  const nextHelper =
    typeof body.helperText === "string"
      ? body.helperText
      : body.helperText === null
        ? null
        : existing.helperText;

  const input: CustomFieldInput = {
    label: nextLabel,
    type: nextType,
    options: nextOptions,
    required: nextRequired,
    placeholder: nextPlaceholder,
    helperText: nextHelper,
  };
  const errs = validateCustomField(input);
  if (errs.length > 0) {
    return NextResponse.json(
      { error: errs[0].message, errors: errs },
      { status: 400 },
    );
  }

  await db
    .update(customFields)
    .set({
      label: input.label.trim(),
      type: input.type,
      options: input.type === "dropdown" ? (input.options ?? []) : null,
      required: input.required ?? false,
      placeholder: input.placeholder ?? null,
      helperText: input.helperText ?? null,
    })
    .where(and(eq(customFields.id, fieldId), eq(customFields.pageId, pageId)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { id: pageId, fieldId: rawFieldId } = await params;
  const fieldId = await parseFieldId(rawFieldId);
  if (!fieldId) {
    return NextResponse.json({ error: "Invalid field id." }, { status: 400 });
  }
  const page = await getAdminPageById(pageId, guard.ctx.orgId);
  if (!page) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db
    .delete(customFields)
    .where(and(eq(customFields.id, fieldId), eq(customFields.pageId, pageId)));

  // Compact remaining displayOrder values.
  const remaining = page.fields
    .filter((f) => f.id !== fieldId)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  await db.transaction(async (tx) => {
    for (let i = 0; i < remaining.length; i++) {
      await tx
        .update(customFields)
        .set({ displayOrder: i })
        .where(eq(customFields.id, remaining[i].id));
    }
  });

  return NextResponse.json({ ok: true });
}
