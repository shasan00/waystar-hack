import type Stripe from 'stripe';
import type { DomainEvent } from '@/lib/stripe/gateway';

// Owner: payments slice. Responsibilities:
//   1. Idempotency: insert into webhookEvent (unique on stripeEventId).
//      On conflict, return early — duplicate Stripe retry.
//   2. Apply domain event to transaction / paymentPlan tables in a DB tx.
//   3. For succeeded payments, render + send confirmation email via Resend.
//
// Called from src/app/api/webhooks/stripe/route.ts after signature verification.
export async function processWebhookEvent(
  event: DomainEvent,
  ctx: { rawEvent: Stripe.Event },
): Promise<void> {
  if (event.kind === 'ignored') return;

  // TODO: implement idempotency insert + state transitions.
  console.log('[webhook processor] received', {
    kind: event.kind,
    stripeEventId: event.stripeEventId,
    type: ctx.rawEvent.type,
  });
}
