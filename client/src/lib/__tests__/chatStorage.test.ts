/**
 * Tests for secure chat storage utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUserStorageKey,
  loadSessions,
  saveSessions,
  migrateAnonymousSessions,
  clearUserChatData,
  migrateLegacyStorage,
  type ChatSession,
} from '../chatStorage';

describe('chatStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('getUserStorageKey', () => {
    it('should create user-specific key when userId provided', () => {
      const key = getUserStorageKey('chat_sessions', '12345');
      expect(key).toBe('kull_chat_sessions_user_12345');
    });

    it('should create anonymous key when no userId provided', () => {
      const key = getUserStorageKey('chat_sessions');
      expect(key).toBe('kull_chat_sessions_anon');
    });

    it('should create different keys for different users', () => {
      const key1 = getUserStorageKey('chat_sessions', 'user1');
      const key2 = getUserStorageKey('chat_sessions', 'user2');
      expect(key1).not.toBe(key2);
    });
  });

  describe('saveSessions and loadSessions', () => {
    const mockSession: ChatSession = {
      id: 'session1',
      title: 'Test Session',
      messages: [
        {
          id: 'msg1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date('2025-01-01'),
        },
      ],
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    it('should save and load sessions for logged-in user', () => {
      saveSessions([mockSession], 'user123');
      const loaded = loadSessions('user123');

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('session1');
      expect(loaded[0].title).toBe('Test Session');
    });

    it('should save and load sessions for anonymous user', () => {
      saveSessions([mockSession]);
      const loaded = loadSessions();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('session1');
    });

    it('should isolate sessions between users', () => {
      saveSessions([mockSession], 'user1');
      saveSessions([{ ...mockSession, id: 'session2' }], 'user2');

      const user1Sessions = loadSessions('user1');
      const user2Sessions = loadSessions('user2');

      expect(user1Sessions[0].id).toBe('session1');
      expect(user2Sessions[0].id).toBe('session2');
    });

    it('should return empty array if no sessions exist', () => {
      const loaded = loadSessions('nonexistent');
      expect(loaded).toEqual([]);
    });
  });

  describe('migrateAnonymousSessions', () => {
    const mockSession: ChatSession = {
      id: 'anon-session',
      title: 'Anonymous Chat',
      messages: [],
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    it('should migrate anonymous sessions to user account', () => {
      // Save as anonymous
      saveSessions([mockSession]);

      // Migrate to user
      const migrated = migrateAnonymousSessions('user123');

      expect(migrated).toHaveLength(1);
      expect(migrated[0].id).toBe('anon-session');

      // Verify saved to user storage
      const userSessions = loadSessions('user123');
      expect(userSessions).toHaveLength(1);

      // Verify anonymous storage is cleared
      const anonSessions = loadSessions();
      expect(anonSessions).toEqual([]);
    });

    it('should return empty array if no anonymous sessions exist', () => {
      const migrated = migrateAnonymousSessions('user123');
      expect(migrated).toEqual([]);
    });
  });

  describe('clearUserChatData', () => {
    it('should clear all user-specific localStorage keys', () => {
      // Create multiple user-specific keys
      localStorage.setItem('kull_chat_sessions_user_123', '[]');
      localStorage.setItem('kull_current_session_id_user_123', 'session1');
      localStorage.setItem('kull_chat_open_user_123', 'true');
      localStorage.setItem('kull_other_data_user_456', 'data'); // Different user

      // Clear user 123's data
      clearUserChatData('123');

      // Verify user 123's data is cleared
      expect(localStorage.getItem('kull_chat_sessions_user_123')).toBeNull();
      expect(localStorage.getItem('kull_current_session_id_user_123')).toBeNull();
      expect(localStorage.getItem('kull_chat_open_user_123')).toBeNull();

      // Verify other user's data is NOT cleared
      expect(localStorage.getItem('kull_other_data_user_456')).toBe('data');
    });

    it('should not clear anonymous data when clearing user data', () => {
      localStorage.setItem('kull_chat_sessions_anon', '[]');
      localStorage.setItem('kull_chat_sessions_user_123', '[]');

      clearUserChatData('123');

      expect(localStorage.getItem('kull_chat_sessions_anon')).toBe('[]');
      expect(localStorage.getItem('kull_chat_sessions_user_123')).toBeNull();
    });
  });

  describe('migrateLegacyStorage', () => {
    it('should migrate old localStorage keys to user-specific keys', () => {
      // Set legacy keys
      localStorage.setItem('kull-chat-sessions', JSON.stringify([{ id: 'legacy' }]));
      localStorage.setItem('kull-current-session-id', 'legacy-session');
      localStorage.setItem('kull-chat-open', 'true');

      // Migrate to user-specific
      migrateLegacyStorage('user123');

      // Verify new keys exist
      expect(localStorage.getItem('kull_chat_sessions_user_user123')).not.toBeNull();
      expect(localStorage.getItem('kull_current_session_id_user_user123')).not.toBeNull();
      expect(localStorage.getItem('kull_chat_open_user_user123')).not.toBeNull();

      // Verify legacy keys are removed
      expect(localStorage.getItem('kull-chat-sessions')).toBeNull();
      expect(localStorage.getItem('kull-current-session-id')).toBeNull();
      expect(localStorage.getItem('kull-chat-open')).toBeNull();
    });

    it('should not overwrite existing user-specific keys', () => {
      localStorage.setItem('kull-chat-sessions', JSON.stringify([{ id: 'legacy' }]));
      localStorage.setItem('kull_chat_sessions_user_user123', JSON.stringify([{ id: 'existing' }]));

      migrateLegacyStorage('user123');

      const data = localStorage.getItem('kull_chat_sessions_user_user123');
      expect(JSON.parse(data!)[0].id).toBe('existing'); // Should keep existing
    });
  });

  describe('Security: User Isolation', () => {
    it('should prevent User A from seeing User B chats', () => {
      const userASession: ChatSession = {
        id: 'userA-private',
        title: 'User A Private Chat',
        messages: [
          {
            id: 'msg1',
            role: 'user',
            content: 'User A secret message',
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const userBSession: ChatSession = {
        id: 'userB-private',
        title: 'User B Private Chat',
        messages: [
          {
            id: 'msg2',
            role: 'user',
            content: 'User B secret message',
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save sessions for both users
      saveSessions([userASession], 'userA');
      saveSessions([userBSession], 'userB');

      // Load User A's sessions
      const userASessions = loadSessions('userA');
      expect(userASessions).toHaveLength(1);
      expect(userASessions[0].messages[0].content).toBe('User A secret message');
      expect(userASessions[0].messages[0].content).not.toContain('User B');

      // Load User B's sessions
      const userBSessions = loadSessions('userB');
      expect(userBSessions).toHaveLength(1);
      expect(userBSessions[0].messages[0].content).toBe('User B secret message');
      expect(userBSessions[0].messages[0].content).not.toContain('User A');
    });

    it('should clear only logged-out user data on logout', () => {
      saveSessions([{ id: 'A', title: 'A', messages: [], createdAt: new Date(), updatedAt: new Date() }], 'userA');
      saveSessions([{ id: 'B', title: 'B', messages: [], createdAt: new Date(), updatedAt: new Date() }], 'userB');

      // User A logs out
      clearUserChatData('userA');

      // User A's data should be gone
      expect(loadSessions('userA')).toEqual([]);

      // User B's data should still exist
      expect(loadSessions('userB')).toHaveLength(1);
    });
  });
});
