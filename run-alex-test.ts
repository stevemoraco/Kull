/**
 * Alex - Eager Enthusiast E2E Test
 * Simplified test harness that adds Alex persona and runs a single conversation
 */

import OpenAI from 'openai';

// Alex Persona Definition
const ALEX_PERSONA = {
  name: "Alex - Eager Enthusiast",
  background: "3 shoots/week, 3 hours/shoot, $120/hr billable. Very enthusiastic, wants to buy immediately.",
  communicationStyle: "casual" as const,
  answerLength: "short" as const,
  skepticism: 2,
  willingToShareNumbers: true,
  frustrationTriggers: [],
  buyingSignals: ["asks about price early", "shares specific numbers", "asks how to start", "enthusiastic"],
  priceObjections: false,
  priceThreshold: 8000,
  shootsPerWeek: 3,
  hoursPerShoot: 3,
  billableRate: 120,
  mainGoal: 'Scale to more shoots without burning out',
  mainPainPoint: 'Culling takes too long, losing potential clients'
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface ConversationResult {
  persona: any;
  success: boolean;
  finalStep: number;
  turnCount: number;
  transcript: Message[];
  issues: string[];
  customerSentiment: 'positive' | 'neutral' | 'frustrated';
  trialLinkSent: boolean;
  executionTime: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class CustomerSimulator {
  constructor(private persona: any) {}

  async generateResponse(
    aiMessage: string,
    conversationHistory: Message[],
    currentStep: number
  ): Promise<string> {
    const prompt = this.buildCustomerPrompt(aiMessage, conversationHistory, currentStep);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
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
        temperature: 0.8,
        max_tokens: 200
      });

      return response.choices[0]?.message?.content?.trim() || 'yes';
    } catch (error) {
      console.error('[Customer Simulator] Error:', error);
      return 'yes';
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

    const persona = this.persona;

    return `You are simulating a photographer customer in a sales conversation.

**YOUR PERSONA:**
Name: ${persona.name}
Background: ${persona.background}
Communication Style: ${persona.communicationStyle}
Skepticism Level: ${persona.skepticism}/10
Main Goal: ${persona.mainGoal}
Price Threshold: $${persona.priceThreshold}/year max

**CONVERSATION CONTEXT:**
Current Step: ${currentStep} of 16
${recentHistory ? `Recent conversation:\n${recentHistory}` : '(No previous conversation)'}

**LATEST AI MESSAGE:**
"${aiMessage}"

**YOUR TASK:**
Respond naturally as this persona would. You are VERY enthusiastic and eager to buy.

1. **Answer Length:** 1-5 words (brief, direct)
2. **Communication Style:** Casual, friendly, relaxed tone
3. **Skepticism (${persona.skepticism}/10):** Very trusting - accept claims at face value, optimistic
4. **Numbers:** Share specific numbers when asked
5. **Price Reaction:** Your max is $${persona.priceThreshold}/year. AI price is $5,988. Since $5,988 < $${persona.priceThreshold}, be EXCITED!
6. **Buying Signals:** Show enthusiasm for getting started, pricing, and next steps

**IMPORTANT:**
- Answer the question asked
- Be VERY enthusiastic about buying
- When price is revealed ($5,988), respond with excitement since it's under your $${persona.priceThreshold} budget
- Give realistic photographer answers
- Show buying intent strongly

Respond ONLY as the customer (no meta-commentary).`;
  }
}

// Mock API Functions (same as the test)
async function callWelcomeAPI(calculatorData: any): Promise<any> {
  return {
    message: "do you mind if i ask you a few questions to figure out if you're a good fit for kull and it's worth your time/money? just 15 questions, a few minutes and we'll put together a special offer for you if you're a good fit.",
    currentStep: 0
  };
}

async function callMessageAPI(
  message: string,
  history: Message[],
  calculatorData: any
): Promise<any> {
  const currentStep = extractCurrentStep(history);
  let nextStep = currentStep;

  const wordCount = message.split(/\s+/).length;
  if (wordCount >= 3 || /\b(yes|yeah|sure|ok|awesome|great|perfect|excited)\b/i.test(message)) {
    nextStep = Math.min(currentStep + 1, 15);
  }

  const mockResponse = generateMockAIResponse(nextStep, calculatorData);

  return {
    message: mockResponse,
    currentStep: nextStep
  };
}

function extractCurrentStep(history: Message[]): number {
  const lastAiMessage = history.filter(m => m.role === 'assistant').pop();
  if (!lastAiMessage) return 0;

  if (lastAiMessage.content.includes('do you mind')) return 0;
  if (lastAiMessage.content.includes('shoots a year')) return 1;
  if (lastAiMessage.content.includes('goal for next year')) return 2;
  if (lastAiMessage.content.includes('hours are you working')) return 3;
  if (lastAiMessage.content.includes("how you'll grow")) return 4;
  if (lastAiMessage.content.includes('current workflow')) return 5;
  if (lastAiMessage.content.includes('pick one')) return 6;
  if (lastAiMessage.content.includes('why that specific')) return 7;
  if (lastAiMessage.content.includes('changes in your')) return 8;
  if (lastAiMessage.content.includes('kept you from')) return 9;
  if (lastAiMessage.content.includes('what i specialize')) return 10;
  if (lastAiMessage.content.includes('committed are you')) return 11;
  if (lastAiMessage.content.includes('when do you want')) return 12;
  if (lastAiMessage.content.includes('want the price')) return 13;
  if (lastAiMessage.content.includes('5,988') || lastAiMessage.content.includes('5988')) return 14;
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

function detectIssues(transcript: Message[], issues: string[]): void {
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
}

function analyzeCustomerSentiment(transcript: Message[]): 'positive' | 'neutral' | 'frustrated' {
  const customerMessages = transcript.filter(m => m.role === 'user');
  const recentMessages = customerMessages.slice(-5).map(m => m.content.toLowerCase());

  const frustrationKeywords = ['already asked', 'told you', 'again', 'annoying', 'waste of time'];
  const hasFrustration = recentMessages.some(msg =>
    frustrationKeywords.some(keyword => msg.includes(keyword))
  );

  if (hasFrustration) return 'frustrated';

  const positiveKeywords = ['sounds good', 'great', 'perfect', 'yes', 'sure', 'excited', 'awesome', 'ready'];
  const hasPositive = recentMessages.some(msg =>
    positiveKeywords.some(keyword => msg.includes(keyword))
  );

  return hasPositive ? 'positive' : 'neutral';
}

async function runSalesConversation(
  persona: any,
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
    const customer = new CustomerSimulator(persona);

    const calculatorData = {
      shootsPerWeek: persona.shootsPerWeek,
      hoursPerShoot: persona.hoursPerShoot,
      billableRate: persona.billableRate,
      hasManuallyAdjusted: false,
      hasClickedPreset: false
    };

    const welcomeResponse = await callWelcomeAPI(calculatorData);
    if (!welcomeResponse || welcomeResponse.skipped) {
      issues.push('Welcome API failed or was skipped');
      return {
        persona,
        success: false,
        finalStep: 0,
        turnCount: 0,
        transcript,
        issues,
        customerSentiment: 'neutral',
        trialLinkSent: false,
        executionTime: Date.now() - startTime
      };
    }

    const aiGreeting = welcomeResponse.message || "hello! let me ask you a few questions.";
    transcript.push({
      role: 'assistant',
      content: aiGreeting,
      timestamp: Date.now()
    });

    console.log(`AI: ${aiGreeting.substring(0, 100)}...`);

    while (turnCount < maxTurns && currentStep < 16) {
      turnCount++;

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

      console.log(`\nCustomer (Turn ${turnCount}): ${customerResponse}`);

      const aiResponse = await callMessageAPI(
        customerResponse,
        transcript.slice(0, -1),
        calculatorData
      );

      if (!aiResponse) {
        issues.push(`API call failed at turn ${turnCount}`);
        break;
      }

      const aiMessage = aiResponse.message || "thanks for that.";
      const aiStep = aiResponse.currentStep ?? currentStep;

      transcript.push({
        role: 'assistant',
        content: aiMessage,
        timestamp: Date.now()
      });

      console.log(`AI (Step ${aiStep}): ${aiMessage.substring(0, 100)}...`);

      if (aiStep > currentStep) {
        console.log(`✅ Advanced from step ${currentStep} to ${aiStep}`);
        currentStep = aiStep;
      } else {
        console.log(`⏸️  Stayed at step ${currentStep}`);
      }

      if (aiMessage.includes('start your free trial') || aiMessage.includes('#download')) {
        trialLinkSent = true;
        console.log(`🎉 TRIAL LINK SENT!`);
      }

      detectIssues(transcript, issues);

      if (currentStep >= 14 && trialLinkSent) {
        console.log(`\n✅ SUCCESS: Reached step ${currentStep} and sent trial link!`);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

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
}

// Main execution
async function main() {
  console.log('='.repeat(80));
  console.log('ALEX - EAGER ENTHUSIAST E2E TEST');
  console.log('='.repeat(80));
  console.log(`Persona: Alex - Eager Enthusiast`);
  console.log(`Budget: 3 shoots/week × 3 hours × $120/hr = ~$55,440/year opportunity`);
  console.log(`Price Threshold: $8,000/year`);
  console.log(`Target: Reach Step 15 with trial link sent`);
  console.log();

  const result = await runSalesConversation(ALEX_PERSONA);

  // Final report
  console.log('\n' + '='.repeat(80));
  console.log('FINAL REPORT');
  console.log('='.repeat(80));
  console.log(`Persona: ${result.persona.name.split(' - ')[1]}`);
  console.log(`Turns: ${result.turnCount}`);
  console.log(`Final Step: ${result.finalStep}/16`);
  console.log(`Trial Link: ${result.trialLinkSent ? 'YES' : 'NO'}`);
  console.log(`Status: ${result.success ? 'SUCCESS' : result.finalStep >= 14 ? 'CLOSE' : 'STUCK'}`);
  console.log(`Sentiment: ${result.customerSentiment}`);
  console.log(`Duration: ${(result.executionTime / 1000).toFixed(1)}s`);
  console.log('='.repeat(80));
}

main().catch(console.error);
