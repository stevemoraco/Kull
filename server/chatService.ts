// Chat service powered by OpenAI with GitHub repository integration
// Uses GPT-4o-mini for cost-effective, high-quality responses

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Knowledge base about Kull AI
const KULL_AI_KNOWLEDGE = `
# Kull AI Documentation

## Overview
Kull AI is a universal Mac/iPhone/iPad app that uses 5 advanced AI models you can choose from (Gemini, Grok, Kimi k2, Claude, GPT-5) to automatically rate, organize, title, describe, tag, and color-code photos from any folder on your Mac with 1-5 stars in real-time using low-cost batch APIs when possible.

## Installation

### macOS Installation
1. Download the DMG file from your account dashboard
2. Double-click the DMG to mount it
3. Drag Kull AI.app to your Applications folder
4. Open System Preferences > Security & Privacy if prompted
5. Click "Open Anyway" to allow Kull AI
6. Launch Kull AI from Applications

### Getting Started
1. Open Kull AI app on your Mac
2. Point it to any photo folder on your Mac
3. The AI instantly rates, organizes, titles, describes, tags, and color-codes your images
4. Continue organizing on your iPhone or iPad with automatic sync across all devices

## Features

### AI Models
- **Gemini**: Google's powerful vision model, great for general photography
- **GPT-5**: OpenAI's latest model, excellent for detailed analysis
- **Claude**: Anthropic's model, good for artistic photos
- **Grok**: xAI's fast model, efficient for large batches
- **Kimi k2**: Via Groq, ultra-fast inference for real-time rating

### Rating System
- Photos are rated 1-5 stars based on:
  - Composition
  - Lighting
  - Focus and sharpness
  - Color balance
  - Artistic merit
  - Technical quality

### Professional Plan ($99/mo)
- Unlimited photo ratings and organization
- All 5 AI models
- Universal Mac app (works with any folder)
- iPhone & iPad companion apps
- Auto-sync across all devices
- Chat support 24/7

### Studio Plan ($499/mo)
- Everything in Professional
- Priority AI processing
- Batch processing up to 10,000 photos
- Team collaboration features (up to 5 users)
- Priority support
- API access for automation

## Trial Information
- 24-hour free trial
- Full access to all features
- No charge until trial ends
- Cancel anytime with zero charge
- Card pre-authorization for annual amount
- Option to downgrade to monthly if needed
- Email reminders at 6 hours and 1 hour before trial ends

## Subscription Management
- Billed annually by default (save $396-$2,004/year)
- Monthly billing available
- Cancel anytime from account settings
- Self-service refund within 7 days of payment

## Common Issues

### Installation Problems
- **"App can't be opened"**: Go to System Preferences > Security & Privacy and click "Open Anyway"
- **"Damaged app"**: Download a fresh copy from your dashboard
- **App not showing photos**: Make sure you've pointed it to the correct folder containing your photos

### Syncing Issues
- **Ratings not syncing across devices**: Check internet connection and ensure you're signed in on all devices
- **Slow performance**: Try using Grok model for faster processing
- **Photos not appearing**: Verify the folder permissions and refresh the app

### Account & Billing
- **Trial ending**: You'll receive emails at 6 hours and 1 hour before trial ends
- **Cancellation**: Go to Account Settings > Subscription > Cancel, or use self-service refund within 7 days
- **Billing issues**: Use this chat for instant help, or DM founder on Twitter after 5 minutes

## System Requirements
- macOS 10.15 (Catalina) or later for Mac app
- iOS 15.0 or later for iPhone & iPad apps
- Internet connection for AI processing
- 4GB RAM minimum, 8GB recommended

## Support
- Chat support: Available 24/7 (this chat powered by advanced AI!)
- Twitter DM: Founder Steve Moraco (@stevemoraco) responds within 24 hours
- Response time: Instant via chat, usually within 1 hour via Twitter DM
- Self-service refund: Available within 7 days of payment on /refund page

## Best Practices
1. Start with a small folder to test the AI model
2. Use different models for different photography styles
3. Review AI ratings - they're suggestions, not rules
4. Organize photos across Mac, iPhone, and iPad seamlessly
5. Take advantage of automatic titles, descriptions, and tags

## Contact
Lander Media
31 N Tejon St
Colorado Springs, CO 80903
Founded 2014
Chat support available 24/7
Founder: @stevemoraco on Twitter

## GitHub Repository
Technical documentation and code: https://github.com/stevemoraco/kull
`;

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are a helpful customer support AI assistant for Kull AI, a universal Mac/iPhone/iPad app that uses 5 advanced AI models to rate, organize, title, describe, tag, and color-code photos from any folder.

Your role:
- Help users with installation, features, billing, and troubleshooting
- Be friendly, concise, and professional
- Use the knowledge base provided to answer questions accurately
- If asked about technical implementation, reference the GitHub repository at https://github.com/stevemoraco/kull
- For complex issues beyond your knowledge, suggest contacting founder Steve Moraco on Twitter (@stevemoraco)
- Encourage self-service refunds within 7 days via the /refund page
- Never provide email addresses - direct users to chat or Twitter DM only

Knowledge Base:
${KULL_AI_KNOWLEDGE}

Keep responses concise (2-4 paragraphs max) and friendly. Use emojis sparingly for clarity.`;

export async function getChatResponse(
  userMessage: string,
  history: ChatMessage[]
): Promise<string> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    console.log('[Chat] OpenAI API key not configured, falling back to pattern matching');
    return getFallbackResponse(userMessage);
  }

  try {
    // Build messages array with system prompt
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      ...history.slice(-10), // Keep last 10 messages for context
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: false, // We'll implement streaming in the next iteration
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Chat] OpenAI API error:', errorText);
      return getFallbackResponse(userMessage);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || getFallbackResponse(userMessage);
    
    console.log('[Chat] OpenAI response generated successfully');
    return assistantMessage;
  } catch (error) {
    console.error('[Chat] Error calling OpenAI:', error);
    return getFallbackResponse(userMessage);
  }
}

// Fallback pattern matching for when OpenAI is unavailable
function getFallbackResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  // Installation questions
  if (lowerMessage.includes('install') || lowerMessage.includes('setup') || lowerMessage.includes('download')) {
    return `Installation is easy!

1. Download the DMG file from your account dashboard
2. Double-click to mount it
3. Drag Kull AI.app to Applications
4. If macOS blocks it, go to System Preferences > Security & Privacy and click "Open Anyway"
5. Launch Kull AI and point it to any photo folder on your Mac
6. The AI instantly rates, organizes, titles, describes, tags, and color-codes your images

Also download the iPhone & iPad apps to continue organizing on the go with automatic sync!`;
  }

  // AI model questions
  if (lowerMessage.includes('model') || lowerMessage.includes('gemini') || lowerMessage.includes('gpt') || 
      lowerMessage.includes('claude') || lowerMessage.includes('grok') || lowerMessage.includes('kimi')) {
    return `We support 5 advanced AI models you can choose from:

🔮 **Gemini** (Google): Best for general photography, balanced ratings
🧠 **GPT-5** (OpenAI): Detailed analysis, great for artistic shots
🎨 **Claude** (Anthropic): Excellent for artistic merit and composition
⚡ **Grok** (xAI): Fast processing, perfect for large batches
🚀 **Kimi k2** (via Groq): Ultra-fast inference for real-time rating

All models use **low-cost batch APIs** when possible and rate photos based on **context in the photoshoot** for maximum accuracy!

**Recommendation**: Start with Gemini for most photos. Try different models to see which matches your style!`;
  }

  // Trial/billing questions
  if (lowerMessage.includes('trial') || lowerMessage.includes('cancel') || lowerMessage.includes('billing') || 
      lowerMessage.includes('charge') || lowerMessage.includes('subscription') || lowerMessage.includes('refund')) {
    if (lowerMessage.includes('cancel') || lowerMessage.includes('refund')) {
      return `To cancel your trial or request a refund:

**During Trial (before 24 hours):**
- Cancel anytime with zero charge
- Go to Account Settings > Subscription > Cancel

**After Trial (within 7 days of payment):**
- Use self-service refund button at /refund page
- Instant processing, money back in 5-7 business days
- No questions asked!

We'll send you reminder emails at 6 hours and 1 hour before your trial ends.`;
    }
    return `Your 24-hour free trial includes:

✅ Full access to all 5 AI models
✅ Unlimited photo ratings
✅ All Professional or Studio features
✅ No charge until trial ends
✅ Cancel anytime with zero charge

We place a pre-authorization hold on your card to verify it can handle the annual subscription amount. You won't be charged until the trial period ends.

You'll receive reminder emails at 6 hours and 1 hour before your trial ends!`;
  }

  // Default response
  return `Thanks for your question! I'm here to help with Kull AI.

I can assist you with:
- Installing the Mac/iPhone/iPad app
- Understanding AI models and ratings
- Managing your subscription or trial
- Troubleshooting any issues

What would you like to know about? Or ask me:
- "How do I install Kull AI?"
- "Which AI model should I use?"
- "How do I cancel my trial?"
- "How do I request a refund?"`;
}

// Export streaming version for future use
export async function getChatResponseStream(
  userMessage: string,
  history: ChatMessage[]
): Promise<ReadableStream> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    // Return fallback as stream
    const fallbackMessage = getFallbackResponse(userMessage);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(fallbackMessage));
        controller.close();
      },
    });
  }

  // Build messages array with system prompt
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    ...history.slice(-10),
    {
      role: 'user',
      content: userMessage,
    },
  ];

  // Call OpenAI API with streaming
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const fallbackMessage = getFallbackResponse(userMessage);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(fallbackMessage));
        controller.close();
      },
    });
  }

  return response.body;
}
