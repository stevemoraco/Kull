/**
 * Helper functions for tracking step history changes
 */

import type { ConversationState } from './storage';

/**
 * Track a step change in the conversation history
 */
export function trackStepChange(
  conversationState: ConversationState,
  fromStep: number,
  toStep: number,
  reason: string
): void {
  if (!conversationState.stepHistory) {
    conversationState.stepHistory = [];
  }

  conversationState.stepHistory.push({
    fromStep,
    toStep,
    reason,
    timestamp: new Date()
  });

  console.log(`[Step History] ${fromStep} → ${toStep} (${reason})`);
}

/**
 * Get a summary of step history for debugging
 */
export function getStepHistorySummary(conversationState: ConversationState): string {
  if (!conversationState.stepHistory || conversationState.stepHistory.length === 0) {
    return 'No step history';
  }

  return conversationState.stepHistory
    .map(h => `${h.fromStep}→${h.toStep} (${h.reason})`)
    .join(', ');
}
