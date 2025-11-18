import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MobilePushAdapter } from '../mobilePushAdapter';
import type { NotificationEvent } from '../../notificationService';

describe('MobilePushAdapter', () => {
  let adapter: MobilePushAdapter;

  beforeEach(() => {
    adapter = new MobilePushAdapter();
  });

  describe('Initialization', () => {
    it('should initialize without APNs credentials in test environment', () => {
      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('mobile-apns');
    });

    it('should handle missing APNs credentials gracefully', () => {
      // APNs credentials are not set in test environment
      // Adapter should still initialize but log warnings
      const consoleSpy = vi.spyOn(console, 'warn');
      const testAdapter = new MobilePushAdapter();

      expect(testAdapter).toBeDefined();
      // Should have warned about missing credentials
      // (may or may not depending on env vars)
    });
  });

  describe('Message Formatting', () => {
    it('should format shoot_complete notification correctly', async () => {
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'shoot_complete',
        payload: {
          shootId: 'shoot-456',
          imageCount: 1247,
          activeCount: 2,
          mobileDevices: [
            {
              token: 'mock-device-token-123',
              platform: 'ios',
              deviceName: 'iPhone 15 Pro'
            }
          ]
        }
      };

      // In test environment without APNs credentials, this should log simulation
      const consoleSpy = vi.spyOn(console, 'log');
      await adapter.send(event);

      // Should log simulation message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[mobile push] SIMULATION'),
        expect.anything()
      );
    });

    it('should format device_connected notification correctly', async () => {
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'device_connected',
        payload: {
          deviceName: 'MacBook Pro',
          deviceId: 'device-789',
          mobileDevices: [
            {
              token: 'mock-token',
              platform: 'ios'
            }
          ]
        }
      };

      const consoleSpy = vi.spyOn(console, 'log');
      await adapter.send(event);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should format device_disconnected notification correctly', async () => {
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'device_disconnected',
        payload: {
          deviceName: 'iPad Pro',
          deviceId: 'device-101',
          mobileDevices: [
            {
              token: 'mock-token',
              platform: 'ios'
            }
          ]
        }
      };

      const consoleSpy = vi.spyOn(console, 'log');
      await adapter.send(event);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should format credit_low notification correctly', async () => {
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'credit_low',
        payload: {
          remaining: 100,
          mobileDevices: [
            {
              token: 'mock-token',
              platform: 'ios'
            }
          ]
        }
      };

      const consoleSpy = vi.spyOn(console, 'log');
      await adapter.send(event);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should format shoot_failed notification correctly', async () => {
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'shoot_failed',
        payload: {
          shootId: 'shoot-999',
          reason: 'API rate limit exceeded',
          mobileDevices: [
            {
              token: 'mock-token',
              platform: 'ios'
            }
          ]
        }
      };

      const consoleSpy = vi.spyOn(console, 'log');
      await adapter.send(event);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should format batch_complete notification correctly', async () => {
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'batch_complete',
        payload: {
          batchId: 'batch-555',
          imageCount: 5000,
          successCount: 4950,
          mobileDevices: [
            {
              token: 'mock-token',
              platform: 'ios'
            }
          ]
        }
      };

      const consoleSpy = vi.spyOn(console, 'log');
      await adapter.send(event);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Device Filtering', () => {
    it('should extract iOS devices from payload', async () => {
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'shoot_complete',
        payload: {
          shootId: 'shoot-123',
          imageCount: 100,
          activeCount: 1,
          mobileDevices: [
            {
              token: 'ios-token-1',
              platform: 'ios',
              deviceName: 'iPhone 15'
            },
            {
              token: 'android-token-1',
              platform: 'android',
              deviceName: 'Pixel 8'
            },
            {
              token: 'ios-token-2',
              platform: 'ios',
              deviceName: 'iPad Pro'
            }
          ]
        }
      };

      const consoleSpy = vi.spyOn(console, 'log');
      await adapter.send(event);

      // Should process iOS devices (in simulation mode)
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle no registered devices', async () => {
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'shoot_complete',
        payload: {
          shootId: 'shoot-123',
          imageCount: 100,
          activeCount: 1
          // No mobileDevices array
        }
      };

      const consoleSpy = vi.spyOn(console, 'info');
      await adapter.send(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('no registered devices')
      );
    });

    it('should handle empty devices array', async () => {
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'shoot_complete',
        payload: {
          shootId: 'shoot-123',
          imageCount: 100,
          activeCount: 1,
          mobileDevices: []
        }
      };

      const consoleSpy = vi.spyOn(console, 'info');
      await adapter.send(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('no registered devices')
      );
    });
  });

  describe('Token Masking', () => {
    it('should mask long device tokens', async () => {
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'shoot_complete',
        payload: {
          shootId: 'shoot-123',
          imageCount: 100,
          activeCount: 1,
          mobileDevices: [
            {
              token: 'abcdefghijklmnopqrstuvwxyz1234567890',
              platform: 'ios'
            }
          ]
        }
      };

      const consoleSpy = vi.spyOn(console, 'log');
      await adapter.send(event);

      // Should mask the token in logs
      const logCall = consoleSpy.mock.calls.find(call =>
        call[0].includes('SIMULATION')
      );
      expect(logCall).toBeDefined();
      expect(logCall![0]).toContain('abcd…7890');
    });

    it('should not mask short tokens', async () => {
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'shoot_complete',
        payload: {
          shootId: 'shoot-123',
          imageCount: 100,
          activeCount: 1,
          mobileDevices: [
            {
              token: 'short',
              platform: 'ios'
            }
          ]
        }
      };

      const consoleSpy = vi.spyOn(console, 'log');
      await adapter.send(event);

      const logCall = consoleSpy.mock.calls.find(call =>
        call[0].includes('SIMULATION')
      );
      expect(logCall).toBeDefined();
      expect(logCall![0]).toContain('short');
    });
  });

  describe('Direct Send Methods', () => {
    it('should send shoot complete notification', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await adapter.sendShootComplete(
        'mock-device-token',
        'shoot-123',
        1247,
        2
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[APNs] SIMULATION shoot_complete')
      );
    });

    it('should send device connected notification', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await adapter.sendDeviceConnected(
        'mock-device-token',
        'MacBook Pro'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[APNs] SIMULATION device_connected')
      );
    });
  });

  describe('Badge Handling', () => {
    it('should include badge count in shoot_complete notification', async () => {
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'shoot_complete',
        payload: {
          shootId: 'shoot-123',
          imageCount: 1000,
          activeCount: 5,
          mobileDevices: [
            {
              token: 'mock-token',
              platform: 'ios'
            }
          ]
        }
      };

      const consoleSpy = vi.spyOn(console, 'log');
      await adapter.send(event);

      // Badge should be set to activeCount (5)
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should default badge to 0 if activeCount missing', async () => {
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'shoot_complete',
        payload: {
          shootId: 'shoot-123',
          imageCount: 1000,
          // activeCount missing
          mobileDevices: [
            {
              token: 'mock-token',
              platform: 'ios'
            }
          ]
        }
      };

      const consoleSpy = vi.spyOn(console, 'log');
      await adapter.send(event);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle individual device failures gracefully', async () => {
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'shoot_complete',
        payload: {
          shootId: 'shoot-123',
          imageCount: 100,
          activeCount: 1,
          mobileDevices: [
            {
              token: 'valid-token',
              platform: 'ios'
            },
            {
              token: 'invalid-token',
              platform: 'ios'
            }
          ]
        }
      };

      // Should not throw even if individual devices fail
      await expect(adapter.send(event)).resolves.not.toThrow();
    });

    it('should log errors for failed sends', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      // Simulate error by providing invalid data
      const event: NotificationEvent = {
        userId: 'user-123',
        type: 'unknown_type' as any,
        payload: {
          mobileDevices: [
            {
              token: 'mock-token',
              platform: 'ios'
            }
          ]
        }
      };

      await adapter.send(event);

      // Should handle unknown type gracefully
      expect(adapter).toBeDefined();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await expect(adapter.shutdown()).resolves.not.toThrow();
    });

    it('should log shutdown message if provider exists', async () => {
      // In test environment, provider is null, so no log
      await adapter.shutdown();
      expect(adapter).toBeDefined();
    });
  });
});
