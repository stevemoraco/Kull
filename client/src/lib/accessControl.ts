// Access control utilities for paid features

import type { User } from '@shared/schema';

/**
 * Check if user has access to paid features
 * Access granted to:
 * - Users with active subscriptions
 * - Users on active trial
 * - Users with @lander.media email (staff)
 */
export function hasPaidAccess(user: User | null | undefined): boolean {
  if (!user) return false;

  // Staff access via @lander.media email
  if (user.email?.endsWith('@lander.media')) {
    return true;
  }

  // Active subscription
  if (user.subscriptionStatus === 'active') {
    return true;
  }

  // Active trial (check expiration)
  if (user.subscriptionStatus === 'trial') {
    if (!user.trialEndsAt) return false;
    const trialEnd = new Date(user.trialEndsAt);
    const now = new Date();
    return trialEnd > now; // Trial still active
  }

  return false;
}

/**
 * Check if user is staff (@lander.media)
 */
export function isStaff(user: User | null | undefined): boolean {
  return user?.email?.endsWith('@lander.media') ?? false;
}

/**
 * Get access denial reason for display
 */
export function getAccessDenialReason(user: User | null | undefined): string {
  if (!user) {
    return 'Please sign in to access this feature';
  }

  if (user.subscriptionStatus === 'trial') {
    return 'Your trial has expired. Please upgrade to continue.';
  }

  if (user.subscriptionStatus === 'canceled' || user.subscriptionStatus === 'past_due') {
    return 'Your subscription is not active. Please renew to continue.';
  }

  return 'This feature requires an active subscription or trial.';
}
