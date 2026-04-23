import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  breakdownByGlCode,
  breakdownByPaymentMethod,
  parseFilters,
  summarize,
} from "@/lib/reports/queries";

export const runtime = "nodejs";

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

  const [summary, byGlCode, byPaymentMethod] = await Promise.all([
    summarize(filters),
    breakdownByGlCode(filters),
    breakdownByPaymentMethod(filters),
  ]);

  return NextResponse.json({ summary, byGlCode, byPaymentMethod });
}
