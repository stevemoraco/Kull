import { Router, type Request, type Response } from 'express';
import express from 'express';
import { verifyWebhookSignature } from '../stripe';
import { db } from '../db';
import { creditTransactions } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import type Stripe from 'stripe';

const router = Router();

/**
 * Stripe webhook endpoint
 * Handles payment_intent.succeeded events for credit purchases
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;

    if (!sig) {
      console.error('[Stripe Webhook] No signature provided');
      return res.status(400).send('No signature provided');
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).send('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = verifyWebhookSignature(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('[Stripe Webhook] Received event:', event.type);

    // Handle payment_intent.succeeded
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      try {
        console.log('[Stripe Webhook] Processing payment_intent.succeeded:', paymentIntent.id);

        // Find the pending transaction by payment intent ID
        const [pendingTransaction] = await db
          .select()
          .from(creditTransactions)
          .where(eq(creditTransactions.stripePaymentIntentId, paymentIntent.id));

        if (!pendingTransaction) {
          console.error('[Stripe Webhook] No transaction found for payment intent:', paymentIntent.id);
          return res.status(404).json({ received: true, error: 'Transaction not found' });
        }

        // Check if already processed
        if (pendingTransaction.amount > 0) {
          console.log('[Stripe Webhook] Transaction already processed:', pendingTransaction.id);
          return res.json({ received: true, message: 'Already processed' });
        }

        const userId = pendingTransaction.userId;
        const packageAmount = (pendingTransaction.metadata as any)?.packageAmount || 500;
        const creditAmount = packageAmount * 100; // Convert to cents
        const hasBonus = packageAmount === 1000;
        const bonusAmount = hasBonus ? 10000 : 0; // $100 bonus in cents

        console.log('[Stripe Webhook] Processing credits:', {
          userId,
          packageAmount,
          creditAmount,
          hasBonus,
          bonusAmount
        });

        // Update the purchase transaction
        const newBalance = pendingTransaction.balance + creditAmount;

        await db
          .update(creditTransactions)
          .set({
            amount: creditAmount,
            balance: newBalance,
            description: `Purchased $${packageAmount} in credits`,
            metadata: {
              status: 'completed',
              packageAmount,
              processedViaWebhook: true,
              webhookTimestamp: new Date().toISOString()
            }
          })
          .where(eq(creditTransactions.id, pendingTransaction.id));

        console.log('[Stripe Webhook] Purchase transaction updated:', pendingTransaction.id);

        // Add bonus transaction if applicable
        if (hasBonus) {
          const finalBalance = newBalance + bonusAmount;

          await db.insert(creditTransactions).values({
            userId,
            amount: bonusAmount,
            balance: finalBalance,
            type: 'bonus',
            description: 'Bonus credits for $1000 package',
            metadata: {
              relatedPaymentIntentId: paymentIntent.id,
              processedViaWebhook: true,
              webhookTimestamp: new Date().toISOString()
            }
          });

          console.log('[Stripe Webhook] Bonus transaction created for:', userId);
        }

        console.log('[Stripe Webhook] Successfully processed payment for user:', userId);
      } catch (error: any) {
        console.error('[Stripe Webhook] Error processing payment_intent.succeeded:', error);
        return res.status(500).json({ received: true, error: error.message });
      }
    }

    // Handle payment_intent.payment_failed
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      console.log('[Stripe Webhook] Payment failed:', paymentIntent.id);

      try {
        // Find the pending transaction
        const [pendingTransaction] = await db
          .select()
          .from(creditTransactions)
          .where(eq(creditTransactions.stripePaymentIntentId, paymentIntent.id));

        if (pendingTransaction) {
          // Update metadata to mark as failed
          await db
            .update(creditTransactions)
            .set({
              description: `Failed: ${pendingTransaction.description}`,
              metadata: {
                ...(pendingTransaction.metadata as any),
                status: 'failed',
                failureReason: paymentIntent.last_payment_error?.message,
                failedAt: new Date().toISOString()
              }
            })
            .where(eq(creditTransactions.id, pendingTransaction.id));

          console.log('[Stripe Webhook] Marked transaction as failed:', pendingTransaction.id);
        }
      } catch (error: any) {
        console.error('[Stripe Webhook] Error handling payment failure:', error);
      }
    }

    // Return success for all webhook events
    res.json({ received: true });
  }
);

export default router;
