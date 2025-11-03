// Simple chat service for answering Kull AI support questions
// This can be enhanced with OpenAI or other LLMs, and GitHub docs integration

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Knowledge base about Kull AI
const KULL_AI_KNOWLEDGE = `
# Kull AI Documentation

## Overview
Kull AI is a powerful Lightroom plugin that uses 5 advanced AI models you can choose from (Gemini, Grok, Kimi k2, Claude, GPT-5) to automatically rate your photos from 1-5 stars in real-time using low-cost batch APIs when possible.

## Installation

### macOS Installation
1. Download the DMG file from your account dashboard
2. Double-click the DMG to mount it
3. Drag Kull AI.app to your Applications folder
4. Open System Preferences > Security & Privacy if prompted
5. Click "Open Anyway" to allow Kull AI
6. Launch Kull AI from Applications

### Lightroom Plugin Setup
1. Open Adobe Lightroom Classic
2. Go to File > Plug-in Manager
3. Click "Add" and navigate to the Kull AI plugin folder
4. Enable the plugin
5. Restart Lightroom
6. You should see the Kull AI panel in the Library module

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
- Unlimited photo ratings
- All 5 AI models
- Lightroom integration
- Email support
- DMG download for macOS

### Studio Plan ($499/mo)
- Everything in Professional
- Priority AI processing
- Batch processing up to 10,000 photos
- Team collaboration features
- Priority support
- Advanced export options

## Trial Information
- 24-hour free trial
- Full access to all features
- No charge until trial ends
- Cancel anytime with zero charge
- Card pre-authorization for annual amount
- Option to downgrade to monthly if needed

## Subscription Management
- Billed annually by default (save $396-$2,004/year)
- Monthly billing available
- Cancel anytime from account settings
- Pro-rated refunds within 30 days

## Common Issues

### Installation Problems
- **"App can't be opened"**: Go to System Preferences > Security & Privacy and click "Open Anyway"
- **"Damaged app"**: Download a fresh copy from your dashboard
- **Plugin not showing**: Restart Lightroom after installation

### Lightroom Integration
- **Plugin not loading**: Check Plug-in Manager, ensure it's enabled
- **Ratings not syncing**: Restart Lightroom or check internet connection
- **Slow performance**: Try using Grok model for faster processing

### Account & Billing
- **Trial ending**: You'll receive emails at 6 hours and 1 hour before trial ends
- **Cancellation**: Go to Account Settings > Subscription > Cancel
- **Billing issues**: Email support@kullai.com or use this chat

## System Requirements
- macOS 10.15 (Catalina) or later
- Adobe Lightroom Classic 9.0 or later
- Internet connection for AI processing
- 4GB RAM minimum, 8GB recommended

## Support
- Chat support: Available 24/7 (this chat!)
- Email: support@kullai.com
- Response time: Usually within 1 hour
- Phone support: Available for Studio plan customers

## Best Practices
1. Start with a small batch to test the AI model
2. Use different models for different photography styles
3. Review AI ratings - they're suggestions, not rules
4. Export rated photos to new collection for easier workflow
5. Use keyboard shortcuts in Lightroom for efficiency

## Contact
Lander Media
31 N Tejon St
Colorado Springs, CO 80903
support@kullai.com
`;

export async function getChatResponse(
  userMessage: string,
  history: ChatMessage[]
): Promise<string> {
  // For now, use a simple pattern matching system
  // This can be upgraded to use OpenAI API or other LLMs
  
  const lowerMessage = userMessage.toLowerCase();

  // Installation questions
  if (lowerMessage.includes('install') || lowerMessage.includes('setup') || lowerMessage.includes('download')) {
    if (lowerMessage.includes('lightroom') || lowerMessage.includes('plugin')) {
      return `To install the Lightroom plugin:

1. Download the DMG from your dashboard
2. Drag Kull AI to Applications
3. In Lightroom Classic, go to File > Plug-in Manager
4. Click "Add" and select the Kull AI plugin
5. Enable it and restart Lightroom

If you see "App can't be opened", go to System Preferences > Security & Privacy and click "Open Anyway".

Need more help? I can walk you through any specific step!`;
    }
    return `Installation is easy!

1. Download the DMG file from your account dashboard
2. Double-click to mount it
3. Drag Kull AI.app to Applications
4. If macOS blocks it, go to System Preferences > Security & Privacy and click "Open Anyway"

For the Lightroom plugin setup, ask me "How do I install the Lightroom plugin?"`;
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

**Recommendation**: Start with Gemini for most photos. Try different models to see which matches your style!

Want to know more about a specific model?`;
  }

  // Rating questions
  if (lowerMessage.includes('rating') || lowerMessage.includes('star') || lowerMessage.includes('rate')) {
    return `Our AI rates photos 1-5 stars based on:

⭐ Composition & framing
⭐ Lighting quality
⭐ Focus & sharpness
⭐ Color balance
⭐ Artistic merit
⭐ Technical quality

The ratings are suggestions to speed up your culling workflow. You can always adjust them manually in Lightroom!

Pro tip: Different AI models may rate the same photo differently - try multiple to find your preference.`;
  }

  // Trial/billing questions
  if (lowerMessage.includes('trial') || lowerMessage.includes('cancel') || lowerMessage.includes('billing') || 
      lowerMessage.includes('charge') || lowerMessage.includes('subscription')) {
    if (lowerMessage.includes('cancel')) {
      return `To cancel your trial or subscription:

1. Go to your Account Settings
2. Click "Subscription"
3. Click "Cancel Subscription"
4. Confirm cancellation

✅ During trial (before 24 hours): Zero charge
✅ After trial starts: Cancel anytime, no refund for current period
✅ We'll send you emails at 6 hours and 1 hour before your trial ends

No tricks, no hassle - just click and you're done!`;
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

  // Plan/pricing questions
  if (lowerMessage.includes('plan') || lowerMessage.includes('price') || lowerMessage.includes('cost') || 
      lowerMessage.includes('professional') || lowerMessage.includes('studio')) {
    return `We offer two plans:

📸 **Professional - $99/mo** ($1,188/year)
- Unlimited photo ratings
- All 5 AI models
- Lightroom integration
- Email support
- Save $396 vs monthly

🎬 **Studio - $499/mo** ($5,988/year)
- Everything in Professional
- Priority AI processing
- Batch up to 10,000 photos
- Team collaboration
- Priority support
- Save $2,004 vs monthly

Both include a 24-hour free trial! Which features are most important to you?`;
  }

  // Technical issues
  if (lowerMessage.includes('not working') || lowerMessage.includes('error') || lowerMessage.includes('problem') || 
      lowerMessage.includes('issue') || lowerMessage.includes('broken')) {
    return `I'm here to help! Let's troubleshoot:

**Common fixes:**
1. Restart Lightroom
2. Check internet connection
3. Re-enable plugin in Lightroom's Plug-in Manager
4. Try downloading fresh DMG from dashboard

**What's happening specifically?**
- Plugin not showing in Lightroom?
- Ratings not syncing?
- App won't open?
- Something else?

Tell me more and I'll help you fix it!`;
  }

  // General help
  if (lowerMessage.includes('help') || lowerMessage.includes('how') || lowerMessage.includes('what')) {
    return `I can help you with:

💿 **Installation** - macOS app and Lightroom plugin setup
🤖 **AI Models** - Which model to use for your photos
⭐ **Ratings** - How the 1-5 star system works
💳 **Billing** - Trial, subscription, and cancellation
🔧 **Troubleshooting** - Fixing any issues you encounter
📊 **Plans** - Comparing Professional vs Studio

What would you like to know about?`;
  }

  // Default response
  return `Thanks for your question! I'm here to help with Kull AI.

I can assist you with:
- Installing the app and Lightroom plugin
- Understanding AI models and ratings
- Managing your subscription or trial
- Troubleshooting any issues

Could you tell me more about what you'd like help with? Or ask me one of these:
- "How do I install Kull AI?"
- "Which AI model should I use?"
- "How do I cancel my trial?"
- "What's the difference between Professional and Studio plans?"`;
}
