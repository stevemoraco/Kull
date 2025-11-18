import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import creditsRouter from '../../server/routes/credits';

// Mock database with in-memory storage
const mockTransactions: any[] = [];

vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          // For usage-summary which just needs array
          then: (resolve: any) => resolve(mockTransactions),
          // For balance/transactions which need orderBy chain
          orderBy: vi.fn(() => ({
            limit: vi.fn((n: number) => ({
              offset: vi.fn((off: number) => mockTransactions.slice(off, off + n)),
              then: (resolve: any) => resolve(mockTransactions.slice(-n)),
            })),
            then: (resolve: any) => resolve(mockTransactions),
          })),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn((n: number) => ({
            offset: vi.fn((off: number) => mockTransactions.slice(off, off + n)),
            then: (resolve: any) => resolve(mockTransactions.slice(-n)),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((data: any) => {
        const newTx = Array.isArray(data) ? data[0] : data;
        const tx = {
          id: mockTransactions.length + 1,
          ...newTx,
          createdAt: new Date(),
        };
        mockTransactions.push(tx);
        return {
          returning: vi.fn(() => [tx]),
        };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({})),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({})),
    })),
  },
}));

// Mock Stripe
vi.mock('../../server/stripe', () => ({
  createPaymentIntent: vi.fn(async (amount, userId, description) => ({
    id: `pi_test_${Date.now()}`,
    client_secret: 'test_secret',
    status: 'requires_payment_method',
  })),
  getPaymentIntent: vi.fn(async (id) => ({
    id,
    status: 'succeeded',
  })),
}));

describe('Credits API Integration Tests', () => {
  let app: express.Application;
  let testUserId: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
  });

  beforeEach(() => {
    testUserId = `test-user-${Date.now()}`;
    mockTransactions.length = 0;

    // Mock auth middleware
    const authMiddleware = (req: any, res: any, next: any) => {
      req.user = { claims: { sub: testUserId, email: 'test@example.com' } };
      next();
    };

    // Recreate app with new auth middleware for each test
    app = express();
    app.use(express.json());
    app.use('/api/credits', authMiddleware, creditsRouter);
  });

  describe('GET /api/credits/balance', () => {
    it('should return zero balance for new user', async () => {
      const response = await request(app).get('/api/credits/balance');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('balance');
      expect(response.body.balance).toBe(0);
    });

    it('should require authentication', async () => {
      const appNoAuth = express();
      appNoAuth.use(express.json());
      appNoAuth.use('/api/credits', creditsRouter);

      const response = await request(appNoAuth).get('/api/credits/balance');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('GET /api/credits/transactions', () => {
    it('should return empty array for user with no transactions', async () => {
      const response = await request(app).get('/api/credits/transactions');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/credits/usage-summary', () => {
    it('should return summary with zeros for new user', async () => {
      const response = await request(app).get('/api/credits/usage-summary');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalPurchased', 0);
      expect(response.body).toHaveProperty('totalSpent', 0);
      expect(response.body).toHaveProperty('currentBalance', 0);
      expect(response.body).toHaveProperty('byProvider');
      expect(typeof response.body.byProvider).toBe('object');
    });
  });

  describe('POST /api/credits/purchase', () => {
    it('should accept valid purchase request for $500 package', async () => {
      const response = await request(app)
        .post('/api/credits/purchase')
        .send({ packageAmount: 500 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body).toHaveProperty('paymentIntentId');
      expect(response.body.clientSecret).toBe('test_secret');
    });

    it('should accept valid purchase request for $1000 package', async () => {
      const response = await request(app)
        .post('/api/credits/purchase')
        .send({ packageAmount: 1000 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body).toHaveProperty('paymentIntentId');
    });

    it('should reject invalid package amount', async () => {
      const response = await request(app)
        .post('/api/credits/purchase')
        .send({ packageAmount: 250 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid package amount');
    });

    it('should reject request without package amount', async () => {
      const response = await request(app)
        .post('/api/credits/purchase')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/credits/purchase-confirm', () => {
    it('should reject request without payment intent ID', async () => {
      const response = await request(app)
        .post('/api/credits/purchase-confirm')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Payment intent ID required');
    });
  });

  describe('POST /api/credits/deduct', () => {
    it('should reject deduction without provider', async () => {
      const response = await request(app)
        .post('/api/credits/deduct')
        .send({
          amount: 500,
          shootId: 'shoot123',
          description: 'Missing provider',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Provider required');
    });

    it('should reject deduction without description', async () => {
      const response = await request(app)
        .post('/api/credits/deduct')
        .send({
          amount: 500,
          provider: 'openai',
          shootId: 'shoot123',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Description required');
    });

    it('should reject deduction with invalid amount', async () => {
      const response = await request(app)
        .post('/api/credits/deduct')
        .send({
          amount: -100,
          provider: 'openai',
          description: 'Invalid amount',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid amount');
    });

    it('should reject deduction with zero amount', async () => {
      const response = await request(app)
        .post('/api/credits/deduct')
        .send({
          amount: 0,
          provider: 'openai',
          description: 'Zero amount',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid amount');
    });
  });

  describe('POST /api/credits/refund', () => {
    it('should reject refund from non-admin user', async () => {
      const response = await request(app)
        .post('/api/credits/refund')
        .send({
          transactionId: 1,
          reason: 'Test refund',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Admin access required');
    });

    it('should reject refund without reason', async () => {
      const appAdmin = express();
      appAdmin.use(express.json());
      appAdmin.use((req: any, res, next) => {
        req.user = { claims: { sub: testUserId, email: 'steve@lander.media' } };
        next();
      });
      appAdmin.use('/api/credits', creditsRouter);

      const response = await request(appAdmin)
        .post('/api/credits/refund')
        .send({
          transactionId: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Reason required');
    });
  });

  describe('API validation', () => {
    it('should validate all required fields for deduction', async () => {
      const tests = [
        { send: { amount: 500, provider: 'openai' }, expectedError: 'Description required' },
        { send: { amount: 500, description: 'Test' }, expectedError: 'Provider required' },
        { send: { provider: 'openai', description: 'Test' }, expectedError: 'Invalid amount' },
      ];

      for (const test of tests) {
        const response = await request(app)
          .post('/api/credits/deduct')
          .send(test.send);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(test.expectedError);
      }
    }, 10000); // Increase timeout for multiple sequential requests
  });
});
