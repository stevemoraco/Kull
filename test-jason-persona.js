#!/usr/bin/env node

/**
 * Jason Persona Test - Real API Conversation
 *
 * Tests Jason (Impulsive Early Adopter) persona through real chat API endpoints
 *
 * PERSONA: Jason - Impulsive Early Adopter
 * - Casual, short answers
 * - Very low skepticism (2/10)
 * - 4 shoots/week, 3 hours/shoot, $175/hr rate
 * - Loves new tech, impatient
 * - Price threshold: $10,000/year
 */

import http from 'http';

// Jason Persona Definition
const JASON_PERSONA = {
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
  shootsPerWeek: 4,
  hoursPerShoot: 3,
  billableRate: 175,
  mainGoal: "Be more efficient, have more fun shooting",
  mainPainPoint: "Culling is boring AF"
};

// Calculator data for Jason
const CALCULATOR_DATA = {
  shootsPerWeek: JASON_PERSONA.shootsPerWeek,
  hoursPerShoot: JASON_PERSONA.hoursPerShoot,
  hourlyRate: JASON_PERSONA.billableRate,
  yearlyIncome: JASON_PERSONA.shootsPerWeek * 52 * JASON_PERSONA.hoursPerShoot * JASON_PERSONA.billableRate
};

// Test responses for Jason's character
const JASON_RESPONSES = {
  // Permission (step 0) - Jason just agrees
  0: "yeah sure, sounds good.",

  // Current reality (step 1) - Jason is casual about numbers
  1: "yep, that sounds about right.",

  // Goal for next year (step 2) - Jason is practical
  2: "honestly just want more time to actually enjoy shooting instead of spending it on the computer",

  // Hours per week (step 3) - Jason gives short answer
  3: "probably like 15-20 hours of actual shooting plus culling",

  // Growth plan (step 4) - Jason doesn't have detailed plan
  4: "not really, that's the problem",

  // Current workflow (step 5) - Jason complains about culling
  5: "i use lightroom like everyone else. just manually go through and rate everything. sucks.",

  // Prioritize goal (step 6) - Jason picks time
  6: "time. 100%. culling is the worst part",

  // Why that goal (step 7) - Personal motivation
  7: "because i'd rather be shooting with clients or just chilling",

  // Outcome vision (step 8) - Jason's vision
  8: "spending less time staring at photos and more time actually taking them",

  // The bottleneck (step 9) - Jason identifies the block
  9: "just the sheer number of photos and having to manually review every single one",

  // Solution explanation (step 10) - Jason is ready
  10: "wait, so it just does that automatically? that's sick.",

  // Commitment (step 11) - Jason is enthusiastic
  11: "like a 9. if this works, i'm in",

  // Timeline (step 12) - Jason wants it now
  12: "asap. like tomorrow would be ideal",

  // Want the price (step 13) - Jason not worried about price
  13: "yeah, how much?",

  // Price reveal (step 14) - Jason considers it
  14: "is that per month or per year?",

  // Discount offer (step 15) - Jason closes
  15: "yeah yeah, let's do it"
};

// API call helper
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Jason-Persona-Test/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Main test
async function testJasonPersona() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING JASON PERSONA - REAL API CONVERSATION');
  console.log('='.repeat(80) + '\n');

  console.log('PERSONA INFO:');
  console.log(`  Name: ${JASON_PERSONA.name}`);
  console.log(`  Communication: ${JASON_PERSONA.communicationStyle}, ${JASON_PERSONA.answerLength} answers`);
  console.log(`  Skepticism: ${JASON_PERSONA.skepticism}/10`);
  console.log(`  Shoots/week: ${JASON_PERSONA.shootsPerWeek}`);
  console.log(`  Hourly rate: $${JASON_PERSONA.billableRate}`);
  console.log(`  Yearly income: $${CALCULATOR_DATA.yearlyIncome.toLocaleString()}`);
  console.log(`  Main pain: ${JASON_PERSONA.mainPainPoint}`);
  console.log('');

  const transcript = [];
  let currentStep = 0;
  const turns = [];

  try {
    // Step 1: Get welcome message
    console.log('📍 STEP 0: Welcome - Getting greeting...');
    const sessionId = 'jason-test-' + Date.now();
    const welcomeRes = await makeRequest('POST', '/api/chat/welcome', {
      context: {
        sessionId: sessionId,
        timeOnSite: 5000,
        pageSource: 'sales-page',
        referrer: 'test'
      },
      calculatorData: CALCULATOR_DATA,
      history: [],
      sectionHistory: []
    });

    if (!welcomeRes.data.message) {
      console.error('❌ Welcome failed:', welcomeRes.data);
      return;
    }

    const welcomeMsg = welcomeRes.data.message;
    transcript.push({ role: 'ai', content: welcomeMsg });
    console.log(`AI: ${welcomeMsg.substring(0, 120)}...\n`);
    currentStep = welcomeRes.data.currentStep || 0;

    // Step 2-16: Run conversation
    const maxTurns = 20;
    let turnCount = 0;

    while (turnCount < maxTurns && currentStep < 16) {
      turnCount++;

      // Get Jason's response for this step
      let jasonResponse = JASON_RESPONSES[currentStep];
      if (!jasonResponse) {
        console.log(`⚠️  No response for step ${currentStep}, using default`);
        jasonResponse = "yeah";
      }

      console.log(`📍 TURN ${turnCount} - STEP ${currentStep}`);
      console.log(`Jason: ${jasonResponse}\n`);
      transcript.push({ role: 'customer', content: jasonResponse });
      turns.push({ turn: turnCount, step: currentStep, message: jasonResponse });

      // Call message API
      const messageRes = await makeRequest('POST', '/api/chat/message', {
        message: jasonResponse,
        sessionId: sessionId,
        ...CALCULATOR_DATA,
        conversationHistory: transcript.map(t => ({
          role: t.role === 'ai' ? 'assistant' : 'user',
          content: t.content
        }))
      });

      if (!messageRes.data.message) {
        console.error(`❌ Message API failed at turn ${turnCount}:`, messageRes.data);
        break;
      }

      const aiMessage = messageRes.data.message;
      const nextStep = messageRes.data.currentStep ?? currentStep;

      transcript.push({ role: 'ai', content: aiMessage });
      console.log(`AI (Step ${nextStep}): ${aiMessage.substring(0, 120)}...`);

      // Check for trial link (success condition)
      if (aiMessage.includes('start your free trial') || aiMessage.includes('#download')) {
        console.log(`\n🎉 TRIAL LINK SENT - CONVERSATION SUCCESS!\n`);
        currentStep = nextStep;
        turns.push({ turn: turnCount + 1, step: nextStep, message: 'TRIAL_LINK_SENT' });
        break;
      }

      // Check step progression
      if (nextStep > currentStep) {
        console.log(`✅ Advanced: Step ${currentStep} → ${nextStep}`);
      } else if (nextStep === currentStep) {
        console.log(`⏸️  Stayed at Step ${currentStep}`);
      } else {
        console.log(`⚠️  Went backwards: Step ${currentStep} → ${nextStep}`);
      }

      currentStep = nextStep;
      console.log('');

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Generate report
    console.log('\n' + '='.repeat(80));
    console.log('CONVERSATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`\nTurns: ${turnCount}`);
    console.log(`Final Step: ${currentStep}/16`);
    console.log(`Status: ${currentStep >= 14 ? '✅ SUCCESS' : '❌ INCOMPLETE'}\n`);

    // Print transcript
    console.log('FULL TRANSCRIPT:');
    console.log('-'.repeat(80));
    transcript.forEach((msg, idx) => {
      const speaker = msg.role === 'ai' ? 'AI' : 'Jason';
      const content = msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '');
      console.log(`[${idx + 1}] ${speaker}: ${content}`);
    });
    console.log('-'.repeat(80));

    // Generate REPORT format
    console.log('\nREPORT:');
    console.log(`Persona: Jason - Impulsive`);
    console.log(`Turns: ${turnCount}`);
    console.log(`Final Step: ${currentStep}`);
    console.log(`Trial Link: ${currentStep >= 14 ? 'YES' : 'NO'}`);
    console.log(`Issues: ${turnCount > 16 ? 'Too many turns' : 'None'}`);
    console.log(`Status: ${currentStep >= 14 ? 'SUCCESS' : 'STUCK'}`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

testJasonPersona();
