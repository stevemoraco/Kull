// Frontend message deduplication utilities
// Prevents duplicate messages from appearing in the UI

import { deduplicateMessages, areMessagesDuplicate, createMessageFingerprintSync } from '@shared/utils/messageFingerprint';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * In-memory set to track message fingerprints
 * Prevents duplicates during the current session
 */
class MessageDeduplicationManager {
  private seenFingerprints: Set<string>;
  private recentMessages: Map<string, Message>;
  private duplicateCount: number;

  constructor() {
    this.seenFingerprints = new Set();
    this.recentMessages = new Map();
    this.duplicateCount = 0;
  }

  /**
   * Check if a message is a duplicate
   * Returns true if duplicate (should be rejected)
   */
  isDuplicate(message: Message): boolean {
    // Check by ID first (fastest)
    if (this.recentMessages.has(message.id)) {
      this.duplicateCount++;
      console.warn('[Dedup] Duplicate message detected by ID:', message.id);
      return true;
    }

    // Create fingerprint for content-based deduplication
    const fingerprint = createMessageFingerprintSync({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
    });

    // Check if we've seen this fingerprint
    if (this.seenFingerprints.has(fingerprint)) {
      this.duplicateCount++;
      console.warn('[Dedup] Duplicate message detected by fingerprint:', fingerprint.substring(0, 8));
      return true;
    }

    // Check for near-duplicates in recent messages (same content, close timing)
    for (const [id, recentMsg] of this.recentMessages.entries()) {
      if (areMessagesDuplicate(message, recentMsg)) {
        this.duplicateCount++;
        console.warn('[Dedup] Duplicate message detected by similarity to:', id);
        return true;
      }
    }

    // Not a duplicate - register it
    this.seenFingerprints.add(fingerprint);
    this.recentMessages.set(message.id, message);

    // Limit memory usage - keep only last 100 messages
    if (this.recentMessages.size > 100) {
      const oldestKey = this.recentMessages.keys().next().value;
      this.recentMessages.delete(oldestKey);
    }

    return false;
  }

  /**
   * Add a message to the tracking system without checking
   * Used for pre-existing messages loaded from storage
   */
  register(message: Message): void {
    const fingerprint = createMessageFingerprintSync({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
    });

    this.seenFingerprints.add(fingerprint);
    this.recentMessages.set(message.id, message);
  }

  /**
   * Deduplicate an entire message array
   * Returns cleaned array with duplicates removed
   */
  deduplicateArray(messages: Message[]): Message[] {
    const cleaned = deduplicateMessages(messages);

    if (cleaned.length < messages.length) {
      const removedCount = messages.length - cleaned.length;
      console.warn(`[Dedup] Removed ${removedCount} duplicate messages from array`);
      this.duplicateCount += removedCount;
    }

    return cleaned;
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.seenFingerprints.clear();
    this.recentMessages.clear();
  }

  /**
   * Get statistics about duplicate detection
   */
  getStats() {
    return {
      totalDuplicatesDetected: this.duplicateCount,
      trackedFingerprints: this.seenFingerprints.size,
      recentMessages: this.recentMessages.size,
    };
  }

  /**
   * Send alert to admin if duplicate rate is high
   */
  async checkAndAlert(): Promise<void> {
    const stats = this.getStats();

    // Alert if more than 5 duplicates detected
    if (stats.totalDuplicatesDetected > 5) {
      console.error('[Dedup] HIGH DUPLICATE RATE:', stats);

      // Send alert to backend
      try {
        await fetch('/api/admin/alert-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'message_duplicates',
            stats,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.error('[Dedup] Failed to send alert:', error);
      }
    }
  }
}

// Singleton instance for the entire app
export const messageDeduplication = new MessageDeduplicationManager();

/**
 * React hook for message deduplication
 * Use this in components to automatically filter duplicates
 */
export function useMessageDeduplication(messages: Message[]): Message[] {
  // Deduplicate on every render
  return messageDeduplication.deduplicateArray(messages);
}
