import { NextResponse } from "next/server";
import { getPaymentPageBySlug } from "@/db/queries";
import { negotiatePlan } from "@/lib/ai/plan-assistant";

export const runtime = "nodejs";

interface Body {
  message?: unknown;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const page = await getPaymentPageBySlug(slug);
  if (!page) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!page.allowPlans) {
    return NextResponse.json(
      { error: "Plans aren't enabled for this page." },
      { status: 400 },
    );
  }
  if (page.amountMode !== "fixed" || !page.fixedAmount) {
    return NextResponse.json(
      { error: "Plan assistant requires a fixed-amount page." },
      { status: 400 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length === 0) {
    return NextResponse.json(
      { error: "message is required." },
      { status: 400 },
    );
  }
  if (message.length > 500) {
    return NextResponse.json(
      { error: "Message too long (max 500 chars)." },
      { status: 400 },
    );
  }

  const options = page.planInstallments ?? [];
  if (options.length === 0) {
    return NextResponse.json(
      { error: "No installment options configured." },
      { status: 400 },
    );
  }

  const recommendation = await negotiatePlan({
    pageTitle: page.title,
    orgName: page.orgName,
    totalCents: page.fixedAmount,
    installmentOptions: options,
    payerMessage: message,
  });

  return NextResponse.json({
    reply: recommendation.reply,
    recommendedInstallmentCount: recommendation.recommendedInstallmentCount,
    monthlyAmountCents: recommendation.monthlyAmountCents,
    matchedExactly: recommendation.matchedExactly,
  });
}
