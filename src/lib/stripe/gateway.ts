import Stripe from 'stripe';

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  _stripe = new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  });
  return _stripe;
}

export type PaymentMethodKind = 'card' | 'wallet_apple' | 'wallet_google' | 'wallet_link';

export type DomainEvent =
  | {
      kind: 'payment_succeeded';
      stripeEventId: string;
      paymentIntentId: string;
      amountCents: number;
      currency: string;
      customerId: string | null;
      paymentMethodKind: PaymentMethodKind;
      metadata: Record<string, string>;
      receivedAt: Date;
    }
  | {
      kind: 'payment_failed';
      stripeEventId: string;
      paymentIntentId: string;
      failureMessage: string | null;
      metadata: Record<string, string>;
      receivedAt: Date;
    }
  | {
      kind: 'plan_installment_succeeded';
      stripeEventId: string;
      subscriptionId: string;
      invoiceId: string;
      paymentIntentId: string | null;
      amountCents: number;
      customerId: string | null;
      metadata: Record<string, string>;
      receivedAt: Date;
    }
  | {
      kind: 'plan_installment_failed';
      stripeEventId: string;
      subscriptionId: string;
      invoiceId: string;
      receivedAt: Date;
    }
  | {
      kind: 'plan_canceled';
      stripeEventId: string;
      subscriptionId: string;
      receivedAt: Date;
    }
  | {
      kind: 'ignored';
      stripeEventId: string;
      eventType: string;
    };

export async function createPaymentIntent(args: {
  amountCents: number;
  pageId: string;
  payerEmail: string;
  payerName?: string;
  glCode: string;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const pi = await getStripe().paymentIntents.create({
    amount: args.amountCents,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    receipt_email: args.payerEmail,
    metadata: {
      pageId: args.pageId,
      payerEmail: args.payerEmail,
      payerName: args.payerName ?? '',
      glCode: args.glCode,
    },
  });
  return { clientSecret: pi.client_secret!, paymentIntentId: pi.id };
}

export async function createSubscriptionForPlan(args: {
  totalAmountCents: number;
  installmentCount: number;
  installmentAmountCents: number;
  pageId: string;
  payerEmail: string;
  payerName?: string;
  glCode: string;
}): Promise<{
  subscriptionId: string;
  customerId: string;
  clientSecret: string;
  cancelAt: number;
}> {
  const customer = await getStripe().customers.create({
    email: args.payerEmail,
    name: args.payerName,
    metadata: { pageId: args.pageId },
  });

  const price = await getStripe().prices.create({
    unit_amount: args.installmentAmountCents,
    currency: 'usd',
    recurring: { interval: 'month' },
    product_data: { name: `Installment plan (${args.installmentCount}x)` },
  });

  const now = Math.floor(Date.now() / 1000);
  const cancelAt = now + args.installmentCount * 30 * 24 * 60 * 60;

  const sub = await getStripe().subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id }],
    cancel_at: cancelAt,
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      pageId: args.pageId,
      payerEmail: args.payerEmail,
      payerName: args.payerName ?? '',
      glCode: args.glCode,
      installmentCount: String(args.installmentCount),
      totalAmountCents: String(args.totalAmountCents),
    },
  });

  const invoice = sub.latest_invoice as Stripe.Invoice;
  const pi = invoice.payment_intent as Stripe.PaymentIntent;

  return {
    subscriptionId: sub.id,
    customerId: customer.id,
    clientSecret: pi.client_secret!,
    cancelAt,
  };
}

export function verifyWebhookSignature(rawBody: string, signatureHeader: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }
  return getStripe().webhooks.constructEvent(rawBody, signatureHeader, secret);
}

export function parseWebhookEvent(event: Stripe.Event): DomainEvent {
  const receivedAt = new Date(event.created * 1000);

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      // Invoice-linked PIs are driven by plan installment events instead.
      if (pi.invoice) {
        return { kind: 'ignored', stripeEventId: event.id, eventType: event.type };
      }
      return {
        kind: 'payment_succeeded',
        stripeEventId: event.id,
        paymentIntentId: pi.id,
        amountCents: pi.amount_received,
        currency: pi.currency,
        customerId: typeof pi.customer === 'string' ? pi.customer : pi.customer?.id ?? null,
        paymentMethodKind: classifyPaymentMethod(pi),
        metadata: pi.metadata ?? {},
        receivedAt,
      };
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      return {
        kind: 'payment_failed',
        stripeEventId: event.id,
        paymentIntentId: pi.id,
        failureMessage: pi.last_payment_error?.message ?? null,
        metadata: pi.metadata ?? {},
        receivedAt,
      };
    }

    case 'invoice.payment_succeeded': {
      const inv = event.data.object as Stripe.Invoice;
      if (!inv.subscription) {
        return { kind: 'ignored', stripeEventId: event.id, eventType: event.type };
      }
      return {
        kind: 'plan_installment_succeeded',
        stripeEventId: event.id,
        subscriptionId:
          typeof inv.subscription === 'string' ? inv.subscription : inv.subscription.id,
        invoiceId: inv.id,
        paymentIntentId:
          typeof inv.payment_intent === 'string'
            ? inv.payment_intent
            : inv.payment_intent?.id ?? null,
        amountCents: inv.amount_paid,
        customerId: typeof inv.customer === 'string' ? inv.customer : inv.customer?.id ?? null,
        metadata: inv.subscription_details?.metadata ?? {},
        receivedAt,
      };
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      if (!inv.subscription) {
        return { kind: 'ignored', stripeEventId: event.id, eventType: event.type };
      }
      return {
        kind: 'plan_installment_failed',
        stripeEventId: event.id,
        subscriptionId:
          typeof inv.subscription === 'string' ? inv.subscription : inv.subscription.id,
        invoiceId: inv.id,
        receivedAt,
      };
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      return {
        kind: 'plan_canceled',
        stripeEventId: event.id,
        subscriptionId: sub.id,
        receivedAt,
      };
    }

    default:
      return { kind: 'ignored', stripeEventId: event.id, eventType: event.type };
  }
}

function classifyPaymentMethod(pi: Stripe.PaymentIntent): PaymentMethodKind {
  const charge = (pi as unknown as { charges?: { data: Stripe.Charge[] } }).charges?.data?.[0];
  const details = charge?.payment_method_details;
  if (!details) return 'card';
  if (details.type === 'link') return 'wallet_link';
  if (details.type === 'card') {
    const wallet = details.card?.wallet?.type;
    if (wallet === 'apple_pay') return 'wallet_apple';
    if (wallet === 'google_pay') return 'wallet_google';
    if (wallet === 'link') return 'wallet_link';
    return 'card';
  }
  return 'card';
}

export { getStripe };
