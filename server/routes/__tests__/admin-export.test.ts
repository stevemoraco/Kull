/**
 * Tests for Admin CSV Export endpoints
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import adminExportRouter from '../admin-export';
import { storage } from '../../storage';

// Mock the admin auth middleware
vi.mock('../../middleware/adminAuth', () => ({
  requireAdmin: (req: any, res: any, next: any) => {
    // Simulate admin authentication
    req.user = { id: 'admin-user-id' };
    next();
  }
}));

// Mock storage
vi.mock('../../storage', () => ({
  storage: {
    getAllUsers: vi.fn(),
    getChatSessions: vi.fn(),
    getSupportQueryStats: vi.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/api/admin/export', adminExportRouter);

describe('Admin CSV Export Routes', () => {
  beforeAll(() => {
    // Reset all mocks before tests
    vi.clearAllMocks();
  });

  describe('GET /api/admin/export/users-csv', () => {
    it('should export users to CSV format', async () => {
      // Mock user data
      const mockUsers = [
        {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
          subscriptionStatus: 'active',
          subscriptionTier: 'professional',
          trialStartedAt: null,
          trialEndsAt: null,
          trialConvertedAt: null,
          appInstalledAt: new Date('2024-01-01T12:00:00Z'),
          specialOfferExpiresAt: null,
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123'
        }
      ];

      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          messages: JSON.stringify([{ role: 'user', content: 'Hello' }]),
          updatedAt: new Date('2024-01-02T00:00:00Z')
        }
      ];

      vi.mocked(storage.getAllUsers).mockResolvedValue(mockUsers as any);
      vi.mocked(storage.getChatSessions).mockResolvedValue(mockSessions as any);

      const response = await request(app)
        .get('/api/admin/export/users-csv')
        .expect(200);

      // Check headers
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('kull-users-');
      expect(response.headers['content-disposition']).toContain('.csv');

      // Check CSV content
      const csvText = response.text;

      // Should have UTF-8 BOM
      expect(csvText.charCodeAt(0)).toBe(0xFEFF);

      // Should have headers
      expect(csvText).toContain('User ID');
      expect(csvText).toContain('Email');
      expect(csvText).toContain('First Name');
      expect(csvText).toContain('Last Name');
      expect(csvText).toContain('Join Date');
      expect(csvText).toContain('Subscription Status');
      expect(csvText).toContain('Total Sessions');
      expect(csvText).toContain('Total Messages');

      // Should have user data
      expect(csvText).toContain('user-1');
      expect(csvText).toContain('test@example.com');
      expect(csvText).toContain('Test');
      expect(csvText).toContain('User');
      expect(csvText).toContain('active');
      expect(csvText).toContain('professional');

      // Should have session stats
      expect(csvText).toContain('1'); // 1 session
    });

    it('should escape CSV special characters', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'test,with,commas@example.com',
          firstName: 'Test"Quote',
          lastName: 'User\nNewline',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          subscriptionStatus: 'active',
          subscriptionTier: 'professional'
        }
      ];

      vi.mocked(storage.getAllUsers).mockResolvedValue(mockUsers as any);
      vi.mocked(storage.getChatSessions).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/admin/export/users-csv')
        .expect(200);

      const csvText = response.text;

      // Commas should be wrapped in quotes
      expect(csvText).toContain('"test,with,commas@example.com"');

      // Quotes should be escaped
      expect(csvText).toContain('"Test""Quote"');

      // Newlines should be wrapped in quotes
      expect(csvText).toContain('"User\nNewline"');
    });

    it('should handle empty user list', async () => {
      vi.mocked(storage.getAllUsers).mockResolvedValue([]);
      vi.mocked(storage.getChatSessions).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/admin/export/users-csv')
        .expect(200);

      const csvText = response.text;

      // Should still have headers
      expect(csvText).toContain('User ID');
      expect(csvText).toContain('Email');

      // Should only have header row (plus BOM)
      const lines = csvText.trim().split('\n');
      expect(lines.length).toBe(1); // Just headers
    });
  });

  describe('GET /api/admin/export/sessions-csv', () => {
    it('should export sessions to CSV format', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          userEmail: 'test@example.com',
          title: 'Test Session',
          scriptStep: 5,
          messages: JSON.stringify([
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' }
          ]),
          device: 'Desktop',
          browser: 'Chrome',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          ipAddress: '192.168.1.1',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z')
        }
      ];

      vi.mocked(storage.getChatSessions).mockResolvedValue(mockSessions as any);

      const response = await request(app)
        .get('/api/admin/export/sessions-csv')
        .expect(200);

      // Check headers
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('kull-sessions-');

      const csvText = response.text;

      // Should have headers
      expect(csvText).toContain('Session ID');
      expect(csvText).toContain('User ID');
      expect(csvText).toContain('User Email');
      expect(csvText).toContain('Title');
      expect(csvText).toContain('Script Step');
      expect(csvText).toContain('Message Count');
      expect(csvText).toContain('Device');
      expect(csvText).toContain('Browser');

      // Should have session data
      expect(csvText).toContain('session-1');
      expect(csvText).toContain('user-1');
      expect(csvText).toContain('test@example.com');
      expect(csvText).toContain('Test Session');
      expect(csvText).toContain('2'); // 2 messages
      expect(csvText).toContain('Desktop');
      expect(csvText).toContain('Chrome');
      expect(csvText).toContain('San Francisco');
    });

    it('should handle anonymous sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: null,
          userEmail: null,
          title: 'Anonymous Chat',
          scriptStep: null,
          messages: JSON.stringify([{ role: 'user', content: 'Hello' }]),
          device: 'Mobile',
          browser: 'Safari',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      vi.mocked(storage.getChatSessions).mockResolvedValue(mockSessions as any);

      const response = await request(app)
        .get('/api/admin/export/sessions-csv')
        .expect(200);

      const csvText = response.text;

      // Should show "Anonymous" for null userId
      expect(csvText).toContain('Anonymous');
    });
  });

  describe('GET /api/admin/export/support-queries-csv', () => {
    it('should export support queries to CSV format', async () => {
      const mockStats = {
        totalQueries: 10,
        totalCost: 0.05,
        queriesByEmail: [
          {
            email: 'user@example.com',
            count: 5,
            totalCost: 0.025,
            conversationCount: 2,
            totalMessages: 10,
            device: 'Desktop',
            browser: 'Chrome',
            city: 'New York',
            state: 'NY',
            country: 'USA'
          },
          {
            email: 'Anonymous',
            count: 5,
            totalCost: 0.025,
            conversationCount: 3,
            totalMessages: 8,
            device: 'Mobile',
            browser: 'Safari'
          }
        ]
      };

      vi.mocked(storage.getSupportQueryStats).mockResolvedValue(mockStats as any);

      const response = await request(app)
        .get('/api/admin/export/support-queries-csv')
        .expect(200);

      // Check headers
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('kull-support-queries-');

      const csvText = response.text;

      // Should have headers
      expect(csvText).toContain('Email');
      expect(csvText).toContain('Query Count');
      expect(csvText).toContain('Total Cost');
      expect(csvText).toContain('Conversation Count');
      expect(csvText).toContain('Total Messages');

      // Should have query data
      expect(csvText).toContain('user@example.com');
      expect(csvText).toContain('0.025000'); // Cost with 6 decimal places
      expect(csvText).toContain('Anonymous');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(storage.getAllUsers).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/export/users-csv')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Export failed');
      expect(response.body.message).toContain('Database error');
    });
  });
});
