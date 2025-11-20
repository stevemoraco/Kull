#!/bin/bash

# E2E Test: Jessica - Price-Sensitive Newbie Persona
# Tests the full conversation flow with a price-conscious photographer

SESSION_ID="test-jessica-$(date +%s)"
echo "=== E2E TEST: JESSICA - PRICE-SENSITIVE NEWBIE ==="
echo "Session ID: $SESSION_ID"
echo ""

# Test data for Jessica
# - 1 shoot/week, 6 hours/shoot, $50/hr = $300/week waste
# - Annual: 44 shoots, 264 hours wasted, $13,200 annual cost from manual culling
CALCULATOR_DATA='{
  "shootsPerWeek": 1,
  "hoursPerShoot": 6,
  "billableRate": 50,
  "annualCost": 13200,
  "weeksPerYear": 44
}'

# Mock user activity (browsing behavior)
USER_ACTIVITY='[
  {"type": "click", "element": "calculator", "timestamp": 1700000000},
  {"type": "scroll", "section": "calculator", "time": 180000},
  {"type": "input", "field": "shootsPerWeek", "value": "1", "timestamp": 1700000180},
  {"type": "input", "field": "hoursPerShoot", "value": "6", "timestamp": 1700000190},
  {"type": "input", "field": "billableRate", "value": "50", "timestamp": 1700000200}
]'

# Section timing (Jessica spent a lot of time on the calculator)
SECTION_HISTORY='[
  {"section": "calculator", "timeSpent": 180000, "visited": true},
  {"section": "features", "timeSpent": 45000, "visited": true},
  {"section": "pricing", "timeSpent": 0, "visited": false}
]'

echo "Step 1: POST /api/chat/welcome (Initial context and welcome greeting)"
echo "---"

WELCOME_RESPONSE=$(curl -s -X POST http://localhost:5000/api/chat/welcome \
  -H "Content-Type: application/json" \
  -d "{
    \"context\": {
      \"timeOnSite\": 360000,
      \"currentPath\": \"/\",
      \"device\": \"Desktop\",
      \"browser\": \"Chrome\"
    },
    \"history\": [],
    \"sessionId\": \"$SESSION_ID\",
    \"calculatorData\": $CALCULATOR_DATA,
    \"sectionHistory\": $SECTION_HISTORY,
    \"currentTime\": $(date +%s)000
  }")

echo "Response:"
echo "$WELCOME_RESPONSE" | jq '.' 2>/dev/null || echo "$WELCOME_RESPONSE"
echo ""
echo "---"
echo ""

# Extract first message from welcome response
WELCOME_MESSAGE=$(echo "$WELCOME_RESPONSE" | jq -r '.message // .response // empty' 2>/dev/null)

if [ -z "$WELCOME_MESSAGE" ]; then
  echo "ERROR: No welcome message received"
  exit 1
fi

echo "Welcome message received:"
echo "$WELCOME_MESSAGE"
echo ""
echo "---"
echo ""

# Step 2: Send first user message - Jessica asks about cost
echo "Step 2: POST /api/chat/message (Turn 1: User asks about pricing)"
echo "---"

CONVERSATION_HISTORY="[
  {\"role\": \"assistant\", \"content\": \"$WELCOME_MESSAGE\"}
]"

USER_MESSAGE_1="wait, before we get started - is this going to be expensive? i'm just starting out and my budget is tight. what's the pricing like?"

MESSAGE_RESPONSE_1=$(curl -s -X POST http://localhost:5000/api/chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"$USER_MESSAGE_1\",
    \"history\": $CONVERSATION_HISTORY,
    \"userActivity\": $USER_ACTIVITY,
    \"sessionId\": \"$SESSION_ID\",
    \"calculatorData\": $CALCULATOR_DATA,
    \"sectionHistory\": $SECTION_HISTORY,
    \"currentTime\": $(date +%s)000,
    \"timezone\": \"America/Los_Angeles\",
    \"currentPath\": \"/\"
  }")

echo "User: $USER_MESSAGE_1"
echo ""
echo "Response stream:"
echo "$MESSAGE_RESPONSE_1" | head -500

# Extract assistant response from streaming JSON
ASSISTANT_RESPONSE_1=$(echo "$MESSAGE_RESPONSE_1" | grep -o 'data: {.*}' | head -20 | grep -o '"content":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "Assistant response (extracted):"
echo "$ASSISTANT_RESPONSE_1"
echo ""
echo "---"
echo ""

# Step 3: Send confirmation response
echo "Step 3: POST /api/chat/message (Turn 2: User confirms their needs)"
echo "---"

CONVERSATION_HISTORY="[
  {\"role\": \"assistant\", \"content\": \"$WELCOME_MESSAGE\"},
  {\"role\": \"user\", \"content\": \"$USER_MESSAGE_1\"},
  {\"role\": \"assistant\", \"content\": \"$ASSISTANT_RESPONSE_1\"}
]"

USER_MESSAGE_2="yeah, 44 shoots a year sounds about right. I'm doing about 1 shoot a week, spending 6 hours culling each one. It's eating up so much time and I'm only charging $50 an hour so the math on that cost seems right"

MESSAGE_RESPONSE_2=$(curl -s -X POST http://localhost:5000/api/chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"$USER_MESSAGE_2\",
    \"history\": $CONVERSATION_HISTORY,
    \"userActivity\": $USER_ACTIVITY,
    \"sessionId\": \"$SESSION_ID\",
    \"calculatorData\": $CALCULATOR_DATA,
    \"sectionHistory\": $SECTION_HISTORY,
    \"currentTime\": $(date +%s)000,
    \"timezone\": \"America/Los_Angeles\",
    \"currentPath\": \"/\"
  }")

echo "User: $USER_MESSAGE_2"
echo ""
echo "Response stream (first 500 chars):"
echo "$MESSAGE_RESPONSE_2" | head -500

echo ""
echo "---"
echo ""

# Summary report
echo "TEST REPORT: Jessica - Price-Sensitive Newbie"
echo "=============================================="
echo ""
echo "Persona: Jessica"
echo "Profile:"
echo "  - 1 shoot/week × 44 weeks = 44 shoots/year"
echo "  - 6 hours/shoot on culling"
echo "  - \$50/hr billable rate"
echo "  - Annual waste: 44 × 6 × 50 = \$13,200/year"
echo "  - Price threshold: \$2,500/year"
echo "  - Skepticism level: 5/10 (medium)"
echo ""
echo "Test Execution:"
echo "  - Welcome endpoint: CALLED"
echo "  - Message endpoint: CALLED (Turn 1 - Price question)"
echo "  - Message endpoint: CALLED (Turn 2 - Confirmation)"
echo ""
echo "Expected Behavior:"
echo "  1. Welcome should acknowledge calculator values"
echo "  2. Response to price question should be conversational"
echo "  3. Should skip repeated questions about annual shoots"
echo "  4. Should move through script steps sequentially"
echo ""
echo "Session Log:"
echo "  Session ID: $SESSION_ID"
echo "  Turns completed: 2"
echo "  Status: In Progress"
echo ""
