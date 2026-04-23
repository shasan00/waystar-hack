import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentPages } from "@/db/schema";
import { evaluate } from "@/lib/pricing/policy";
import { createSubscriptionForPlan } from "@/lib/stripe/gateway";

export const runtime = "nodejs";

interface Body {
  amountCents?: unknown;
  installmentCount?: unknown;
  payerEmail?: unknown;
  payerName?: unknown;
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

  const { amountCents, installmentCount, payerEmail, payerName } = body;

  if (typeof amountCents !== "number") {
    return NextResponse.json(
      { error: "amountCents must be a number." },
      { status: 400 },
    );
  }
  if (typeof installmentCount !== "number" || !Number.isInteger(installmentCount)) {
    return NextResponse.json(
      { error: "installmentCount must be an integer." },
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

  if (!page.allowPlans) {
    return NextResponse.json(
      { error: "Payment plans are not enabled for this page." },
      { status: 422 },
    );
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

  if (!result.planOptions.includes(installmentCount)) {
    return NextResponse.json(
      {
        error: `Installment count ${installmentCount} is not available for this amount.`,
        allowedInstallmentCounts: result.planOptions,
      },
      { status: 422 },
    );
  }

  const installmentAmountCents = result.normalizedAmountCents / installmentCount;

  try {
    const { subscriptionId, customerId, clientSecret, cancelAt } =
      await createSubscriptionForPlan({
        totalAmountCents: result.normalizedAmountCents,
        installmentCount,
        installmentAmountCents,
        pageId: page.id,
        payerEmail,
        payerName: payerName as string | undefined,
        glCode: page.glCodes[0] ?? "",
      });

    return NextResponse.json({
      subscriptionId,
      customerId,
      clientSecret,
      cancelAt,
      totalAmountCents: result.normalizedAmountCents,
      installmentCount,
      installmentAmountCents,
    });
  } catch (err) {
    console.error("[payment-plan] Stripe error", err);
    return NextResponse.json(
      { error: "Failed to create subscription." },
      { status: 502 },
    );
  }
}
