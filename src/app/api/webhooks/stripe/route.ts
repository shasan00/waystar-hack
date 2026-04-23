import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, parseWebhookEvent } from '@/lib/stripe/gateway';
import { processWebhookEvent } from '@/lib/webhooks/processor';
import { db } from '@/db/client';
import { sendConfirmationForTransaction } from '@/lib/email/confirmation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  }

  // Raw body is required for Stripe signature verification. Do not use req.json().
  const rawBody = await req.text();

  let event;
  try {
    event = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'signature verification failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const domainEvent = parseWebhookEvent(event);

  try {
    await processWebhookEvent(
      domainEvent,
      { rawEvent: event },
      {
        db,
        sendConfirmation: async (args) => {
          // Fire-and-log: a failed email must not re-queue the webhook
          // (Stripe would retry and double-apply state). The confirmation
          // module already catches and logs internally.
          await sendConfirmationForTransaction(args.transactionId);
        },
      },
    );
  } catch (err) {
    console.error('[stripe webhook] processing failed', {
      stripeEventId: event.id,
      type: event.type,
      err,
    });
    // Non-2xx causes Stripe to retry with exponential backoff.
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
