/**
 * Logout hook with proper cleanup
 * Clears user-specific chat data before redirecting to logout endpoint
 */

import { clearUserChatData } from '@/lib/chatStorage';
import { useAuth } from './useAuth';

export function useLogout() {
  const { user } = useAuth();

  const logout = () => {
    // Clear user-specific chat data before logging out
    if (user?.id) {
      console.log('[Logout] Clearing chat data for user:', user.id);
      clearUserChatData(user.id);
    }

    // Redirect to logout endpoint
    window.location.href = '/api/logout';
  };

  return { logout };
}
