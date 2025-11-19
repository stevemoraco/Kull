/**
 * Secure localStorage utilities for chat sessions
 * Ensures user-specific storage to prevent data leakage between users
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get user-specific localStorage key
 * @param baseKey - The base key name (e.g., 'chat_sessions', 'current_session_id')
 * @param userId - Optional user ID. If not provided, uses 'anon' for anonymous users
 */
export const getUserStorageKey = (baseKey: string, userId?: string): string => {
  if (userId) {
    return `kull_${baseKey}_user_${userId}`;
  }
  return `kull_${baseKey}_anon`;
};

/**
 * Load chat sessions from localStorage (user-specific)
 */
export const loadSessions = (userId?: string): ChatSession[] => {
  const storageKey = getUserStorageKey('chat_sessions', userId);
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
    } catch (e) {
      console.error('[ChatStorage] Failed to parse stored sessions:', e);
    }
  }
  return [];
};

/**
 * Save chat sessions to localStorage (user-specific)
 */
export const saveSessions = (sessions: ChatSession[], userId?: string) => {
  const storageKey = getUserStorageKey('chat_sessions', userId);
  localStorage.setItem(storageKey, JSON.stringify(sessions));
};

/**
 * Get current session ID from localStorage (user-specific)
 */
export const getCurrentSessionId = (userId?: string): string | null => {
  const storageKey = getUserStorageKey('current_session_id', userId);
  return localStorage.getItem(storageKey);
};

/**
 * Set current session ID in localStorage (user-specific)
 */
export const setCurrentSessionId = (sessionId: string, userId?: string) => {
  const storageKey = getUserStorageKey('current_session_id', userId);
  localStorage.setItem(storageKey, sessionId);
};

/**
 * Get session start time from localStorage (user-specific)
 */
export const getSessionStartTime = (userId?: string): number => {
  const storageKey = getUserStorageKey('session_start_time', userId);
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    return parseInt(stored, 10);
  }
  const now = Date.now();
  setSessionStartTime(now, userId);
  return now;
};

/**
 * Set session start time in localStorage (user-specific)
 */
export const setSessionStartTime = (timestamp: number, userId?: string) => {
  const storageKey = getUserStorageKey('session_start_time', userId);
  localStorage.setItem(storageKey, timestamp.toString());
};

/**
 * Get chat open state from localStorage (user-specific)
 */
export const getChatOpenState = (userId?: string): boolean => {
  const storageKey = getUserStorageKey('chat_open', userId);
  return localStorage.getItem(storageKey) === 'true';
};

/**
 * Set chat open state in localStorage (user-specific)
 */
export const setChatOpenState = (isOpen: boolean, userId?: string) => {
  const storageKey = getUserStorageKey('chat_open', userId);
  localStorage.setItem(storageKey, isOpen.toString());
};

/**
 * Migrate anonymous sessions to user sessions on login
 * This moves all anonymous chat data to user-specific storage
 */
export const migrateAnonymousSessions = (userId: string): ChatSession[] => {
  const anonKey = getUserStorageKey('chat_sessions', undefined);
  const anonSessions = localStorage.getItem(anonKey);

  if (!anonSessions) {
    console.log('[ChatStorage] No anonymous sessions to migrate');
    return [];
  }

  try {
    const parsed = JSON.parse(anonSessions);
    const migrated: ChatSession[] = parsed.map((session: any) => ({
      ...session,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      messages: session.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
    }));

    // Save to user-specific storage
    if (migrated.length > 0) {
      saveSessions(migrated, userId);
    }

    // Migrate other anonymous data
    const anonSessionId = getCurrentSessionId(undefined);
    if (anonSessionId) {
      setCurrentSessionId(anonSessionId, userId);
    }

    const anonChatOpen = getChatOpenState(undefined);
    setChatOpenState(anonChatOpen, userId);

    // Clear anonymous sessions after migration
    localStorage.removeItem(anonKey);
    localStorage.removeItem(getUserStorageKey('current_session_id', undefined));
    localStorage.removeItem(getUserStorageKey('session_start_time', undefined));
    localStorage.removeItem(getUserStorageKey('chat_open', undefined));

    console.log(`[ChatStorage] Migrated ${migrated.length} anonymous sessions to user ${userId}`);

    return migrated;
  } catch (e) {
    console.error('[ChatStorage] Failed to migrate anonymous sessions:', e);
    return [];
  }
};

/**
 * Clear all user-specific chat data on logout
 * This removes all localStorage keys for a specific user
 */
export const clearUserChatData = (userId: string) => {
  const keysToRemove: string[] = [];

  // Find all localStorage keys for this user
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`kull_`) && key.includes(`_user_${userId}`)) {
      keysToRemove.push(key);
    }
  }

  // Remove all user-specific keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  console.log(`[ChatStorage] Cleared ${keysToRemove.length} localStorage items for user ${userId}`);
};

/**
 * Migrate old non-user-specific keys to user-specific keys
 * This is for backward compatibility with existing users
 */
export const migrateLegacyStorage = (userId: string) => {
  const legacyKeys = [
    'kull-chat-sessions',
    'kull-current-session-id',
    'kull-session-start-time',
    'kull-chat-open',
  ];

  let migratedCount = 0;

  legacyKeys.forEach(legacyKey => {
    const value = localStorage.getItem(legacyKey);
    if (value) {
      // Extract base key name (remove 'kull-' prefix and convert dashes to underscores)
      const baseKey = legacyKey.replace('kull-', '').replace(/-/g, '_');
      const newKey = getUserStorageKey(baseKey, userId);

      // Only migrate if new key doesn't exist
      if (!localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, value);
        migratedCount++;
        console.log(`[ChatStorage] Migrated ${legacyKey} → ${newKey}`);
      }

      // Remove legacy key
      localStorage.removeItem(legacyKey);
    }
  });

  if (migratedCount > 0) {
    console.log(`[ChatStorage] Migrated ${migratedCount} legacy storage keys for user ${userId}`);
  }
};
