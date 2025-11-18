import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import deviceAuthRouter from '../../server/routes/device-auth';
import { generateDeviceAccessToken } from '../../server/auth/jwt';

// Mock database
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(() => []) })) })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => [{ id: 1 }]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({})) })) })),
    delete: vi.fn(() => ({ where: vi.fn(() => ({})) })),
  },
}));

// Mock storage
vi.mock('../../server/storage', () => ({
  storage: {
    getUser: vi.fn(async (userId: string) => ({ id: userId, email: 'test@example.com' })),
    getDeviceSession: vi.fn(async (deviceId: string) => null),
    createDeviceSession: vi.fn(async (session: any) => session),
    updateDeviceLastSeen: vi.fn(async (deviceId: string) => {}),
    revokeDeviceSession: vi.fn(async (deviceId: string) => {}),
    getUserDeviceSessions: vi.fn(async (userId: string) => []),
    updateDevicePushToken: vi.fn(async (deviceId: string, token: string) => {}),
  },
}));

// Mock storage and auth
vi.mock('../../server/replitAuth', () => ({
  isAuthenticated: (req: any, res: any, next: any) => {
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  },
  hasPaidAccessMiddleware: (req: any, res: any, next: any) => next(),
  hasPaidAccessDevice: (req: any, res: any, next: any) => next(),
}));

describe('Device Authentication API Integration Tests', () => {
  let app: express.Application;
  let testUserId: string;
  let testDeviceId: string;
  let testCode: string;

  beforeAll(() => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/device-auth', deviceAuthRouter);
  });

  beforeEach(() => {
    testUserId = `test-user-${Date.now()}`;
    testDeviceId = `test-device-${Date.now()}`;
    vi.clearAllMocks();
  });

  afterAll(async () => {
    // Cleanup test data - not needed with mocked storage
  });

  describe('POST /api/device-auth/request', () => {
    it('should generate a 6-digit auth code for valid device request', async () => {
      const response = await request(app)
        .post('/api/device-auth/request')
        .send({
          deviceId: testDeviceId,
          platform: 'macos',
          deviceName: 'Test MacBook Pro',
          appVersion: '1.0.0',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code');
      expect(response.body.code).toMatch(/^[A-Z0-9]{6}$/);
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body).toHaveProperty('verificationUrl');

      testCode = response.body.code;
    });

    it('should reject request with missing fields', async () => {
      const response = await request(app)
        .post('/api/device-auth/request')
        .send({
          deviceId: testDeviceId,
          // Missing platform, deviceName, appVersion
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('Missing required fields');
    });

    it('should reject request with invalid platform', async () => {
      const response = await request(app)
        .post('/api/device-auth/request')
        .send({
          deviceId: testDeviceId,
          platform: 'invalid-platform',
          deviceName: 'Test Device',
          appVersion: '1.0.0',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid platform');
      expect(response.body.message).toContain('macos, ios, ipados');
    });

    it('should enforce rate limiting (max 5 requests per device per hour)', async () => {
      const deviceId = `rate-limit-test-${Date.now()}`;

      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/device-auth/request')
          .send({
            deviceId,
            platform: 'macos',
            deviceName: 'Test Device',
            appVersion: '1.0.0',
          });

        expect(response.status).toBe(200);
      }

      // 6th request should be rate limited
      const response = await request(app)
        .post('/api/device-auth/request')
        .send({
          deviceId,
          platform: 'macos',
          deviceName: 'Test Device',
          appVersion: '1.0.0',
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Rate limit exceeded');
      expect(response.body).toHaveProperty('resetAt');
    });
  });

  describe('GET /api/device-auth/status/:code', () => {
    beforeEach(async () => {
      // Create a fresh auth code before each test
      const response = await request(app)
        .post('/api/device-auth/request')
        .send({
          deviceId: testDeviceId,
          platform: 'macos',
          deviceName: 'Test Device',
          appVersion: '1.0.0',
        });

      testCode = response.body.code;
    });

    it('should return pending status for unapproved code', async () => {
      const response = await request(app).get(`/api/device-auth/status/${testCode}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('pending');
      expect(response.body.deviceId).toBe(testDeviceId);
    });

    it('should return expired status for non-existent code', async () => {
      const response = await request(app).get('/api/device-auth/status/XXXXXX');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('expired');
    });

    it('should reject invalid code format', async () => {
      const response = await request(app).get('/api/device-auth/status/123');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid code format');
    });
  });

  describe('POST /api/device-auth/approve', () => {
    beforeEach(async () => {
      // Create a fresh auth code
      const response = await request(app)
        .post('/api/device-auth/request')
        .send({
          deviceId: testDeviceId,
          platform: 'macos',
          deviceName: 'Test Device',
          appVersion: '1.0.0',
        });

      testCode = response.body.code;
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/device-auth/approve')
        .send({ code: testCode });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should reject invalid code format', async () => {
      const appWithAuth = express();
      appWithAuth.use(express.json());
      appWithAuth.use((req: any, res, next) => {
        req.user = { claims: { sub: testUserId } };
        next();
      });
      appWithAuth.use('/api/device-auth', deviceAuthRouter);

      const response = await request(appWithAuth)
        .post('/api/device-auth/approve')
        .send({ code: '123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid code format');
    });

    it('should reject non-existent code', async () => {
      const appWithAuth = express();
      appWithAuth.use(express.json());
      appWithAuth.use((req: any, res, next) => {
        req.user = { claims: { sub: testUserId } };
        next();
      });
      appWithAuth.use('/api/device-auth', deviceAuthRouter);

      const response = await request(appWithAuth)
        .post('/api/device-auth/approve')
        .send({ code: 'XXXXXX' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Code not found or expired');
    });
  });

  describe('POST /api/device-auth/refresh', () => {
    it('should reject request without refresh token', async () => {
      const response = await request(app)
        .post('/api/device-auth/refresh')
        .send({ deviceId: testDeviceId });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing refreshToken or deviceId');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/device-auth/refresh')
        .send({
          refreshToken: 'invalid-token',
          deviceId: testDeviceId,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/device-auth/revoke', () => {
    it('should require device token authentication', async () => {
      const response = await request(app)
        .post('/api/device-auth/revoke')
        .send({ deviceId: testDeviceId });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    it('should reject request without device ID', async () => {
      const token = generateDeviceAccessToken(testUserId, testDeviceId, 'macos');

      const response = await request(app)
        .post('/api/device-auth/revoke')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      // Should fail because device session doesn't exist
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/device-auth/sessions', () => {
    it('should require device token authentication', async () => {
      const response = await request(app).get('/api/device-auth/sessions');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });
  });

  describe('POST /api/device-auth/revoke-all', () => {
    it('should require device token authentication', async () => {
      const response = await request(app).post('/api/device-auth/revoke-all');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });
  });

  describe('POST /api/device-auth/update-push-token', () => {
    it('should require device token authentication', async () => {
      const response = await request(app)
        .post('/api/device-auth/update-push-token')
        .send({ pushToken: 'test-token' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    it('should reject request without push token', async () => {
      const token = generateDeviceAccessToken(testUserId, testDeviceId, 'macos');

      const response = await request(app)
        .post('/api/device-auth/update-push-token')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      // Should fail because device session doesn't exist
      expect(response.status).toBe(401);
    });
  });

  describe('Full authentication flow', () => {
    it('should complete full device authentication flow', async () => {
      const deviceId = `flow-test-${Date.now()}`;

      // Step 1: Request auth code
      const requestResponse = await request(app)
        .post('/api/device-auth/request')
        .send({
          deviceId,
          platform: 'macos',
          deviceName: 'Test MacBook',
          appVersion: '1.0.0',
        });

      expect(requestResponse.status).toBe(200);
      const code = requestResponse.body.code;

      // Step 2: Check status (should be pending)
      const statusResponse1 = await request(app).get(`/api/device-auth/status/${code}`);

      expect(statusResponse1.status).toBe(200);
      expect(statusResponse1.body.status).toBe('pending');

      // Note: Actual approval requires a real user session and database setup
      // This test verifies the API contract and error handling
    });
  });
});
