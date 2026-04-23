import "server-only";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { transactions, paymentPages } from "@/db/schema";

/**
 * Reporting query module.
 *
 * Given a set of filters, returns paginated transactions + summary aggregates
 * + breakdowns by GL code and payment method. Consumed by the admin reports
 * page, the JSON API routes, and the CSV export endpoint — all three paths
 * use the same filters so what's exported matches what's on screen.
 */

export type TransactionStatus = "pending" | "succeeded" | "failed" | "refunded";
export type PaymentMethod = "card" | "wallet" | "ach";

export interface ReportFilters {
  from?: Date;
  to?: Date;
  pageId?: string;
  status?: TransactionStatus;
}

export interface ReportRow {
  id: string;
  createdAt: Date;
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  amountCents: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  glCodeAtPayment: string | null;
  payerEmail: string | null;
  payerName: string | null;
  stripePaymentIntentId: string | null;
}

export interface ReportSummary {
  totalCount: number;
  succeededCount: number;
  failedCount: number;
  collectedCents: number; // sum of succeeded amounts
  averageCents: number; // collectedCents / succeededCount (0 if none)
  failureRate: number; // 0-1
}

export interface Breakdown {
  label: string;
  count: number;
  amountCents: number;
}

function buildWhere(f: ReportFilters) {
  const clauses = [];
  if (f.from) clauses.push(gte(transactions.createdAt, f.from));
  if (f.to) clauses.push(lte(transactions.createdAt, f.to));
  if (f.pageId) clauses.push(eq(transactions.pageId, f.pageId));
  if (f.status) clauses.push(eq(transactions.status, f.status));
  return clauses.length ? and(...clauses) : undefined;
}

export async function listTransactions(
  filters: ReportFilters,
  opts: { limit?: number; offset?: number } = {},
): Promise<{ rows: ReportRow[]; total: number }> {
  const where = buildWhere(filters);
  const limit = Math.min(opts.limit ?? 100, 1000);
  const offset = opts.offset ?? 0;

  const rows = await db
    .select({
      id: transactions.id,
      createdAt: transactions.createdAt,
      pageId: transactions.pageId,
      pageTitle: paymentPages.title,
      pageSlug: paymentPages.slug,
      amountCents: transactions.amountCents,
      paymentMethod: transactions.paymentMethod,
      status: transactions.status,
      glCodeAtPayment: transactions.glCodeAtPayment,
      payerEmail: transactions.payerEmail,
      payerName: transactions.payerName,
      stripePaymentIntentId: transactions.stripePaymentIntentId,
    })
    .from(transactions)
    .innerJoin(paymentPages, eq(paymentPages.id, transactions.pageId))
    .where(where)
    .orderBy(desc(transactions.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(transactions)
    .where(where);

  return { rows, total: Number(countRow?.n ?? 0) };
}

export async function summarize(filters: ReportFilters): Promise<ReportSummary> {
  const where = buildWhere(filters);

  const [row] = await db
    .select({
      totalCount: sql<number>`count(*)::int`,
      succeededCount: sql<number>`count(*) filter (where status = 'succeeded')::int`,
      failedCount: sql<number>`count(*) filter (where status = 'failed')::int`,
      collectedCents: sql<number>`coalesce(sum(amount_cents) filter (where status = 'succeeded'), 0)::bigint`,
    })
    .from(transactions)
    .where(where);

  const totalCount = Number(row?.totalCount ?? 0);
  const succeededCount = Number(row?.succeededCount ?? 0);
  const failedCount = Number(row?.failedCount ?? 0);
  const collectedCents = Number(row?.collectedCents ?? 0);
  const averageCents =
    succeededCount > 0 ? Math.round(collectedCents / succeededCount) : 0;
  const failureRate = totalCount > 0 ? failedCount / totalCount : 0;

  return {
    totalCount,
    succeededCount,
    failedCount,
    collectedCents,
    averageCents,
    failureRate,
  };
}

export async function breakdownByGlCode(
  filters: ReportFilters,
): Promise<Breakdown[]> {
  const where = buildWhere(filters);
  const rows = await db
    .select({
      label: sql<string | null>`${transactions.glCodeAtPayment}`,
      count: sql<number>`count(*)::int`,
      amountCents: sql<number>`coalesce(sum(amount_cents) filter (where status = 'succeeded'), 0)::bigint`,
    })
    .from(transactions)
    .where(where)
    .groupBy(transactions.glCodeAtPayment);

  return rows.map((r) => ({
    label: r.label ?? "—",
    count: Number(r.count),
    amountCents: Number(r.amountCents),
  }));
}

export async function breakdownByPaymentMethod(
  filters: ReportFilters,
): Promise<Breakdown[]> {
  const where = buildWhere(filters);
  const rows = await db
    .select({
      label: transactions.paymentMethod,
      count: sql<number>`count(*)::int`,
      amountCents: sql<number>`coalesce(sum(amount_cents) filter (where status = 'succeeded'), 0)::bigint`,
    })
    .from(transactions)
    .where(where)
    .groupBy(transactions.paymentMethod);

  // Always return all three methods so the UI can render consistent rows.
  const byLabel = new Map(rows.map((r) => [r.label, r]));
  const methods: PaymentMethod[] = ["card", "wallet", "ach"];
  return methods.map((m) => {
    const r = byLabel.get(m);
    return {
      label: m,
      count: Number(r?.count ?? 0),
      amountCents: Number(r?.amountCents ?? 0),
    };
  });
}

/**
 * Parse `URLSearchParams` into typed filters. Used by both the page and the
 * API routes so the filter contract is identical.
 */
export function parseFilters(params: URLSearchParams): ReportFilters {
  const f: ReportFilters = {};
  const from = params.get("from");
  const to = params.get("to");
  const pageId = params.get("pageId");
  const status = params.get("status");

  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) f.from = d;
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) f.to = d;
  }
  if (pageId) f.pageId = pageId;
  if (status === "succeeded" || status === "failed" || status === "pending" || status === "refunded") {
    f.status = status;
  }
  return f;
}
