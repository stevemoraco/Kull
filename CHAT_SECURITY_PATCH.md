# Chat localStorage Security Patch

## Overview
This patch fixes critical security vulnerability where chat data was stored in localStorage without user-specific keys, allowing User A's chats to be visible to User B on shared devices.

## Changes Required in `/client/src/components/SupportChat.tsx`

### 1. Add imports at the top (after existing imports):
```typescript
import {
  loadSessions,
  saveSessions,
  getUserStorageKey,
  getCurrentSessionId as getStoredSessionId,
  setCurrentSessionId as setStoredSessionId,
  getSessionStartTime as getStoredSessionStartTime,
  setSessionStartTime as setStoredSessionStartTime,
  getChatOpenState as getStoredChatOpenState,
  setChatOpenState as setStoredChatOpenState,
  migrateAnonymousSessions,
  migrateLegacyStorage,
} from '@/lib/chatStorage';
```

### 2. Replace the existing helper functions section (lines 283-308):
**DELETE these functions entirely:**
- `loadSessions()`
- `saveSessions()`

They are now imported from `/client/src/lib/chatStorage.ts`

### 3. Update SupportChat component state initialization:

**Find:** (around line 354-357)
```typescript
  // Persist chat open state
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem('kull-chat-open');
    return stored === 'true';
  });
```

**Replace with:**
```typescript
  const { user } = useAuth();
  const userId = user?.id;

  // Persist chat open state (user-specific)
  const [isOpen, setIsOpen] = useState(() => {
    return getStoredChatOpenState(userId);
  });
```

**Find:** (around line 360-374)
```typescript
  // Load all chat sessions
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const loadedSessions = loadSessions();
    if (loadedSessions.length === 0) {
      // Create initial persistent session with empty messages - greetings will be added via popover
      const initialSession: ChatSession = {
        id: 'main-session-persistent', // Fixed ID for persistence across page loads
        title: 'Chat with Kull',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      saveSessions([initialSession]);
      return [initialSession];
    }
    return loadedSessions;
  });
```

**Replace with:**
```typescript
  // Load all chat sessions (user-specific)
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    // Migrate legacy storage on first load (backward compatibility)
    if (userId) {
      migrateLegacyStorage(userId);
    }

    const loadedSessions = loadSessions(userId);
    if (loadedSessions.length === 0) {
      // Create initial persistent session with empty messages - greetings will be added via popover
      const initialSession: ChatSession = {
        id: 'main-session-persistent', // Fixed ID for persistence across page loads
        title: 'Chat with Kull',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      saveSessions([initialSession], userId);
      return [initialSession];
    }
    return loadedSessions;
  });
```

**Find:** (around line 377-393)
```typescript
  // Track current session ID - load from localStorage on mount
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const loadedSessions = loadSessions();
    const stored = localStorage.getItem('kull-current-session-id');

    // Validate stored session ID exists in sessions
    if (stored && loadedSessions.find(s => s.id === stored)) {
      console.log('[Chat] Resuming session:', stored);
      return stored;
    }

    // Default to first session (or main-session-persistent)
    const defaultId = loadedSessions[0]?.id || 'main-session-persistent';
    console.log('[Chat] Starting new session:', defaultId);
    localStorage.setItem('kull-current-session-id', defaultId);
    return defaultId;
  });
```

**Replace with:**
```typescript
  // Track current session ID - load from localStorage on mount (user-specific)
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const loadedSessions = loadSessions(userId);
    const stored = getStoredSessionId(userId);

    // Validate stored session ID exists in sessions
    if (stored && loadedSessions.find(s => s.id === stored)) {
      console.log('[Chat] Resuming session:', stored);
      return stored;
    }

    // Default to first session (or main-session-persistent)
    const defaultId = loadedSessions[0]?.id || 'main-session-persistent';
    console.log('[Chat] Starting new session:', defaultId);
    setStoredSessionId(defaultId, userId);
    return defaultId;
  });
```

**Find:** (around line 395-404)
```typescript
  // Track session start time for accurate session length calculation
  const [sessionStartTime, setSessionStartTime] = useState<number>(() => {
    const stored = localStorage.getItem('kull-session-start-time');
    if (stored) {
      return parseInt(stored, 10);
    }
    const now = Date.now();
    localStorage.setItem('kull-session-start-time', now.toString());
    return now;
  });
```

**Replace with:**
```typescript
  // Track session start time for accurate session length calculation (user-specific)
  const [sessionStartTime, setSessionStartTime] = useState<number>(() => {
    return getStoredSessionStartTime(userId);
  });
```

### 4. Update all saveSessions calls to include userId:

**Find:** (around line 443)
```typescript
      saveSessions(updatedSessions);
```

**Replace with:**
```typescript
      saveSessions(updatedSessions, userId);
```

**Find:** (around line 513)
```typescript
        saveSessions(mergedSessions);
```

**Replace with:**
```typescript
        saveSessions(mergedSessions, userId);
```

**Find:** (around line 753)
```typescript
    localStorage.setItem('kull-current-session-id', currentSessionId);
```

**Replace with:**
```typescript
    setStoredSessionId(currentSessionId, userId);
```

**Find:** (around line 756-758)
```typescript
    const now = Date.now();
    setSessionStartTime(now);
    localStorage.setItem('kull-session-start-time', now.toString());
```

**Replace with:**
```typescript
    const now = Date.now();
    setSessionStartTime(now);
    setStoredSessionStartTime(now, userId);
```

**Find:** (around line 762-764)
```typescript
  useEffect(() => {
    localStorage.setItem('kull-chat-open', isOpen.toString());
  }, [isOpen]);
```

**Replace with:**
```typescript
  useEffect(() => {
    setStoredChatOpenState(isOpen, userId);
  }, [isOpen, userId]);
```

**Find:** (around line 1813)
```typescript
    setSessions(prev => {
      const updated = [newSession, ...prev];
      saveSessions(updated);
      return updated;
    });
```

**Replace with:**
```typescript
    setSessions(prev => {
      const updated = [newSession, ...prev];
      saveSessions(updated, userId);
      return updated;
    });
```

**Find:** (around line 1859)
```typescript
    setSessions(prevSessions => {
      // Add new session to the list
      const updated = [...prevSessions, newSession];
      saveSessions(updated);
      return updated;
    });
```

**Replace with:**
```typescript
    setSessions(prevSessions => {
      // Add new session to the list
      const updated = [...prevSessions, newSession];
      saveSessions(updated, userId);
      return updated;
    });
```

### 5. Add login migration effect (after line 529):

**Add this new useEffect:**
```typescript
  // Migrate anonymous sessions when user logs in
  useEffect(() => {
    if (userId) {
      const migratedSessions = migrateAnonymousSessions(userId);
      if (migratedSessions.length > 0) {
        // Merge with existing user sessions
        setSessions(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const newSessions = migratedSessions.filter(s => !existingIds.has(s.id));
          const merged = [...prev, ...newSessions];
          saveSessions(merged, userId);
          return merged;
        });
        console.log('[Chat] Migrated anonymous sessions on login');
      }
    }
  }, [userId]); // Run when userId changes (login/logout)
```

### 6. Remove the useAuth import from line 454 (it's now at the top):

**Find and DELETE:**
```typescript
  const { user } = useAuth();
```
(This should be moved to the top of the component, right after the userId declaration)

## Files Changed
1. `/client/src/lib/chatStorage.ts` - NEW FILE (secure storage utilities)
2. `/client/src/hooks/useLogout.ts` - NEW FILE (logout with cleanup)
3. `/client/src/components/SupportChat.tsx` - MODIFIED (use secure storage)
4. `/client/src/pages/Home.tsx` - MODIFIED (use new logout hook)

## Security Improvements

### Before
- All chat data stored in global localStorage keys:
  - `kull-chat-sessions` - accessible to ALL users
  - `kull-current-session-id` - shared across users
  - `kull-session-start-time` - shared across users
  - `kull-chat-open` - shared across users

### After
- User-specific storage keys:
  - `kull_chat_sessions_user_123` - isolated per user
  - `kull_chat_sessions_anon` - for anonymous users
  - Logout properly clears user data
  - Login migrates anonymous chats to user account
  - Legacy storage automatically migrated

## Testing Checklist
- [ ] User A's chats are NOT visible to User B
- [ ] Anonymous chats migrate to user account on login
- [ ] Logout clears all user-specific chat data
- [ ] Chat state persists across page refreshes for same user
- [ ] Multiple browser tabs sync chat state for same user
- [ ] Different users on same device have isolated chat data

## Migration Strategy
1. New users: Start with user-specific keys immediately
2. Existing logged-in users: Legacy keys migrated on first chat load
3. Anonymous users: Use `_anon` suffix until login
4. On login: Anonymous data migrated to user-specific keys
5. On logout: User-specific data cleared completely
