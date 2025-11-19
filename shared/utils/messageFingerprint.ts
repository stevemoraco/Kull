// Message fingerprinting and deduplication utilities
// Uses SHA-256 to create unique fingerprints for messages

interface MessageFingerprint {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string | number;
}

/**
 * Creates a SHA-256 hash fingerprint from message content
 * Format: SHA-256(role:content:timestamp_rounded)
 *
 * Rounds timestamp to nearest second to prevent minor timing variations
 * from creating different fingerprints for identical messages
 */
export async function createMessageFingerprint(message: MessageFingerprint): Promise<string> {
  // Round timestamp to nearest second to avoid millisecond variations
  const roundedTimestamp = Math.floor(new Date(message.timestamp).getTime() / 1000);

  // Create canonical string: role|content|timestamp
  const canonical = `${message.role}|${message.content.trim()}|${roundedTimestamp}`;

  // Use Web Crypto API (available in browsers and Node.js 15+)
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);

  // Create SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Fallback synchronous fingerprint for environments without crypto.subtle
 * Uses simpler hash algorithm (FNV-1a)
 */
export function createMessageFingerprintSync(message: MessageFingerprint): string {
  const roundedTimestamp = Math.floor(new Date(message.timestamp).getTime() / 1000);
  const canonical = `${message.role}|${message.content.trim()}|${roundedTimestamp}`;

  // FNV-1a hash algorithm (32-bit)
  let hash = 2166136261;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  // Convert to unsigned 32-bit hex
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Check if two messages are duplicates based on content and timing
 * Returns true if messages are considered duplicates
 */
export function areMessagesDuplicate(msg1: MessageFingerprint, msg2: MessageFingerprint): boolean {
  // Different roles = not duplicates
  if (msg1.role !== msg2.role) return false;

  // Different content = not duplicates
  if (msg1.content.trim() !== msg2.content.trim()) return false;

  // Check if timestamps are within 2 seconds of each other
  const time1 = new Date(msg1.timestamp).getTime();
  const time2 = new Date(msg2.timestamp).getTime();
  const timeDiff = Math.abs(time1 - time2);

  // Within 2 seconds = likely duplicate
  return timeDiff < 2000;
}

/**
 * Deduplicate an array of messages
 * Keeps the first occurrence of each unique message
 */
export function deduplicateMessages<T extends MessageFingerprint>(messages: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const message of messages) {
    // Create a quick key for deduplication
    const key = `${message.role}:${message.content.trim()}:${Math.floor(new Date(message.timestamp).getTime() / 1000)}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(message);
    }
  }

  return result;
}

/**
 * Create a content hash for database indexing
 * Shorter than full fingerprint, suitable for database index
 */
export function createContentHash(content: string): string {
  // FNV-1a hash of content only (for database index)
  let hash = 2166136261;
  const normalized = content.trim();

  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}
