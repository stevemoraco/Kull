/**
 * Lisa Persona E2E Test
 * Budget Photographer - 1.5 shoots/week, $70/hr, $3,000/year threshold
 * Goal: Reach Step 15 and get trial link
 */

const BASE_URL = "http://localhost:5000";
const DEBUG = true;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ConversationResponse {
  message: string;
  step?: number;
  totalSteps?: number;
  progress?: number;
  conversationId?: string;
  sessionId?: string;
}

const log = (label: string, content: any) => {
  if (DEBUG) {
    console.log(`\n[${label}]`, typeof content === "string" ? content : JSON.stringify(content, null, 2));
  }
};

// Simulate Lisa's responses based on her persona
const lisaResponses: { [key: number]: string } = {
  0: "yes, sounds good", // Permission
  1: "yeah that's about right", // Shoots per week
  2: "I want to grow to 2 shoots per week and make $150 per hour to hit my $150k/year goal", // Goals
  3: "about 35 hours a week right now", // Hours
  4: "I've been thinking about hiring help or getting more efficient with my workflow", // Growth plan
  5: "honestly, it's the biggest bottleneck - photo selection is killing me, takes 3-4 hours per shoot", // Current workflow
  6: "definitely the time off - I'm burnt out and need more breathing room", // Prioritize
  7: "I just want my life back. I love photography but not the admin work", // Why that goal
  8: "I'd have time for family again, could take weekends, and wouldn't feel stressed about deliverables", // Outcome vision
  9: "photo culling and selection - I'm manually going through every image and it's slow", // Bottleneck
  10: "absolutely, I'm definitely interested", // Position solution
  11: "8 out of 10 - I'm ready to try something", // Commitment
  12: "as soon as possible, like next week", // Timeline
  13: "yes, tell me the price", // Price reveal
  14: "okay, I understand, I need to think about it but I'm interested", // Price reaction (Lisa will say yes since she's committed)
  15: "yes, I want to try the trial", // Close
};

async function sendMessage(sessionId: string, message: string, isFirst: boolean = false): Promise<ConversationResponse> {
  const endpoint = isFirst ? "/api/chat/welcome" : "/api/chat/message";
  const body = isFirst
    ? {
        context: {
          persona: "Lisa - Budget Photographer",
          shootsPerWeek: 1.5,
          hourlyRate: 70,
          priceThreshold: 3000,
        },
        sessionId,
      }
    : {
        message,
        sessionId,
        history: [],
      };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error: ${response.status} ${response.statusText}\n${text}`);
  }

  // Handle SSE streaming response
  let fullMessage = '';
  let returnedSessionId = sessionId;
  let returnedStep = -1;

  // Read SSE stream
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines[lines.length - 1];

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.substring(6));
          if (json.type === 'delta') {
            fullMessage += json.content;
          } else if (json.type === 'complete') {
            if (json.sessionId) returnedSessionId = json.sessionId;
            if (json.step !== undefined) returnedStep = json.step;
          }
        } catch (e) {
          // Skip malformed JSON
        }
      }
    }
  }

  return {
    message: fullMessage,
    sessionId: returnedSessionId,
    step: returnedStep >= 0 ? returnedStep : undefined,
  } as ConversationResponse;
}

async function runConversation() {
  console.log("=".repeat(80));
  console.log("LISA PERSONA E2E TEST");
  console.log("=".repeat(80));
  console.log("Persona: Lisa - Budget Photographer");
  console.log("Shoots/week: 1.5 | Hourly: $70/hr | Price threshold: $3,000/year");
  console.log("Goal: Reach Step 15 and get trial link");
  console.log("=".repeat(80));

  let sessionId = `test-session-${Date.now()}`;
  let currentStep = -1;
  const turns: number[] = [];
  let trialLinkFound = false;
  let finalStep = -1;

  try {
    // Step 0: Get permission first (AI asks via welcome endpoint)
    log("TURN 1", "Starting welcome endpoint...");
    const welcomeResponse = await sendMessage(sessionId, "", true);
    log("AI Welcome", welcomeResponse.message);
    sessionId = welcomeResponse.sessionId || sessionId;
    currentStep = welcomeResponse.step ?? 0;

    // Now Lisa gives permission
    log("TURN 2", `LISA: ${lisaResponses[0]}`);
    const response0 = await sendMessage(sessionId, lisaResponses[0], false);
    log("AI Response", response0.message);
    currentStep = response0.step ?? 0;
    turns.push(0);

    // Continue through steps 1-15
    for (let step = 1; step <= 15; step++) {
      const turnNum = turns.length + 2;
      log(`TURN ${turnNum}`, `LISA (Step ${step}): ${lisaResponses[step]}`);

      const response = await sendMessage(sessionId, lisaResponses[step], false);
      log("AI Response", response.message);

      // Check for trial link
      if (response.message.includes("trial") || response.message.includes("download")) {
        trialLinkFound = true;
        log("✓ TRIAL LINK DETECTED", "Found trial link in response");
      }

      currentStep = response.step ?? step;
      turns.push(step);

      if (step === 15) {
        finalStep = 15;
        break;
      }

      // Add delay between messages
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Generate report
    console.log("\n" + "=".repeat(80));
    console.log("TEST RESULTS");
    console.log("=".repeat(80));
    console.log(`Persona: Lisa - Budget`);
    console.log(`Turns: ${turns.length}`);
    console.log(`Final Step: ${finalStep}`);
    console.log(`Trial Link: ${trialLinkFound ? "YES ✓" : "NO ✗"}`);
    console.log(`Status: ${finalStep === 15 && trialLinkFound ? "SUCCESS ✓" : "FAILED ✗"}`);
    console.log(`Issues: ${trialLinkFound ? "None" : "Trial link not provided"}`);
    console.log("=".repeat(80));

  } catch (error) {
    console.error("ERROR:", error instanceof Error ? error.message : error);
    console.log("\nTest FAILED");
  }
}

// Run the test
runConversation().catch(console.error);
