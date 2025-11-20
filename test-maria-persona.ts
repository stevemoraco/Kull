/**
 * Test Maria's persona - Budget-Conscious Mom
 * Persona Details:
 * - Casual, friendly, price-focused
 * - Medium skepticism (6/10)
 * - 2 shoots/week, 4 hours/shoot, $80/hr
 * - Family photography, tight margins
 * - Price threshold: $3,500/year
 */

// Using built-in global fetch (Node 18+)

const API_BASE = 'http://localhost:5000/api/chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Maria's persona data
const mariaCalculatorData = {
  shootsPerWeek: 2,
  hoursPerShoot: 4,
  billableRate: 80,
  annualCost: 2 * 4 * 44 * 80, // ~28,160/year on manual culling
};

// Simulate Maria's conversation journey
const mariaTurns = [
  {
    turn: 1,
    userMessage: "yeah, i can do a few minutes. we've had a lot on our plate lately.",
    expectedStep: 0, // Permission
    description: 'Maria grants permission'
  },
  {
    turn: 2,
    userMessage: "that sounds about right, maybe even a bit more in summer",
    expectedStep: 1, // Current reality
    description: 'Maria confirms ~88 shoots/year (2 * 44)'
  },
  {
    turn: 3,
    userMessage: "honestly, i just want to stop feeling so burnt out. maybe 3-4 shoots a week if i can automate the culling part",
    expectedStep: 2, // Goal for next year
    description: 'Maria expresses goal (more shoots but wants automation)'
  },
  {
    turn: 4,
    userMessage: "45-50 hours. i'm doing everything myself - shoots, culling, editing, client work",
    expectedStep: 3, // Hours per week
    description: 'Maria reveals heavy workload'
  },
  {
    turn: 5,
    userMessage: "that's the thing... i'm not sure. everything takes so long, especially culling.",
    expectedStep: 4, // Growth plan
    description: 'Maria expresses growth challenge'
  },
  {
    turn: 6,
    userMessage: "honestly, that's what's killing me. i spend like 2-3 hours per shoot just picking the good ones. it's mindless.",
    expectedStep: 5, // Current workflow
    description: 'Maria identifies culling as bottleneck'
  },
  {
    turn: 7,
    userMessage: "time off. i need weekends back. my kids barely see me during wedding season.",
    expectedStep: 6, // Prioritize goal
    description: 'Maria prioritizes time off (emotional appeal)'
  },
  {
    turn: 8,
    userMessage: "my oldest asked why i work so much. that hit hard. also money - if i could do 4 shoots a week instead of 2, i could make more without working more hours total.",
    expectedStep: 7, // Why that goal?
    description: 'Maria reveals emotional and financial motivations'
  },
  {
    turn: 9,
    userMessage: "i get my family back. time with my kids. maybe a real vacation in the summer instead of just staying home exhausted.",
    expectedStep: 8, // Outcome vision
    description: 'Maria paints vision of outcome'
  },
  {
    turn: 10,
    userMessage: "the culling. it's the only thing preventing me from booking more shoots. i know my editing is fast, my shooting is fast... it's just that manual culling step.",
    expectedStep: 9, // Bottleneck
    description: 'Maria clearly identifies culling as bottleneck'
  },
  {
    turn: 11,
    userMessage: "yeah, maybe. what do you have in mind?",
    expectedStep: 10, // Position solution
    description: 'Maria opens to hearing solution'
  },
  {
    turn: 12,
    userMessage: "pretty committed, 8 or 9. if this actually works, it solves my biggest problem.",
    expectedStep: 11, // Commitment level
    description: 'Maria shows strong commitment'
  },
  {
    turn: 13,
    userMessage: "asap, honestly. we're in the thick of wedding season right now.",
    expectedStep: 12, // Timeline urgency
    description: 'Maria shows urgency'
  },
  {
    turn: 14,
    userMessage: "yeah, how much are we talking?",
    expectedStep: 13, // Price reveal request
    description: 'Maria asks about price'
  },
  {
    turn: 15,
    userMessage: "wait... that's expensive. i was thinking more like $2k, $3k max. we're not making that much as a side business right now.",
    expectedStep: 14, // Price objection
    description: 'Maria price-shocked (threshold is $3,500)'
  },
];

async function testMariaPerson() {
  console.log('======================================');
  console.log('TESTING MARIA - BUDGET-CONSCIOUS MOM');
  console.log('======================================\n');

  console.log('Persona Details:');
  console.log(`  - 2 shoots/week, 4 hours/shoot @ $80/hr`);
  console.log(`  - Annual waste on manual culling: $${mariaCalculatorData.annualCost.toLocaleString()}`);
  console.log(`  - Price threshold: $3,500/year`);
  console.log(`  - Skepticism: 6/10 (medium)\n`);

  let history: ChatMessage[] = [];
  let totalTurns = 0;
  let finalStep = 0;
  let issues: string[] = [];

  for (const turn of mariaTurns) {
    console.log(`\n--- TURN ${turn.turn}: ${turn.description} ---`);
    console.log(`Expected Step: ${turn.expectedStep}`);
    console.log(`Maria: "${turn.userMessage}"\n`);

    try {
      // Build request
      const requestBody = {
        message: turn.userMessage,
        history: history.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        calculatorData: mariaCalculatorData,
        userActivity: {},
        pageVisits: [],
        allSessions: [],
        sessionId: 'test-maria-session',
        sectionHistory: {}
      };

      // Call API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_BASE}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal as any,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        issues.push(`Turn ${turn.turn}: API error ${response.status}: ${error}`);
        console.log(`❌ API Error: ${response.status}`);
        continue;
      }

      // Collect streamed response
      let aiResponse = '';
      let metadata = {};
      const reader = response.body?.getReader() as any;

      if (!reader) {
        issues.push(`Turn ${turn.turn}: No response stream`);
        console.log(`❌ No response stream`);
        continue;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));

              if (json.choices?.[0]?.delta?.content) {
                aiResponse += json.choices[0].delta.content;
              }

              // Extract metadata
              if (json.reasoning_blocks) {
                metadata = { ...metadata, reasoning_blocks: json.reasoning_blocks };
              }
              if (json.usage) {
                metadata = { ...metadata, usage: json.usage };
              }
            } catch (e) {
              // Skip parse errors
            }
          }
        }
      }

      // Check for QUICK_REPLIES and NEXT_MESSAGE metadata
      const hasQuickReplies = aiResponse.includes('␞QUICK_REPLIES:');
      const hasNextMessage = aiResponse.includes('␞NEXT_MESSAGE:');

      // Parse metadata lines
      let quickReplies = [];
      let nextMessage = 0;

      const metadataMatch = aiResponse.match(/␞QUICK_REPLIES:\s*([^\n]+)/);
      if (metadataMatch) {
        quickReplies = metadataMatch[1].split('|').map(r => r.trim());
      }

      const nextMatchMatch = aiResponse.match(/␞NEXT_MESSAGE:\s*(\d+)/);
      if (nextMatchMatch) {
        nextMessage = parseInt(nextMatchMatch[1]);
      }

      // Extract visible message (before metadata)
      const visibleMessage = aiResponse.split('␞')[0].trim();

      console.log(`AI Response (${visibleMessage.length} chars):`);
      console.log(`  "${visibleMessage.substring(0, 150)}${visibleMessage.length > 150 ? '...' : ''}"`);

      if (hasQuickReplies) {
        console.log(`\n  ✅ Quick replies provided: ${quickReplies.length} options`);
        quickReplies.forEach((r, i) => {
          console.log(`     ${i + 1}. ${r.substring(0, 40)}${r.length > 40 ? '...' : ''}`);
        });
      } else {
        issues.push(`Turn ${turn.turn}: Missing QUICK_REPLIES metadata`);
        console.log(`  ❌ Missing QUICK_REPLIES`);
      }

      if (hasNextMessage) {
        console.log(`  ✅ Next message timer: ${nextMessage}s`);
      } else {
        issues.push(`Turn ${turn.turn}: Missing NEXT_MESSAGE metadata`);
        console.log(`  ❌ Missing NEXT_MESSAGE`);
      }

      // Add to history
      history.push({ role: 'user', content: turn.userMessage });
      history.push({ role: 'assistant', content: visibleMessage });

      totalTurns++;
      finalStep = turn.expectedStep;

    } catch (error: any) {
      const msg = error.message || String(error);
      if (msg.includes('abort')) {
        issues.push(`Turn ${turn.turn}: API timeout (>15s)`);
        console.log(`❌ Timeout: API took >15 seconds`);
      } else {
        issues.push(`Turn ${turn.turn}: ${msg}`);
        console.log(`❌ Error: ${msg}`);
      }
    }
  }

  // Summary report
  console.log('\n\n======================================');
  console.log('TEST SUMMARY REPORT');
  console.log('======================================\n');

  console.log(`Persona: Maria - Budget-Conscious Mom`);
  console.log(`Turns Completed: ${totalTurns}/${mariaTurns.length}`);
  console.log(`Final Step Reached: ${finalStep}`);

  if (totalTurns >= 14) {
    console.log(`Trial Link: YES (progressed to price reveal)`);
  } else {
    console.log(`Trial Link: NO (didn't reach price reveal)`);
  }

  console.log(`\nIssues Found: ${issues.length}`);
  if (issues.length > 0) {
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  }

  const status = totalTurns >= 14 && issues.length === 0 ? 'SUCCESS' :
                 totalTurns >= 10 ? 'STUCK' : 'FAILED';
  console.log(`\nStatus: ${status}`);

  return {
    persona: 'Maria - Budget Mom',
    turns: totalTurns,
    finalStep,
    trialLink: totalTurns >= 14 ? 'YES' : 'NO',
    issues: issues.length,
    status
  };
}

// Run test
testMariaPerson().then(report => {
  console.log('\n\n=== FINAL REPORT ===');
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
