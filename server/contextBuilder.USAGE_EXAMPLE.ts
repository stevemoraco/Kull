// Example usage of contextBuilder in routes.ts
// This shows how to integrate the context builder into both endpoints

import type { Request } from 'express';
import { buildUnifiedContext, combineContextMarkdown } from './contextBuilder';
import type { ConversationState } from './storage';

// ============================================================================
// EXAMPLE 1: Welcome Endpoint (/api/chat/welcome)
// ============================================================================

async function welcomeEndpointExample(req: Request, body: any) {
  const {
    context,
    sessionId,
    calculatorData,
    sectionHistory,
    currentTime
  } = body;

  // Build all context using unified builder
  const unifiedContext = await buildUnifiedContext(
    req,
    body,
    sessionId,
    calculatorData,
    sectionHistory,
    context.userActivity,  // All 100 events, not filtered
    null,                  // No conversation state yet (first message)
    {
      timeOnSite: context.timeOnSite,
      currentTime: currentTime,
      scrollY: context.scrollY,
      scrollDepth: context.scrollDepth
    }
  );

  // Combine into single markdown string
  const contextMarkdown = combineContextMarkdown(unifiedContext);

  // Now use contextMarkdown in your AI prompt
  const prompt = `
You are Kull AI support. Generate a personalized welcome greeting.

${contextMarkdown}

Guidelines:
- Reference the section they spent the most time reading
- Use their calculator numbers if they interacted with it
- Be conversational and playful
- Don't hard sell
  `;

  // Send to AI...
  return { prompt, context: unifiedContext };
}

// ============================================================================
// EXAMPLE 2: Chat Message Endpoint (/api/chat/message)
// ============================================================================

async function chatMessageEndpointExample(
  req: Request,
  body: any,
  conversationState: ConversationState
) {
  const {
    message,
    userActivity,
    calculatorData,
    sectionHistory,
    sessionId,
    timeOnSite,
    currentTime,
    lastAiMessageTime
  } = body;

  // Build all context using unified builder
  const unifiedContext = await buildUnifiedContext(
    req,
    body,
    sessionId,
    calculatorData,
    sectionHistory,
    userActivity,           // All events (not filtered by time)
    conversationState,      // Sales script progress
    {
      timeOnSite,
      currentTime,
      lastAiMessageTime,    // Used to show recent activity
      scrollY: body.scrollY,
      scrollDepth: body.scrollDepth
    }
  );

  // Combine into single markdown string
  const contextMarkdown = combineContextMarkdown(unifiedContext);

  // Now use contextMarkdown in your AI prompt
  const prompt = `
You are Kull AI support. Respond to the user's message.

User said: "${message}"

${contextMarkdown}

Guidelines:
- React to their MOST RECENT actions (🔥 JUST CLICKED, etc.)
- Reference their previous answers (check CONVERSATION MEMORY)
- Follow the sales script (check CONVERSATION STATE)
- Use their calculator numbers in your response
- Don't ask for info they already provided
  `;

  // Send to AI...
  return { prompt, context: unifiedContext };
}

// ============================================================================
// EXAMPLE 3: Accessing Individual Context Sections
// ============================================================================

async function individualSectionsExample(req: Request, body: any) {
  const unifiedContext = await buildUnifiedContext(
    req,
    body,
    'session-123',
    { shootsPerWeek: 4, hoursPerShoot: 2, billableRate: 100, hasManuallyAdjusted: true, hasClickedPreset: false },
    [{ id: 'calculator', title: 'ROI Calculator', totalTimeSpent: 135000 }],
    [{ type: 'click', target: '#calculator', value: 'Calculate', timestamp: new Date().toISOString() }],
    null,
    { timeOnSite: 120000, currentTime: Date.now() }
  );

  // Access individual sections if needed
  console.log('User Metadata:', unifiedContext.userMetadata);
  console.log('Calculator Data:', unifiedContext.calculatorData);
  console.log('Section Timing:', unifiedContext.sectionTiming);
  console.log('Activity History:', unifiedContext.activityHistory);
  console.log('Conversation Memory:', unifiedContext.conversationMemory);
  console.log('Conversation State:', unifiedContext.conversationState);
  console.log('Device Fingerprint:', unifiedContext.deviceFingerprint);
  console.log('Session Metrics:', unifiedContext.sessionMetrics);

  // Or combine them all
  const fullContext = combineContextMarkdown(unifiedContext);
  console.log('Full Context Length:', fullContext.length);

  return unifiedContext;
}

// ============================================================================
// EXAMPLE 4: Error Handling
// ============================================================================

async function errorHandlingExample(req: Request, body: any) {
  try {
    const unifiedContext = await buildUnifiedContext(
      req,
      body,
      'invalid-session',  // Session doesn't exist
      null,               // No calculator data
      null,               // No section history
      null,               // No activity
      null,               // No conversation state
      { timeOnSite: 0, currentTime: Date.now() }
    );

    // Empty sections return empty strings, not errors
    console.log('Calculator Data:', unifiedContext.calculatorData); // ""
    console.log('Section Timing:', unifiedContext.sectionTiming);   // ""
    console.log('Activity History:', unifiedContext.activityHistory.includes('No recent activity')); // true

    // Only non-empty sections are included
    const combined = combineContextMarkdown(unifiedContext);
    console.log('Combined has calculator:', combined.includes('Calculator Data')); // false

    return unifiedContext;
  } catch (error) {
    console.error('Error building context:', error);
    // Database errors are logged but don't crash the request
    // Empty context is returned instead
  }
}

// ============================================================================
// EXAMPLE 5: Custom Filtering/Formatting
// ============================================================================

async function customFormattingExample(req: Request, body: any) {
  const unifiedContext = await buildUnifiedContext(
    req,
    body,
    'session-123',
    { shootsPerWeek: 4, hoursPerShoot: 2, billableRate: 100, hasManuallyAdjusted: true, hasClickedPreset: false },
    null,
    null,
    null,
    { timeOnSite: 120000, currentTime: Date.now() }
  );

  // Custom combination - only include specific sections
  const customContext = [
    unifiedContext.userMetadata,
    unifiedContext.calculatorData,
    // Skip activity history for welcome message
    unifiedContext.conversationMemory,
  ].filter(Boolean).join('\n');

  console.log('Custom Context:', customContext);

  // Or add custom sections
  const extendedContext = combineContextMarkdown(unifiedContext) + `

## 🎁 Special Promotion
- Black Friday sale: 50% off annual plans
- Expires in 48 hours
`;

  return extendedContext;
}

// ============================================================================
// Export examples for reference
// ============================================================================

export {
  welcomeEndpointExample,
  chatMessageEndpointExample,
  individualSectionsExample,
  errorHandlingExample,
  customFormattingExample
};
