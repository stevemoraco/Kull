/**
 * Alex - Eager Enthusiast E2E Test
 *
 * Persona: Alex - Eager Enthusiast
 * - 3 shoots/week, 3 hours/shoot, $120/hr
 * - VERY enthusiastic, wants to buy immediately
 * - Asks about price early (trigger buying signal)
 * - Price threshold: $8,000/year
 *
 * Run via: npx ts-node test-alex-persona.ts
 */

import OpenAI from 'openai';

const ALEX_PERSONA = {
  name: 'Alex - Eager Enthusiast',
  background: '3 shoots/week, 3 hours/shoot, $120/hr billable. Very enthusiastic, wants to buy immediately.',
  communicationStyle: 'casual',
  answerLength: 'short',
  skepticism: 2,
  willingToShareNumbers: true,
  frustrationTriggers: [],
  buyingSignals: ['asks about price early', 'shares specific numbers', 'asks how to start', 'enthusiastic'],
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
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const API_BASE = 'http://localhost:5000/api';

async function generateCustomerResponse(
  aiMessage: string,
  history: Message[],
  step: number
): Promise<string> {
  const recentHistory = history.slice(-4).map(m =>
    `${m.role === 'user' ? 'Customer' : 'AI'}: ${m.content}`
  ).join('\n');

  const prompt = `You are Alex - Eager Enthusiast, a photographer persona.

**ABOUT ALEX:**
- Shoots 3 times per week, 3 hours per shoot at $120/hr billable rate
- VERY enthusiastic and excited about new solutions
- Ready to buy immediately
- Asks about price early (trigger buying signal)
- Max willing to pay: $8,000/year
- Communication: casual, short answers
- Skepticism: 2/10 (very trusting)

**CONVERSATION:**
${recentHistory}

**LATEST FROM AI:**
"${aiMessage}"

**YOUR TASK:**
Respond as Alex would - be enthusiastic, casual, short responses. If AI mentions price/payment or asks buying-related questions, show excitement. Don't be evasive. Share numbers readily.

**CRITICAL:** When AI reveals the price ($5,988), respond based on Alex's $8,000 threshold. Since $5,988 < $8,000, Alex should be EXCITED and ready to proceed.

Respond ONLY as the customer (no meta-commentary). Keep it 1-3 sentences max.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are simulating a customer response. Respond ONLY as the customer, no explanations.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8,
    max_tokens: 100
  });

  return response.choices[0]?.message?.content?.trim() || 'yes';
}

async function callChatWelcome(calculatorData: any): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/chat/welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calculatorData })
    });

    // Parse streaming response
    let fullMessage = '';
    let currentStep = 0;

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.substring(6));
          if (json.type === 'message') {
            fullMessage += json.message || '';
          } else if (json.type === 'metadata') {
            currentStep = json.currentStep ?? 0;
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    return { message: fullMessage.trim() || 'Hello! Let me ask you some questions.', currentStep };
  } catch (error) {
    console.error('Welcome API error:', error);
    return null;
  }
}

async function callChatMessage(
  message: string,
  history: Message[],
  calculatorData: any
): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history,
        calculatorData
      })
    });

    // Parse streaming response
    let fullMessage = '';
    let currentStep = 0;

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.substring(6));
          if (json.type === 'message') {
            fullMessage += json.message || '';
          } else if (json.type === 'metadata') {
            currentStep = json.currentStep ?? 0;
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    return { message: fullMessage.trim() || 'I understand.', currentStep };
  } catch (error) {
    console.error('Message API error:', error);
    return null;
  }
}

async function runAlexConversation() {
  console.log('='.repeat(80));
  console.log(`PERSONA: ${ALEX_PERSONA.name}`);
  console.log(`Background: ${ALEX_PERSONA.background}`);
  console.log(`Price Threshold: $${ALEX_PERSONA.priceThreshold}/year`);
  console.log('='.repeat(80));
  console.log();

  const transcript: Message[] = [];
  let currentStep = 0;
  let turnCount = 0;
  let trialLinkSent = false;
  const maxTurns = 40;

  const calculatorData = {
    shootsPerWeek: ALEX_PERSONA.shootsPerWeek,
    hoursPerShoot: ALEX_PERSONA.hoursPerShoot,
    billableRate: ALEX_PERSONA.billableRate,
    hasManuallyAdjusted: false,
    hasClickedPreset: false
  };

  try {
    // Start conversation
    const welcomeRes = await callChatWelcome(calculatorData);
    if (!welcomeRes?.message) {
      console.error('❌ Welcome API failed');
      return;
    }

    const aiGreeting = welcomeRes.message;
    transcript.push({ role: 'assistant', content: aiGreeting });
    console.log(`AI (Step ${currentStep}): ${aiGreeting.substring(0, 120)}...`);
    console.log();

    // Conversation loop
    while (turnCount < maxTurns && currentStep < 16) {
      turnCount++;

      // Get customer response
      const lastAiMessage = transcript[transcript.length - 1].content;
      const customerResponse = await generateCustomerResponse(
        lastAiMessage,
        transcript,
        currentStep
      );

      transcript.push({ role: 'user', content: customerResponse });
      console.log(`Customer (Turn ${turnCount}): ${customerResponse}`);

      // Get AI response
      const aiRes = await callChatMessage(customerResponse, transcript.slice(0, -1), calculatorData);
      if (!aiRes?.message) {
        console.error(`❌ API failed at turn ${turnCount}`);
        break;
      }

      const aiMessage = aiRes.message;
      const nextStep = aiRes.currentStep ?? currentStep;

      transcript.push({ role: 'assistant', content: aiMessage });
      console.log(`AI (Step ${nextStep}): ${aiMessage.substring(0, 120)}...`);

      // Update step
      if (nextStep > currentStep) {
        console.log(`✅ Step ${currentStep} → ${nextStep}`);
        currentStep = nextStep;
      }

      // Check for trial link
      if (aiMessage.includes('start your free trial') || aiMessage.includes('#download')) {
        trialLinkSent = true;
        console.log(`🎉 TRIAL LINK SENT!`);
      }

      console.log();

      // Success condition
      if (currentStep >= 14 && trialLinkSent) {
        console.log('✅ SUCCESS: Reached step 14+ and trial link sent!');
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Report
    console.log();
    console.log('='.repeat(80));
    console.log('FINAL REPORT');
    console.log('='.repeat(80));
    console.log(`Persona: ${ALEX_PERSONA.name.split(' - ')[1]}`);
    console.log(`Turns: ${turnCount}`);
    console.log(`Final Step: ${currentStep}/16`);
    console.log(`Trial Link: ${trialLinkSent ? 'YES' : 'NO'}`);
    console.log(`Status: ${currentStep >= 14 && trialLinkSent ? 'SUCCESS' : 'STUCK'}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run test
runAlexConversation().catch(console.error);
