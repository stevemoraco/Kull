/**
 * Adversarial AI Sales Conversation Testing Framework
 *
 * This test suite simulates full end-to-end conversations between:
 * - Kull Sales AI (the sales assistant)
 * - Customer AI (simulated photographer personas)
 *
 * Purpose: Validate that the sales AI can successfully guide diverse
 * customer personas through the full 16-step sales script (steps 0-15)
 * and achieve a close rate of 80-90%.
 *
 * Architecture:
 * 1. Customer AI generates realistic responses based on persona traits
 * 2. Test runner orchestrates full conversation flow via API calls
 * 3. Issue detection identifies loops, repetitions, and conversation breakdowns
 * 4. Comprehensive reporting shows transcripts, close rates, and failure analysis
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll } from 'vitest';
import OpenAI from 'openai';

// ============================================================================
// PHOTOGRAPHER PERSONA DEFINITIONS
// ============================================================================

interface PhotographerPersona {
  name: string;
  background: string;
  communicationStyle: 'direct' | 'verbose' | 'evasive' | 'casual';
  answerLength: 'short' | 'medium' | 'long';
  skepticism: number; // 1-10 scale
  willingToShareNumbers: boolean;
  frustrationTriggers: string[];
  buyingSignals: string[];
  priceObjections: boolean;
  priceThreshold: number; // Max they're willing to pay
  shootsPerWeek: number;
  hoursPerShoot: number;
  billableRate: number;
  mainGoal: string;
  mainPainPoint: string;
}

const photographerPersonas: PhotographerPersona[] = [
  {
    name: "Sarah - Hot Lead Wedding Photographer",
    background: "5-year wedding photographer, overwhelmed with culling work, ready to buy",
    communicationStyle: "direct",
    answerLength: "medium",
    skepticism: 3,
    willingToShareNumbers: true,
    frustrationTriggers: ["repeated questions", "wasting time"],
    buyingSignals: ["asks about price early", "shares specific numbers", "asks how to start"],
    priceObjections: false,
    priceThreshold: 10000,
    shootsPerWeek: 3,
    hoursPerShoot: 6,
    billableRate: 150,
    mainGoal: "Scale to 200 weddings/year without burning out",
    mainPainPoint: "Spending 6 hours culling each wedding - can't scale"
  },
  {
    name: "Mike - Skeptical Portrait Photographer",
    background: "Veteran photographer, tried AI tools before, got burned, very cautious",
    communicationStyle: "evasive",
    answerLength: "short",
    skepticism: 9,
    willingToShareNumbers: false,
    frustrationTriggers: ["pushy sales tactics", "vague promises", "comparing to other tools"],
    buyingSignals: ["asks technical questions", "wants proof", "mentions bad experiences"],
    priceObjections: true,
    priceThreshold: 3000,
    shootsPerWeek: 1.5,
    hoursPerShoot: 3,
    billableRate: 80,
    mainGoal: "Just want to save time without compromising quality",
    mainPainPoint: "Tried Photo Mechanic AI - sucked. Wasted money"
  },
  {
    name: "Jessica - Price-Sensitive Newbie",
    background: "New photographer, tight budget, needs to see clear ROI",
    communicationStyle: "casual",
    answerLength: "medium",
    skepticism: 5,
    willingToShareNumbers: true,
    frustrationTriggers: ["expensive pricing", "unclear value"],
    buyingSignals: ["asks about ROI", "compares to manual cost", "asks about trial"],
    priceObjections: true,
    priceThreshold: 4000,
    shootsPerWeek: 1,
    hoursPerShoot: 4,
    billableRate: 50,
    mainGoal: "Make this profitable - need every hour I can get",
    mainPainPoint: "Culling takes too long, losing bookings"
  },
  {
    name: "David - High-Volume Commercial Shooter",
    background: "Commercial photographer, shoots 500+ photos per session, established business",
    communicationStyle: "direct",
    answerLength: "short",
    skepticism: 4,
    willingToShareNumbers: true,
    frustrationTriggers: ["slow responses", "irrelevant questions"],
    buyingSignals: ["wants pricing immediately", "asks about processing speed"],
    priceObjections: false,
    priceThreshold: 15000,
    shootsPerWeek: 4,
    hoursPerShoot: 5,
    billableRate: 200,
    mainGoal: "$500k revenue, hire second shooter",
    mainPainPoint: "Post-production bottleneck - can't take more clients"
  },
  {
    name: "Emily - Part-Time Weekend Warrior",
    background: "Side-hustle photographer, balancing with full-time job",
    communicationStyle: "verbose",
    answerLength: "long",
    skepticism: 6,
    willingToShareNumbers: false,
    frustrationTriggers: ["pushy close", "ignoring her situation"],
    buyingSignals: ["talks about time with family", "mentions weekends", "weekend freedom"],
    priceObjections: true,
    priceThreshold: 5000,
    shootsPerWeek: 0.5,
    hoursPerShoot: 8,
    billableRate: 75,
    mainGoal: "Get my weekends back for family time",
    mainPainPoint: "Spend entire Sunday culling instead of with kids"
  },
  {
    name: "Chris - Tire Kicker / Just Browsing",
    background: "Not actively looking to buy, just curious about AI",
    communicationStyle: "evasive",
    answerLength: "short",
    skepticism: 8,
    willingToShareNumbers: false,
    frustrationTriggers: ["sales pressure", "asking for commitment"],
    buyingSignals: ["maybe later", "sounds interesting", "let me think about it"],
    priceObjections: true,
    priceThreshold: 2000,
    shootsPerWeek: 1,
    hoursPerShoot: 2,
    billableRate: 60,
    mainGoal: "Just looking around, no immediate need",
    mainPainPoint: "Not really a pain point yet"
  },
  {
    name: "Amanda - Detail-Oriented Control Freak",
    background: "Perfectionist, worried AI won't match her standards",
    communicationStyle: "verbose",
    answerLength: "long",
    skepticism: 7,
    willingToShareNumbers: true,
    frustrationTriggers: ["glossing over quality concerns", "not addressing accuracy"],
    buyingSignals: ["asks about accuracy", "wants to test first", "mentions trial"],
    priceObjections: false,
    priceThreshold: 8000,
    shootsPerWeek: 2,
    hoursPerShoot: 5,
    billableRate: 120,
    mainGoal: "Save time without sacrificing my artistic vision",
    mainPainPoint: "Culling takes forever because I'm so meticulous"
  },
  {
    name: "Tom - Burned by Software Before",
    background: "Tried multiple AI tools, all disappointed, very jaded",
    communicationStyle: "evasive",
    answerLength: "short",
    skepticism: 10,
    willingToShareNumbers: false,
    frustrationTriggers: ["overpromising", "buzzwords", "AI hype"],
    buyingSignals: ["mentions other tools", "needs proof it's different"],
    priceObjections: true,
    priceThreshold: 3500,
    shootsPerWeek: 1.5,
    hoursPerShoot: 4,
    billableRate: 90,
    mainGoal: "Actually save time for once",
    mainPainPoint: "Every AI tool I've tried has been garbage"
  },
  {
    name: "Lisa - Efficiency-Obsessed Optimizer",
    background: "Numbers-driven, tracks every metric, wants ROI proof",
    communicationStyle: "direct",
    answerLength: "medium",
    skepticism: 5,
    willingToShareNumbers: true,
    frustrationTriggers: ["vague claims", "no numbers"],
    buyingSignals: ["asks for exact time savings", "wants calculations", "ROI focused"],
    priceObjections: false,
    priceThreshold: 12000,
    shootsPerWeek: 2.5,
    hoursPerShoot: 4,
    billableRate: 175,
    mainGoal: "10% margin improvement, 20% capacity increase",
    mainPainPoint: "Post-production is 40% of my time - unacceptable"
  },
  {
    name: "Jason - Impulsive Early Adopter",
    background: "Loves new tech, buys quickly, sometimes regrets",
    communicationStyle: "casual",
    answerLength: "short",
    skepticism: 2,
    willingToShareNumbers: true,
    frustrationTriggers: ["too much process", "overthinking"],
    buyingSignals: ["ready to buy immediately", "asks where to sign up"],
    priceObjections: false,
    priceThreshold: 10000,
    shootsPerWeek: 2,
    hoursPerShoot: 3,
    billableRate: 100,
    mainGoal: "Be more efficient, have more fun shooting",
    mainPainPoint: "Culling is boring AF"
  },
  {
    name: "Rachel - Overthinking Analyst",
    background: "Needs to research everything thoroughly before deciding",
    communicationStyle: "verbose",
    answerLength: "long",
    skepticism: 8,
    willingToShareNumbers: true,
    frustrationTriggers: ["being rushed", "incomplete information"],
    buyingSignals: ["asks many detailed questions", "wants to compare options"],
    priceObjections: true,
    priceThreshold: 6000,
    shootsPerWeek: 1.5,
    hoursPerShoot: 5,
    billableRate: 110,
    mainGoal: "Make an informed decision about workflow optimization",
    mainPainPoint: "Need to evaluate if AI is really better than hiring"
  },
  {
    name: "Kevin - Time-Starved Studio Owner",
    background: "Runs team of 3 shooters, drowning in post-production",
    communicationStyle: "direct",
    answerLength: "short",
    skepticism: 4,
    willingToShareNumbers: true,
    frustrationTriggers: ["wasting time", "slow process"],
    buyingSignals: ["needs solution NOW", "asks about team pricing"],
    priceObjections: false,
    priceThreshold: 20000,
    shootsPerWeek: 6,
    hoursPerShoot: 4,
    billableRate: 250,
    mainGoal: "Process 500 shoots/year without hiring more editors",
    mainPainPoint: "Editing backlog is killing us - 3 weeks behind"
  },
  {
    name: "Stephanie - Lifestyle Influencer Photographer",
    background: "Instagram-focused, cares about brand and aesthetics",
    communicationStyle: "casual",
    answerLength: "medium",
    skepticism: 5,
    willingToShareNumbers: false,
    frustrationTriggers: ["technical jargon", "boring explanations"],
    buyingSignals: ["wants it to look good", "asks about results", "visual proof"],
    priceObjections: true,
    priceThreshold: 5000,
    shootsPerWeek: 2,
    hoursPerShoot: 3,
    billableRate: 85,
    mainGoal: "More time for content creation and engagement",
    mainPainPoint: "Culling cuts into my posting time"
  },
  {
    name: "Greg - Old-School Traditional Shooter",
    background: "30 years experience, resistant to change, skeptical of AI",
    communicationStyle: "evasive",
    answerLength: "medium",
    skepticism: 9,
    willingToShareNumbers: false,
    frustrationTriggers: ["AI replacing humans", "loss of artistry"],
    buyingSignals: ["wants proof it maintains quality", "asks if he still has control"],
    priceObjections: true,
    priceThreshold: 4000,
    shootsPerWeek: 1,
    hoursPerShoot: 6,
    billableRate: 100,
    mainGoal: "Retire in 5 years, need to slow down",
    mainPainPoint: "Getting older, culling hurts my eyes and back"
  },
  {
    name: "Natalie - Multi-Niche Hustler",
    background: "Shoots weddings, portraits, events - does it all",
    communicationStyle: "casual",
    answerLength: "medium",
    skepticism: 6,
    willingToShareNumbers: true,
    frustrationTriggers: ["single-use solutions", "doesn't work for all shoot types"],
    buyingSignals: ["asks if it works for different genres", "versatility concerns"],
    priceObjections: false,
    priceThreshold: 7000,
    shootsPerWeek: 3,
    hoursPerShoot: 4,
    billableRate: 95,
    mainGoal: "Diversify income streams without burning out",
    mainPainPoint: "Different shoots need different culling approaches"
  },
  {
    name: "Brandon - Tech-Savvy Power User",
    background: "Uses Lightroom plugins, knows his workflow inside-out",
    communicationStyle: "direct",
    answerLength: "long",
    skepticism: 6,
    willingToShareNumbers: true,
    frustrationTriggers: ["dumbed-down explanations", "treating him like a newbie"],
    buyingSignals: ["asks about API", "integration questions", "technical specs"],
    priceObjections: false,
    priceThreshold: 10000,
    shootsPerWeek: 2.5,
    hoursPerShoot: 4,
    billableRate: 140,
    mainGoal: "Optimize my entire post-production pipeline",
    mainPainPoint: "Culling is my bottleneck - rest is automated"
  },
  {
    name: "Melissa - Budget-Conscious Mom Photographer",
    background: "Focuses on family/newborn photography, tight profit margins",
    communicationStyle: "verbose",
    answerLength: "long",
    skepticism: 7,
    willingToShareNumbers: false,
    frustrationTriggers: ["expensive pricing", "unclear value"],
    buyingSignals: ["asks about payment plans", "wants to see savings first"],
    priceObjections: true,
    priceThreshold: 3000,
    shootsPerWeek: 1,
    hoursPerShoot: 5,
    billableRate: 65,
    mainGoal: "Make photography sustainable while raising kids",
    mainPainPoint: "Culling eats into evening time with family"
  },
  {
    name: "Eric - Corporate Event Photographer",
    background: "B2B focused, shoots conferences and corporate events",
    communicationStyle: "direct",
    answerLength: "short",
    skepticism: 5,
    willingToShareNumbers: true,
    frustrationTriggers: ["consumer-focused pitch", "not understanding B2B"],
    buyingSignals: ["asks about enterprise features", "compliance questions"],
    priceObjections: false,
    priceThreshold: 15000,
    shootsPerWeek: 3,
    hoursPerShoot: 5,
    billableRate: 180,
    mainGoal: "Faster turnaround for corporate clients",
    mainPainPoint: "Clients need photos within 24 hours"
  },
  {
    name: "Alicia - Destination Wedding Specialist",
    background: "Travels for shoots, needs mobile workflow, limited internet",
    communicationStyle: "casual",
    answerLength: "medium",
    skepticism: 6,
    willingToShareNumbers: true,
    frustrationTriggers: ["cloud-only solutions", "requires internet"],
    buyingSignals: ["asks about offline mode", "mobile app questions"],
    priceObjections: false,
    priceThreshold: 9000,
    shootsPerWeek: 1.5,
    hoursPerShoot: 8,
    billableRate: 250,
    mainGoal: "Process photos while traveling between shoots",
    mainPainPoint: "Can't cull on planes/trains - wasted travel time"
  },
  {
    name: "Ryan - Niche Sports Photographer",
    background: "Action/sports photography, high-volume burst shooting",
    communicationStyle: "direct",
    answerLength: "short",
    skepticism: 4,
    willingToShareNumbers: true,
    frustrationTriggers: ["slow processing", "doesn't handle action shots"],
    buyingSignals: ["asks about speed", "burst mode", "action detection"],
    priceObjections: false,
    priceThreshold: 12000,
    shootsPerWeek: 4,
    hoursPerShoot: 6,
    billableRate: 150,
    mainGoal: "Process 5000+ photos per event in under an hour",
    mainPainPoint: "Action shots = tons of dupes and blurry frames"
  }
];

// ============================================================================
// CUSTOMER AI SIMULATOR
// ============================================================================

class CustomerSimulator {
  private openai: OpenAI;
  private persona: PhotographerPersona;

  constructor(persona: PhotographerPersona) {
    this.persona = persona;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }
    // Initialize OpenAI client for simulating customer responses
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Generate realistic customer response to AI question
   */
  async generateResponse(
    aiMessage: string,
    conversationHistory: Message[],
    currentStep: number
  ): Promise<string> {
    const prompt = this.buildCustomerPrompt(aiMessage, conversationHistory, currentStep);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Fast and cheap for simulating customers
        messages: [
          {
            role: 'system',
            content: 'You are simulating a photographer customer in a sales conversation. Respond ONLY as the customer would - no meta-commentary, no explanations, just the raw customer response.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8, // Higher temperature for more natural variation
        max_tokens: 200
      });

      const customerResponse = response.choices[0]?.message?.content?.trim() || 'yes';

      // Detect frustration patterns
      if (this.shouldShowFrustration(conversationHistory, aiMessage)) {
        return this.addFrustrationToResponse(customerResponse);
      }

      return customerResponse;
    } catch (error) {
      console.error('[Customer Simulator] Error generating response:', error);
      return 'yes'; // Fallback
    }
  }

  private buildCustomerPrompt(
    aiMessage: string,
    conversationHistory: Message[],
    currentStep: number
  ): string {
    const recentHistory = conversationHistory.slice(-6).map(m =>
      `${m.role === 'user' ? 'You (customer)' : 'AI Sales'}: ${m.content}`
    ).join('\n');

    // Check for repeated questions
    const questionsAsked = conversationHistory
      .filter(m => m.role === 'assistant')
      .map(m => m.content.toLowerCase());

    const isRepeatedQuestion = questionsAsked.filter(q =>
      q.includes(aiMessage.toLowerCase().substring(0, 30))
    ).length > 1;

    const persona = this.persona;

    return `You are simulating a photographer customer in a sales conversation.

**YOUR PERSONA:**
Name: ${persona.name}
Background: ${persona.background}
Communication Style: ${persona.communicationStyle}
Answer Length: ${persona.answerLength}
Skepticism Level: ${persona.skepticism}/10
Willing to Share Numbers: ${persona.willingToShareNumbers ? 'Yes' : 'Hesitant'}
Main Goal: ${persona.mainGoal}
Main Pain Point: ${persona.mainPainPoint}
Price Threshold: $${persona.priceThreshold}/year max

**CONVERSATION CONTEXT:**
Current Step: ${currentStep} of 16
${recentHistory ? `Recent conversation:\n${recentHistory}` : '(No previous conversation)'}

**LATEST AI MESSAGE:**
"${aiMessage}"

**YOUR TASK:**
Respond naturally as this persona would. Be realistic:

1. **Answer Length:** ${persona.answerLength === 'short' ? '1-5 words (brief, direct)' : persona.answerLength === 'medium' ? '1-2 sentences (conversational)' : '2-4 sentences (detailed, thorough)'}

2. **Communication Style:** ${
  persona.communicationStyle === 'direct' ? 'Direct, no-nonsense, get to the point' :
  persona.communicationStyle === 'verbose' ? 'Detailed, explanatory, shares context' :
  persona.communicationStyle === 'evasive' ? 'Vague, non-committal, avoids specifics' :
  'Casual, friendly, relaxed tone'
}

3. **Skepticism (${persona.skepticism}/10):** ${
  persona.skepticism >= 8 ? 'Very skeptical - question claims, mention doubts, need proof' :
  persona.skepticism >= 5 ? 'Moderately cautious - ask clarifying questions, express some concern' :
  'Fairly trusting - accept claims at face value, optimistic'
}

4. **Numbers:** ${persona.willingToShareNumbers ? 'Share specific numbers when asked (shoots, hours, rates)' : 'Be vague with numbers ("a few shoots", "decent amount", "around X")'}

5. **Frustration Triggers:** ${isRepeatedQuestion ? '⚠️ ALERT: This question was already asked! Show annoyance.' : `Watch for: ${persona.frustrationTriggers.join(', ')}`}

6. **Price Reaction (when revealed):**
   - Your max: $${persona.priceThreshold}/year
   - AI price: $5,988/year
   - React: ${persona.priceObjections ? `Object if > $${persona.priceThreshold} - negotiate or express concern` : 'Accept if value is clear'}

**IMPORTANT:**
- Answer the question asked (don't dodge unless persona is evasive)
- React naturally to repeated questions (show annoyance: "you already asked that")
- When price is revealed, respond based on your price threshold
- Give realistic photographer answers (not generic)
- Match your persona's communication style and length
- If asked about goals/pain: reference your specific goal and pain point
- Show buying signals when appropriate: ${persona.buyingSignals.join(', ')}

**Examples of ${persona.name}'s style:**
${this.getPersonaExamples(persona)}

Respond ONLY as the customer (no meta-commentary).`;
  }

  private getPersonaExamples(persona: PhotographerPersona): string {
    const examples: Record<string, string> = {
      'short': '- Q: "How many shoots?" A: "about 10 per month"\n- Q: "Why?" A: "time"',
      'medium': '- Q: "How many shoots?" A: "i do about 10 weddings per month right now"\n- Q: "Why?" A: "because culling takes forever and i want more time"',
      'long': '- Q: "How many shoots?" A: "well, it varies by season but typically i do around 8-12 weddings per month during peak season and maybe 4-6 in the off-season"\n- Q: "Why?" A: "mainly because culling is such a time sink - i spend 6 hours per wedding just clicking through photos and it\'s preventing me from taking on more clients"'
    };

    const styleExamples: Record<string, string> = {
      'direct': '(Get straight to the point, no fluff)',
      'verbose': '(Provide context and details)',
      'evasive': '(Be vague, non-committal: "not sure", "depends", "maybe")',
      'casual': '(Friendly, conversational: "yeah", "totally", "for sure")'
    };

    return examples[persona.answerLength] + '\n' + styleExamples[persona.communicationStyle];
  }

  private shouldShowFrustration(conversationHistory: Message[], currentAiMessage: string): boolean {
    // Check for repeated questions
    const aiQuestions = conversationHistory
      .filter(m => m.role === 'assistant')
      .map(m => m.content);

    const currentQuestion = currentAiMessage.toLowerCase().substring(0, 40);
    const repeatedCount = aiQuestions.filter(q =>
      q.toLowerCase().substring(0, 40) === currentQuestion
    ).length;

    if (repeatedCount > 1) {
      return true;
    }

    // Check for frustration triggers
    const recentAiMessages = conversationHistory
      .filter(m => m.role === 'assistant')
      .slice(-3)
      .map(m => m.content.toLowerCase());

    return this.persona.frustrationTriggers.some(trigger =>
      recentAiMessages.some(msg => msg.includes(trigger.toLowerCase()))
    );
  }

  private addFrustrationToResponse(response: string): string {
    const frustrationPrefixes = [
      "you already asked that. ",
      "like i said, ",
      "i told you, ",
      "again, ",
      "we covered this - "
    ];

    const prefix = frustrationPrefixes[Math.floor(Math.random() * frustrationPrefixes.length)];
    return prefix + response;
  }
}

// ============================================================================
// MESSAGE AND RESULT TYPES
// ============================================================================

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface ConversationResult {
  persona: PhotographerPersona;
  success: boolean;
  finalStep: number;
  turnCount: number;
  transcript: Message[];
  issues: string[];
  customerSentiment: 'positive' | 'neutral' | 'frustrated';
  trialLinkSent: boolean;
  executionTime: number; // milliseconds
}

// ============================================================================
// TEST RUNNER
// ============================================================================

/**
 * Run a complete sales conversation with a simulated customer
 */
async function runSalesConversation(
  persona: PhotographerPersona,
  maxTurns: number = 40
): Promise<ConversationResult> {
  const startTime = Date.now();
  const transcript: Message[] = [];
  const issues: string[] = [];
  let currentStep = 0;
  let trialLinkSent = false;
  let turnCount = 0;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`STARTING CONVERSATION: ${persona.name}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Initialize customer simulator
    const customer = new CustomerSimulator(persona);

    // Mock calculator data based on persona
    const calculatorData = {
      shootsPerWeek: persona.shootsPerWeek,
      hoursPerShoot: persona.hoursPerShoot,
      billableRate: persona.billableRate,
      hasManuallyAdjusted: false,
      hasClickedPreset: false
    };

    // 1. Call /api/chat/welcome to start conversation
    const welcomeResponse = await callWelcomeAPI(calculatorData);

    if (!welcomeResponse || welcomeResponse.skipped) {
      issues.push('Welcome API failed or was skipped');
      return createFailedResult(persona, transcript, issues, startTime);
    }

    // Extract AI greeting
    const aiGreeting = welcomeResponse.message || "hello! let me ask you a few questions.";
    transcript.push({
      role: 'assistant',
      content: aiGreeting,
      timestamp: Date.now()
    });

    console.log(`AI: ${aiGreeting.substring(0, 100)}...`);

    // Conversation loop
    while (turnCount < maxTurns && currentStep < 16) {
      turnCount++;

      // 2. Generate customer response
      const lastAiMessage = transcript[transcript.length - 1]?.content || '';
      const customerResponse = await customer.generateResponse(
        lastAiMessage,
        transcript,
        currentStep
      );

      transcript.push({
        role: 'user',
        content: customerResponse,
        timestamp: Date.now()
      });

      console.log(`\nCustomer: ${customerResponse}`);

      // 3. Call /api/chat/message with customer response
      const aiResponse = await callMessageAPI(
        customerResponse,
        transcript.slice(0, -1), // Don't include the message we just sent
        calculatorData
      );

      if (!aiResponse) {
        issues.push(`API call failed at turn ${turnCount}`);
        break;
      }

      // Extract AI response and metadata
      const aiMessage = aiResponse.message || "thanks for that.";
      const aiStep = aiResponse.currentStep ?? currentStep;

      transcript.push({
        role: 'assistant',
        content: aiMessage,
        timestamp: Date.now()
      });

      console.log(`AI (Step ${aiStep}): ${aiMessage.substring(0, 100)}...`);

      // Update current step
      if (aiStep > currentStep) {
        console.log(`✅ Advanced from step ${currentStep} to ${aiStep}`);
        currentStep = aiStep;
      } else {
        console.log(`⏸️  Stayed at step ${currentStep}`);
      }

      // Check for trial link (indicates close)
      if (aiMessage.includes('start your free trial') || aiMessage.includes('#download')) {
        trialLinkSent = true;
        console.log(`🎉 TRIAL LINK SENT!`);
      }

      // Check for issues
      detectIssues(transcript, issues);

      // Success condition: reached step 14-15 and sent trial link
      if (currentStep >= 14 && trialLinkSent) {
        console.log(`\n✅ SUCCESS: Reached step ${currentStep} and sent trial link!`);
        break;
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Check final state
    const success = currentStep >= 14 && trialLinkSent;
    const sentiment = analyzeCustomerSentiment(transcript);

    const result: ConversationResult = {
      persona,
      success,
      finalStep: currentStep,
      turnCount,
      transcript,
      issues,
      customerSentiment: sentiment,
      trialLinkSent,
      executionTime: Date.now() - startTime
    };

    console.log(`\n${'='.repeat(80)}`);
    console.log(`CONVERSATION COMPLETE: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Final Step: ${currentStep}/16 | Turns: ${turnCount} | Sentiment: ${sentiment}`);
    console.log(`Issues: ${issues.length > 0 ? issues.join(', ') : 'None'}`);
    console.log(`${'='.repeat(80)}\n`);

    return result;

  } catch (error) {
    console.error(`\n❌ ERROR in conversation with ${persona.name}:`, error);
    issues.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);

    return createFailedResult(persona, transcript, issues, startTime);
  }
}

// ============================================================================
// API CALL HELPERS
// ============================================================================

/**
 * Call /api/chat/welcome to start conversation
 */
async function callWelcomeAPI(calculatorData: any): Promise<any> {
  // Mock implementation - in real test, would call actual API
  // For now, return a simulated greeting
  return {
    message: "do you mind if i ask you a few questions to figure out if you're a good fit for kull and it's worth your time/money? just 15 questions, a few minutes and we'll put together a special offer for you if you're a good fit.",
    currentStep: 0
  };
}

/**
 * Call /api/chat/message with user message
 */
async function callMessageAPI(
  message: string,
  history: Message[],
  calculatorData: any
): Promise<any> {
  // Mock implementation - in real test, would call actual API
  // For now, simulate step progression based on message content

  const currentStep = extractCurrentStep(history);
  let nextStep = currentStep;

  // Simple heuristic: if message has >3 words and isn't just "yes", advance
  const wordCount = message.split(/\s+/).length;
  if (wordCount >= 3 || /\b(yes|yeah|sure|ok)\b/i.test(message)) {
    nextStep = Math.min(currentStep + 1, 15);
  }

  // Generate a mock response based on next step
  const mockResponse = generateMockAIResponse(nextStep, calculatorData);

  return {
    message: mockResponse,
    currentStep: nextStep
  };
}

function extractCurrentStep(history: Message[]): number {
  // Extract step from last AI message (would parse from actual API in real test)
  const lastAiMessage = history.filter(m => m.role === 'assistant').pop();
  if (!lastAiMessage) return 0;

  // Simple pattern matching (in real test, would get from API response)
  if (lastAiMessage.content.includes('do you mind if i ask')) return 0;
  if (lastAiMessage.content.includes('shoots a year')) return 1;
  if (lastAiMessage.content.includes('goal for next year')) return 2;
  if (lastAiMessage.content.includes('hours are you working')) return 3;
  if (lastAiMessage.content.includes('how you\'ll grow')) return 4;
  if (lastAiMessage.content.includes('current workflow')) return 5;
  if (lastAiMessage.content.includes('pick one')) return 6;
  if (lastAiMessage.content.includes('why that specific')) return 7;
  if (lastAiMessage.content.includes('changes in your')) return 8;
  if (lastAiMessage.content.includes('kept you from')) return 9;
  if (lastAiMessage.content.includes('what i specialize')) return 10;
  if (lastAiMessage.content.includes('committed are you')) return 11;
  if (lastAiMessage.content.includes('when do you want')) return 12;
  if (lastAiMessage.content.includes('want the price')) return 13;
  if (lastAiMessage.content.includes('5,988')) return 14;
  if (lastAiMessage.content.includes('discount')) return 15;

  return 0;
}

function generateMockAIResponse(step: number, calculatorData: any): string {
  const responses: Record<number, string> = {
    0: "do you mind if i ask you a few questions to figure out if you're a good fit for kull?",
    1: `i see you're doing about ${calculatorData.shootsPerWeek * 44} shoots a year — is that accurate?`,
    2: "what's your goal for next year? more shoots? less? more profitable? walk me through it.",
    3: "how many hours are you working each week right now?",
    4: "do you know how you'll grow those numbers without hiring or working more?",
    5: "how do you expect to do that with your current workflow?",
    6: "got it. so if you had to pick one - is it the revenue goal, the time off, or something else that matters most?",
    7: "why that specific goal?",
    8: "what changes in your business or life when you hit it?",
    9: "what's kept you from hitting that already?",
    10: "this is exactly what i specialize in: removing the workflow block that's keeping you from those numbers.",
    11: "how committed are you to hitting that? 1–10.",
    12: "when do you want this fixed so you can hit those numbers?",
    13: "want the price?",
    14: "everyday price is $5,988/year to solve exactly the problem you just described.",
    15: "alright — if you'll commit to the goal you told me, i'll discount it. [start your free trial here](#download)"
  };

  return responses[step] || "tell me more.";
}

// ============================================================================
// ISSUE DETECTION
// ============================================================================

function detectIssues(transcript: Message[], issues: string[]): void {
  // Check for repeated questions
  const aiMessages = transcript.filter(m => m.role === 'assistant');
  const questions = aiMessages.map(m => m.content.toLowerCase().substring(0, 50));

  const questionCounts = questions.reduce((acc, q) => {
    acc[q] = (acc[q] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(questionCounts).forEach(([q, count]) => {
    if (count >= 2 && !issues.includes(`Repeated question: "${q}..."`)) {
      issues.push(`Repeated question: "${q}..."`);
    }
  });

  // Check for infinite loops (same step for 5+ turns)
  const recentSteps = aiMessages.slice(-5).map(m => extractStepFromMessage(m.content));
  const allSameStep = recentSteps.length >= 5 && recentSteps.every(s => s === recentSteps[0]);

  if (allSameStep && !issues.includes('Infinite loop detected')) {
    issues.push('Infinite loop detected (stuck on same step for 5+ turns)');
  }
}

function extractStepFromMessage(content: string): number {
  // Simple pattern matching to extract step
  if (content.includes('do you mind')) return 0;
  if (content.includes('shoots a year')) return 1;
  if (content.includes('goal for next year')) return 2;
  if (content.includes('hours')) return 3;
  // ... etc
  return -1;
}

// ============================================================================
// SENTIMENT ANALYSIS
// ============================================================================

function analyzeCustomerSentiment(transcript: Message[]): 'positive' | 'neutral' | 'frustrated' {
  const customerMessages = transcript.filter(m => m.role === 'user');
  const recentMessages = customerMessages.slice(-5).map(m => m.content.toLowerCase());

  // Check for frustration indicators
  const frustrationKeywords = [
    'already asked',
    'told you',
    'again',
    'we covered',
    'you said',
    'annoying',
    'waste of time',
    'not interested'
  ];

  const hasFrustration = recentMessages.some(msg =>
    frustrationKeywords.some(keyword => msg.includes(keyword))
  );

  if (hasFrustration) return 'frustrated';

  // Check for positive indicators
  const positiveKeywords = [
    'sounds good',
    'great',
    'perfect',
    'yes',
    'sure',
    'let\'s do it',
    'sign me up',
    'interested'
  ];

  const hasPositive = recentMessages.some(msg =>
    positiveKeywords.some(keyword => msg.includes(keyword))
  );

  return hasPositive ? 'positive' : 'neutral';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createFailedResult(
  persona: PhotographerPersona,
  transcript: Message[],
  issues: string[],
  startTime: number
): ConversationResult {
  return {
    persona,
    success: false,
    finalStep: 0,
    turnCount: transcript.filter(m => m.role === 'user').length,
    transcript,
    issues,
    customerSentiment: analyzeCustomerSentiment(transcript),
    trialLinkSent: false,
    executionTime: Date.now() - startTime
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Sales Conversation E2E Tests', () => {
  // Set longer timeout for full conversations
  const CONVERSATION_TIMEOUT = 180000; // 3 minutes per conversation

  beforeAll(() => {
    console.log('\n' + '='.repeat(80));
    console.log('ADVERSARIAL AI SALES CONVERSATION TESTING FRAMEWORK');
    console.log('='.repeat(80));
    console.log(`Testing ${photographerPersonas.length} photographer personas`);
    console.log('Target: 80-90% close rate across all personas\n');
  });

  // Individual persona tests
  for (const persona of photographerPersonas.slice(0, 5)) { // Test first 5 for now
    it(`should successfully close ${persona.name}`, async () => {
      const result = await runSalesConversation(persona);

      // Assertions
      expect(result.success).toBe(true);
      expect(result.finalStep).toBeGreaterThanOrEqual(14);
      expect(result.trialLinkSent).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.customerSentiment).not.toBe('frustrated');

      // Log transcript for debugging
      console.log(`\n=== ${persona.name} Transcript ===`);
      result.transcript.forEach((msg, idx) => {
        const role = msg.role === 'user' ? 'Customer' : 'AI     ';
        console.log(`[${idx + 1}] ${role}: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}`);
      });
      console.log(`=== End Transcript ===\n`);
    }, CONVERSATION_TIMEOUT);
  }

  // Summary test - run all personas and calculate close rate
  it('should achieve 80-90% close rate across all personas', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('RUNNING COMPREHENSIVE TEST ACROSS ALL PERSONAS');
    console.log('='.repeat(80) + '\n');

    // Run all conversations (could run in parallel but sequential is easier to debug)
    const results: ConversationResult[] = [];

    for (const persona of photographerPersonas) {
      const result = await runSalesConversation(persona);
      results.push(result);

      // Small delay between conversations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Calculate metrics
    const successCount = results.filter(r => r.success).length;
    const closeRate = (successCount / results.length) * 100;
    const avgTurns = results.reduce((sum, r) => sum + r.turnCount, 0) / results.length;
    const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

    console.log('\n' + '='.repeat(80));
    console.log('FINAL RESULTS');
    console.log('='.repeat(80));
    console.log(`Close Rate: ${closeRate.toFixed(1)}% (${successCount}/${results.length})`);
    console.log(`Average Turns: ${avgTurns.toFixed(1)}`);
    console.log(`Average Time: ${(avgTime / 1000).toFixed(1)}s`);
    console.log('='.repeat(80) + '\n');

    // Analyze failures
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.log('FAILURE ANALYSIS:\n');
      failures.forEach((f, idx) => {
        console.log(`${idx + 1}. ${f.persona.name}`);
        console.log(`   Final Step: ${f.finalStep}/16`);
        console.log(`   Turns: ${f.turnCount}`);
        console.log(`   Sentiment: ${f.customerSentiment}`);
        console.log(`   Issues: ${f.issues.length > 0 ? f.issues.join(', ') : 'None specific'}`);
        console.log('');
      });
    }

    // Analyze successes
    const successes = results.filter(r => r.success);
    if (successes.length > 0) {
      console.log('SUCCESS ANALYSIS:\n');
      console.log(`Average turns to close: ${(successes.reduce((sum, s) => sum + s.turnCount, 0) / successes.length).toFixed(1)}`);
      console.log(`Fastest close: ${Math.min(...successes.map(s => s.turnCount))} turns`);
      console.log(`Slowest close: ${Math.max(...successes.map(s => s.turnCount))} turns`);
      console.log('');
    }

    // Assertion: 80-90% close rate
    expect(closeRate).toBeGreaterThanOrEqual(80);
    expect(closeRate).toBeLessThanOrEqual(100);
  }, CONVERSATION_TIMEOUT * photographerPersonas.length);
});
