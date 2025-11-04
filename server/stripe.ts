import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover',
});

/**
 * Create a payment intent for credit purchases
 * @param amount - Amount in dollars (will be converted to cents)
 * @param userId - User ID for metadata
 * @param packageInfo - Description of the package being purchased
 */
export async function createPaymentIntent(
  amount: number,
  userId: string,
  packageInfo: string
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: amount * 100, // Convert dollars to cents
    currency: 'usd',
    metadata: {
      userId,
      packageInfo,
      type: 'credit_purchase'
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

/**
 * Retrieve a payment intent by ID
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

/**
 * Create a refund for a payment intent
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: string
): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount,
    reason: reason as Stripe.RefundCreateParams.Reason,
  });
}
