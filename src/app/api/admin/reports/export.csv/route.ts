import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listTransactions, parseFilters } from "@/lib/reports/queries";

export const runtime = "nodejs";

const HEADER = [
  "transaction_id",
  "created_at",
  "page_slug",
  "amount_cents",
  "status",
  "payment_method",
  "gl_code",
  "payer_email",
  "payer_name",
  "stripe_payment_intent_id",
];

function csvEscape(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const url = new URL(req.url);
  const filters = parseFilters(url.searchParams);

  // Unbounded export — same filters as the screen, no pagination.
  const { rows } = await listTransactions(filters, { limit: 10_000, offset: 0 });

  const lines = [HEADER.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.createdAt.toISOString(),
        r.pageSlug,
        r.amountCents,
        r.status,
        r.paymentMethod,
        r.glCodeAtPayment ?? "",
        r.payerEmail ?? "",
        r.payerName ?? "",
        r.stripePaymentIntentId ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="transactions.csv"',
      "Cache-Control": "no-store",
    },
  });
}
