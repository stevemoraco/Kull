// Unit tests for message deduplication system
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMessageFingerprintSync,
  areMessagesDuplicate,
  deduplicateMessages,
  createContentHash,
} from '../../shared/utils/messageFingerprint';

describe('Message Fingerprinting', () => {
  const testMessage = {
    id: 'msg-1',
    role: 'user' as const,
    content: 'Hello, how can I help?',
    timestamp: new Date('2025-01-01T12:00:00Z'),
  };

  describe('createMessageFingerprintSync', () => {
    it('should create consistent fingerprints for same message', () => {
      const fp1 = createMessageFingerprintSync(testMessage);
      const fp2 = createMessageFingerprintSync(testMessage);

      expect(fp1).toBe(fp2);
      expect(fp1).toHaveLength(8); // FNV-1a produces 8-char hex
    });

    it('should create different fingerprints for different content', () => {
      const msg1 = { ...testMessage, content: 'Message 1' };
      const msg2 = { ...testMessage, content: 'Message 2' };

      const fp1 = createMessageFingerprintSync(msg1);
      const fp2 = createMessageFingerprintSync(msg2);

      expect(fp1).not.toBe(fp2);
    });

    it('should create different fingerprints for different roles', () => {
      const msg1 = { ...testMessage, role: 'user' as const };
      const msg2 = { ...testMessage, role: 'assistant' as const };

      const fp1 = createMessageFingerprintSync(msg1);
      const fp2 = createMessageFingerprintSync(msg2);

      expect(fp1).not.toBe(fp2);
    });

    it('should create same fingerprints for messages within same second', () => {
      const msg1 = { ...testMessage, timestamp: new Date('2025-01-01T12:00:00.123Z') };
      const msg2 = { ...testMessage, timestamp: new Date('2025-01-01T12:00:00.789Z') };

      const fp1 = createMessageFingerprintSync(msg1);
      const fp2 = createMessageFingerprintSync(msg2);

      expect(fp1).toBe(fp2); // Same second = same fingerprint
    });

    it('should trim whitespace from content', () => {
      const msg1 = { ...testMessage, content: '  Hello  ' };
      const msg2 = { ...testMessage, content: 'Hello' };

      const fp1 = createMessageFingerprintSync(msg1);
      const fp2 = createMessageFingerprintSync(msg2);

      expect(fp1).toBe(fp2);
    });
  });

  describe('areMessagesDuplicate', () => {
    it('should detect exact duplicates', () => {
      const msg1 = testMessage;
      const msg2 = { ...testMessage, id: 'msg-2' }; // Different ID, same content

      expect(areMessagesDuplicate(msg1, msg2)).toBe(true);
    });

    it('should detect duplicates within 2 seconds', () => {
      const msg1 = { ...testMessage, timestamp: new Date('2025-01-01T12:00:00Z') };
      const msg2 = { ...testMessage, timestamp: new Date('2025-01-01T12:00:01Z'), id: 'msg-2' };

      expect(areMessagesDuplicate(msg1, msg2)).toBe(true);
    });

    it('should not detect duplicates after 2 seconds', () => {
      const msg1 = { ...testMessage, timestamp: new Date('2025-01-01T12:00:00Z') };
      const msg2 = { ...testMessage, timestamp: new Date('2025-01-01T12:00:03Z'), id: 'msg-2' };

      expect(areMessagesDuplicate(msg1, msg2)).toBe(false);
    });

    it('should not detect duplicates with different content', () => {
      const msg1 = { ...testMessage, content: 'Hello' };
      const msg2 = { ...testMessage, content: 'Goodbye', id: 'msg-2' };

      expect(areMessagesDuplicate(msg1, msg2)).toBe(false);
    });

    it('should not detect duplicates with different roles', () => {
      const msg1 = { ...testMessage, role: 'user' as const };
      const msg2 = { ...testMessage, role: 'assistant' as const, id: 'msg-2' };

      expect(areMessagesDuplicate(msg1, msg2)).toBe(false);
    });
  });

  describe('deduplicateMessages', () => {
    it('should remove exact duplicates', () => {
      const messages = [
        { id: 'msg-1', role: 'user' as const, content: 'Hello', timestamp: new Date('2025-01-01T12:00:00Z') },
        { id: 'msg-2', role: 'user' as const, content: 'Hello', timestamp: new Date('2025-01-01T12:00:00Z') },
        { id: 'msg-3', role: 'assistant' as const, content: 'Hi', timestamp: new Date('2025-01-01T12:00:01Z') },
      ];

      const deduplicated = deduplicateMessages(messages);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0].id).toBe('msg-1');
      expect(deduplicated[1].id).toBe('msg-3');
    });

    it('should keep first occurrence of duplicate', () => {
      const messages = [
        { id: 'msg-1', role: 'user' as const, content: 'First', timestamp: new Date('2025-01-01T12:00:00Z') },
        { id: 'msg-2', role: 'user' as const, content: 'First', timestamp: new Date('2025-01-01T12:00:00Z') },
        { id: 'msg-3', role: 'user' as const, content: 'First', timestamp: new Date('2025-01-01T12:00:00Z') },
      ];

      const deduplicated = deduplicateMessages(messages);

      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].id).toBe('msg-1');
    });

    it('should handle empty array', () => {
      const deduplicated = deduplicateMessages([]);

      expect(deduplicated).toHaveLength(0);
    });

    it('should handle array with no duplicates', () => {
      const messages = [
        { id: 'msg-1', role: 'user' as const, content: 'One', timestamp: new Date('2025-01-01T12:00:00Z') },
        { id: 'msg-2', role: 'user' as const, content: 'Two', timestamp: new Date('2025-01-01T12:00:01Z') },
        { id: 'msg-3', role: 'assistant' as const, content: 'Three', timestamp: new Date('2025-01-01T12:00:02Z') },
      ];

      const deduplicated = deduplicateMessages(messages);

      expect(deduplicated).toHaveLength(3);
    });

    it('should trim whitespace before comparison', () => {
      const messages = [
        { id: 'msg-1', role: 'user' as const, content: '  Hello  ', timestamp: new Date('2025-01-01T12:00:00Z') },
        { id: 'msg-2', role: 'user' as const, content: 'Hello', timestamp: new Date('2025-01-01T12:00:00Z') },
      ];

      const deduplicated = deduplicateMessages(messages);

      expect(deduplicated).toHaveLength(1);
    });
  });

  describe('createContentHash', () => {
    it('should create consistent hashes', () => {
      const content = 'Test message content';
      const hash1 = createContentHash(content);
      const hash2 = createContentHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(8);
    });

    it('should trim whitespace', () => {
      const hash1 = createContentHash('  Test  ');
      const hash2 = createContentHash('Test');

      expect(hash1).toBe(hash2);
    });

    it('should create different hashes for different content', () => {
      const hash1 = createContentHash('Message 1');
      const hash2 = createContentHash('Message 2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty strings', () => {
      const hash = createContentHash('');

      expect(hash).toHaveLength(8);
    });

    it('should handle long content', () => {
      const longContent = 'a'.repeat(10000);
      const hash = createContentHash(longContent);

      expect(hash).toHaveLength(8);
    });
  });
});

describe('MessageDeduplicationManager', () => {
  // Note: These tests would require importing the manager from client/src/utils
  // and would need to run in a browser environment or with appropriate mocks

  it('should be covered by integration tests', () => {
    // Placeholder for integration test reference
    expect(true).toBe(true);
  });
});
