import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { creditTransactions, users } from '@shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { createPaymentIntent, getPaymentIntent } from '../stripe';

const router = Router();

// Middleware to get authenticated user ID
function getUserId(req: any): string {
  if (!req.user || !req.user.claims || !req.user.claims.sub) {
    throw new Error('Unauthorized');
  }
  return req.user.claims.sub;
}

/**
 * GET /api/credits/balance
 * Returns current credit balance for authenticated user
 */
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    // Get the most recent transaction to get current balance
    const [latestTransaction] = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(1);

    const balance = latestTransaction?.balance || 0;

    res.json({ balance });
  } catch (error: any) {
    console.error('[Credits] Error fetching balance:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      message: error.message || 'Failed to fetch balance'
    });
  }
});

/**
 * GET /api/credits/transactions
 * Returns transaction history for authenticated user
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const transactions = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(transactions);
  } catch (error: any) {
    console.error('[Credits] Error fetching transactions:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      message: error.message || 'Failed to fetch transactions'
    });
  }
});

/**
 * GET /api/credits/usage-summary
 * Returns usage summary by provider for authenticated user
 */
router.get('/usage-summary', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    // Get all transactions for the user
    const transactions = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId));

    // Calculate totals
    const totalPurchased = transactions
      .filter((t: any) => t.type === 'purchase' || t.type === 'bonus')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalSpent = Math.abs(
      transactions
        .filter((t: any) => t.type === 'usage')
        .reduce((sum: number, t: any) => sum + t.amount, 0)
    );

    // Group by provider
    const byProvider: Record<string, { total: number; count: number; lastUsed: Date | null }> = {};

    transactions
      .filter((t: any) => t.type === 'usage' && t.provider)
      .forEach((t: any) => {
        if (!byProvider[t.provider!]) {
          byProvider[t.provider!] = { total: 0, count: 0, lastUsed: null };
        }
        byProvider[t.provider!].total += Math.abs(t.amount);
        byProvider[t.provider!].count += 1;
        if (!byProvider[t.provider!].lastUsed || t.createdAt! > byProvider[t.provider!].lastUsed!) {
          byProvider[t.provider!].lastUsed = t.createdAt!;
        }
      });

    const currentBalance = transactions.length > 0
      ? transactions.sort((a: any, b: any) => b.createdAt!.getTime() - a.createdAt!.getTime())[0].balance
      : 0;

    res.json({
      totalPurchased,
      totalSpent,
      currentBalance,
      byProvider
    });
  } catch (error: any) {
    console.error('[Credits] Error fetching usage summary:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      message: error.message || 'Failed to fetch usage summary'
    });
  }
});

/**
 * POST /api/credits/purchase
 * Initiates a credit purchase
 */
router.post('/purchase', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { packageAmount } = req.body;

    // Validate package amount
    if (packageAmount !== 500 && packageAmount !== 1000) {
      return res.status(400).json({
        message: 'Invalid package amount. Must be 500 or 1000.'
      });
    }

    // Create Stripe PaymentIntent
    const packageInfo = packageAmount === 1000
      ? '$1000 + $100 bonus'
      : `$${packageAmount} in credits`;

    const paymentIntent = await createPaymentIntent(
      packageAmount,
      userId,
      packageInfo
    );

    // Create pending transaction record
    const [latestTransaction] = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(1);

    const currentBalance = latestTransaction?.balance || 0;

    // Store transaction ID in metadata for webhook processing
    await db.insert(creditTransactions).values({
      userId,
      amount: 0, // Will be updated when payment succeeds
      balance: currentBalance,
      type: 'purchase',
      stripePaymentIntentId: paymentIntent.id,
      description: `Pending: ${packageInfo}`,
      metadata: { status: 'pending', packageAmount }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error: any) {
    console.error('[Credits] Error initiating purchase:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      message: error.message || 'Failed to initiate purchase'
    });
  }
});

/**
 * POST /api/credits/purchase-confirm
 * Confirms a credit purchase after payment succeeds
 */
router.post('/purchase-confirm', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'Payment intent ID required' });
    }

    // Verify payment intent
    const paymentIntent = await getPaymentIntent(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        message: 'Payment not completed',
        status: paymentIntent.status
      });
    }

    // Find the pending transaction
    const [pendingTransaction] = await db
      .select()
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.userId, userId),
          eq(creditTransactions.stripePaymentIntentId, paymentIntentId)
        )
      );

    if (!pendingTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if already processed
    if (pendingTransaction.amount > 0) {
      const [latestTransaction] = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(1);

      return res.json({
        success: true,
        newBalance: latestTransaction?.balance || 0,
        message: 'Transaction already processed'
      });
    }

    const packageAmount = (pendingTransaction.metadata as any)?.packageAmount || 500;
    const creditAmount = packageAmount * 100; // Convert to cents
    const hasBonus = packageAmount === 1000;
    const bonusAmount = hasBonus ? 10000 : 0; // $100 bonus in cents

    // Update the purchase transaction
    const newBalance = pendingTransaction.balance + creditAmount;

    await db
      .update(creditTransactions)
      .set({
        amount: creditAmount,
        balance: newBalance,
        description: `Purchased $${packageAmount} in credits`,
        metadata: { status: 'completed', packageAmount }
      })
      .where(eq(creditTransactions.id, pendingTransaction.id));

    // Add bonus transaction if applicable
    let finalBalance = newBalance;
    if (hasBonus) {
      finalBalance = newBalance + bonusAmount;
      await db.insert(creditTransactions).values({
        userId,
        amount: bonusAmount,
        balance: finalBalance,
        type: 'bonus',
        description: 'Bonus credits for $1000 package',
        metadata: { relatedPaymentIntentId: paymentIntentId }
      });
    }

    res.json({
      success: true,
      newBalance: finalBalance
    });
  } catch (error: any) {
    console.error('[Credits] Error confirming purchase:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      message: error.message || 'Failed to confirm purchase'
    });
  }
});

/**
 * POST /api/credits/deduct
 * Deducts credits for AI usage (internal endpoint)
 */
router.post('/deduct', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { amount, provider, shootId, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (!provider) {
      return res.status(400).json({ message: 'Provider required' });
    }

    if (!description) {
      return res.status(400).json({ message: 'Description required' });
    }

    // Get current balance
    const [latestTransaction] = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(1);

    const currentBalance = latestTransaction?.balance || 0;

    // Check sufficient balance
    if (currentBalance < amount) {
      return res.status(400).json({
        message: 'Insufficient credits',
        currentBalance,
        required: amount
      });
    }

    // Create deduction transaction (negative amount)
    const newBalance = currentBalance - amount;

    const [transaction] = await db.insert(creditTransactions).values({
      userId,
      amount: -amount,
      balance: newBalance,
      type: 'usage',
      provider,
      shootId,
      description,
      metadata: { deductedAmount: amount }
    }).returning();

    res.json({
      success: true,
      newBalance,
      transactionId: transaction.id
    });
  } catch (error: any) {
    console.error('[Credits] Error deducting credits:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      message: error.message || 'Failed to deduct credits'
    });
  }
});

/**
 * POST /api/credits/refund
 * Refunds credits (admin only)
 */
router.post('/refund', async (req: any, res: Response) => {
  try {
    // Check admin access
    const userEmail = req.user?.claims?.email;
    if (userEmail !== 'steve@lander.media') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { transactionId, reason, userId: targetUserId } = req.body;

    if (!transactionId && !targetUserId) {
      return res.status(400).json({
        message: 'Either transactionId or userId required'
      });
    }

    if (!reason) {
      return res.status(400).json({ message: 'Reason required' });
    }

    let userId: string;
    let refundAmount: number;

    if (transactionId) {
      // Refund specific transaction
      const [transaction] = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.id, transactionId));

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      if (transaction.type !== 'purchase') {
        return res.status(400).json({
          message: 'Can only refund purchase transactions'
        });
      }

      userId = transaction.userId;
      refundAmount = transaction.amount;
    } else {
      // Manual refund with custom amount
      userId = targetUserId;
      refundAmount = req.body.amount || 0;

      if (refundAmount <= 0) {
        return res.status(400).json({ message: 'Refund amount required' });
      }
    }

    // Get current balance
    const [latestTransaction] = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(1);

    const currentBalance = latestTransaction?.balance || 0;
    const newBalance = currentBalance + refundAmount;

    // Create refund transaction
    await db.insert(creditTransactions).values({
      userId,
      amount: refundAmount,
      balance: newBalance,
      type: 'refund',
      description: `Refund: ${reason}`,
      metadata: {
        refundedTransactionId: transactionId,
        reason,
        processedBy: userEmail
      }
    });

    res.json({
      success: true,
      newBalance,
      refundAmount
    });
  } catch (error: any) {
    console.error('[Credits] Error processing refund:', error);
    res.status(500).json({
      message: error.message || 'Failed to process refund'
    });
  }
});

export default router;
