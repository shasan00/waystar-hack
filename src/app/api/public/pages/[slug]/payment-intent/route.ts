import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bills, paymentPages } from "@/db/schema";
import { evaluate } from "@/lib/pricing/policy";
import { createPaymentIntent } from "@/lib/stripe/gateway";

export const runtime = "nodejs";

interface Body {
  amountCents?: unknown;
  payerEmail?: unknown;
  payerName?: unknown;
  billId?: unknown;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const amountCents = body.amountCents;
  const payerEmail = body.payerEmail;
  const payerName = body.payerName;
  const billId = typeof body.billId === "string" ? body.billId : null;

  if (typeof amountCents !== "number") {
    return NextResponse.json(
      { error: "amountCents must be a number." },
      { status: 400 },
    );
  }
  if (typeof payerEmail !== "string" || !payerEmail.includes("@")) {
    return NextResponse.json(
      { error: "payerEmail must be a valid email." },
      { status: 400 },
    );
  }
  if (payerName !== undefined && typeof payerName !== "string") {
    return NextResponse.json(
      { error: "payerName must be a string if provided." },
      { status: 400 },
    );
  }

  const page = await db.query.paymentPages.findFirst({
    where: eq(paymentPages.slug, slug),
  });

  if (!page || !page.isActive) {
    return NextResponse.json({ error: "Payment page not found." }, { status: 404 });
  }

  // Validate the bill belongs to this page before we trust its id downstream.
  if (billId) {
    const bill = await db.query.bills.findFirst({
      where: and(eq(bills.id, billId), eq(bills.pageId, page.id)),
    });
    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found for this page." },
        { status: 404 },
      );
    }
  }

  const result = evaluate({
    page: {
      amountMode: page.amountMode,
      fixedAmountCents: page.fixedAmountCents,
      minAmountCents: page.minAmountCents,
      maxAmountCents: page.maxAmountCents,
      allowPlans: page.allowPlans,
      planInstallmentOptions: page.planInstallmentOptions,
    },
    requestedAmountCents: amountCents,
  });

  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  try {
    const { clientSecret, paymentIntentId } = await createPaymentIntent({
      amountCents: result.normalizedAmountCents,
      pageId: page.id,
      payerEmail,
      payerName: payerName as string | undefined,
      glCode: page.glCodes[0] ?? "",
      billId,
    });

    return NextResponse.json({
      clientSecret,
      paymentIntentId,
      amountCents: result.normalizedAmountCents,
      planOptions: result.planOptions,
    });
  } catch (err) {
    console.error("[payment-intent] Stripe error", err);
    return NextResponse.json(
      { error: "Failed to create payment intent." },
      { status: 502 },
    );
  }
}
