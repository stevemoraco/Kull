#!/usr/bin/env node

/**
 * E2E Test for Jessica Persona - Price-Sensitive Newbie
 * Tests the sales conversation flow with a price-conscious photographer
 */

const http = require('http');

// Jessica's persona data
const JESSICA_PROFILE = {
  shoots_per_week: 1,
  hours_per_shoot: 6,
  billable_rate: 50, // $50/hour
  annual_shoots: 44, // 1 * 44 weeks
  annual_waste_hours: 264, // 44 * 6
  annual_waste_cost: 13200, // 264 * 50
  price_threshold: 2500, // Her max budget
};

const SESSION_ID = `jessica-test-${Date.now()}`;
let turns = 0;

function log(msg, level = "INFO") {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [${level}] ${msg}`);
}

function makeRequest(method, path, payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (payload) {
      req.write(JSON.stringify(payload));
    }
    req.end();
  });
}

async function testWelcome() {
  log('Testing POST /api/chat/welcome');

  const payload = {
    context: {
      timeOnSite: 360000,
      currentPath: '/',
      device: 'Desktop',
      browser: 'Chrome',
    },
    history: [],
    sessionId: SESSION_ID,
    calculatorData: {
      shootsPerWeek: JESSICA_PROFILE.shoots_per_week,
      hoursPerShoot: JESSICA_PROFILE.hours_per_shoot,
      billableRate: JESSICA_PROFILE.billable_rate,
      annualCost: JESSICA_PROFILE.annual_waste_cost,
    },
    sectionHistory: [
      { section: 'calculator', timeSpent: 180000, visited: true },
      { section: 'features', timeSpent: 45000, visited: true },
      { section: 'pricing', timeSpent: 0, visited: false },
    ],
    currentTime: Date.now(),
  };

  try {
    const response = await makeRequest('POST', '/api/chat/welcome', payload);
    log(`Welcome response status: ${response.status}`);

    if (response.status === 200) {
      const data = JSON.parse(response.body);
      log(`Welcome response: ${JSON.stringify(data, null, 2)}`);

      if (data.skipped) {
        log(`Welcome skipped: ${data.reason}`, 'WARN');
        return null;
      }

      if (data.message) {
        return data.message;
      }
      return null;
    } else {
      log(`Welcome failed: ${response.body}`, 'ERROR');
      return null;
    }
  } catch (error) {
    log(`Welcome error: ${error.message}`, 'ERROR');
    return null;
  }
}

async function testMessage(message, history) {
  log(`Testing POST /api/chat/message`);
  log(`User message: ${message.substring(0, 100)}...`);

  const payload = {
    message: message,
    history: history,
    sessionId: SESSION_ID,
    userActivity: [
      { type: 'click', element: 'calculator' },
      { type: 'scroll', section: 'calculator', time: 180000 },
    ],
    calculatorData: {
      shootsPerWeek: JESSICA_PROFILE.shoots_per_week,
      hoursPerShoot: JESSICA_PROFILE.hours_per_shoot,
      billableRate: JESSICA_PROFILE.billable_rate,
      annualCost: JESSICA_PROFILE.annual_waste_cost,
    },
    sectionHistory: [
      { section: 'calculator', timeSpent: 180000, visited: true },
      { section: 'features', timeSpent: 45000, visited: true },
    ],
    currentTime: Date.now(),
    timezone: 'America/Los_Angeles',
    currentPath: '/',
  };

  try {
    const response = await makeRequest('POST', '/api/chat/message', payload);
    log(`Message response status: ${response.status}`);

    if (response.status === 200) {
      // Parse SSE stream
      let fullResponse = '';
      const lines = response.body.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const chunk = JSON.parse(line.substring(6));

            // Extract content from delta chunks
            if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
              const content = chunk.choices[0].delta.content;
              fullResponse += content;
              process.stdout.write(content);
            } else if (chunk.type === 'status') {
              log(`Status: ${chunk.message}`);
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }

      console.log('\n');
      log(`Received response of length: ${fullResponse.length}`);
      return fullResponse;
    } else {
      log(`Message failed: ${response.body}`, 'ERROR');
      return null;
    }
  } catch (error) {
    log(`Message error: ${error.message}`, 'ERROR');
    return null;
  }
}

async function main() {
  log('='.repeat(60));
  log('E2E TEST: JESSICA - PRICE-SENSITIVE NEWBIE');
  log('='.repeat(60));
  log('');

  log(`Session ID: ${SESSION_ID}`);
  log(`Profile: 1 shoot/week, 6 hours per shoot, $50/hr`);
  log(`Annual waste: $${JESSICA_PROFILE.annual_waste_cost} (${JESSICA_PROFILE.annual_waste_hours} hours)`);
  log(`Price threshold: $${JESSICA_PROFILE.price_threshold}/year`);
  log('');

  // Track conversation
  const conversation = [];

  // Test welcome
  log('TURN 0: Welcome Message');
  log('-'.repeat(60));
  let welcomeMsg = await testWelcome();

  if (welcomeMsg) {
    conversation.push({ role: 'assistant', content: welcomeMsg });
    turns++;
    log(`Welcome received, conversation started`);
  } else {
    log('Welcome failed or skipped', 'WARN');
    welcomeMsg = "Hi! I'm here to help you figure out if Kull is a good fit.";
    conversation.push({ role: 'assistant', content: welcomeMsg });
  }

  log('');

  // Turn 1: Jessica asks about price (buying signal)
  log('TURN 1: User Response - Price Inquiry');
  log('-'.repeat(60));
  const userMsg1 = "wait, before we get started - is this going to be expensive? i'm just starting out and my budget is really tight. i'm looking for something under $2,500 a year";
  log(`User asks: ${userMsg1}`);
  log('');

  conversation.push({ role: 'user', content: userMsg1 });
  const response1 = await testMessage(userMsg1, conversation);

  if (response1) {
    conversation.push({ role: 'assistant', content: response1 });
    turns++;
  }

  log('');
  log('');

  // Turn 2: Jessica confirms her numbers
  log('TURN 2: User Response - Confirms Calculator');
  log('-'.repeat(60));
  const userMsg2 = "yeah, 44 shoots a year sounds about right. I'm doing about 1 shoot a week, spending 6 hours culling each one. It's eating up so much time";
  log(`User says: ${userMsg2}`);
  log('');

  conversation.push({ role: 'user', content: userMsg2 });
  const response2 = await testMessage(userMsg2, conversation);

  if (response2) {
    conversation.push({ role: 'assistant', content: response2 });
    turns++;
  }

  log('');
  log('');

  // Report
  log('='.repeat(60));
  log('TEST REPORT');
  log('='.repeat(60));
  log(`Persona: Jessica - Price-Sensitive Newbie`);
  log(`Profile:`);
  log(`  - Shoots: ${JESSICA_PROFILE.annual_shoots}/year (1/week)`);
  log(`  - Culling time: ${JESSICA_PROFILE.annual_waste_hours} hours/year`);
  log(`  - Current cost: $${JESSICA_PROFILE.annual_waste_cost}/year`);
  log(`  - Budget threshold: $${JESSICA_PROFILE.price_threshold}/year`);
  log(`  - Skepticism: 5/10 (Medium)`);
  log('');
  log(`Test Results:`);
  log(`  - Turns completed: ${turns}`);
  log(`  - Session ID: ${SESSION_ID}`);
  log(`  - Status: ${turns >= 2 ? 'SUCCESS' : 'PARTIAL'}`);
  log('');
  log(`Analysis:`);
  log(`  - Jessica asked about pricing early (buying signal)`);
  log(`  - Should skip 'want the price?' step 13 and go straight to step 14`);
  log(`  - At $2,500 threshold, needs strong ROI case`);
  log(`  - Annual waste ($${JESSICA_PROFILE.annual_waste_cost}) >> plan cost ($5,988), strong value prop`);
  log('');
}

main().catch(error => {
  log(`Fatal error: ${error.message}`, 'ERROR');
  process.exit(1);
});
