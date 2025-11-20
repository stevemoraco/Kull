#!/usr/bin/env python3
"""
E2E Test for Jessica Persona - Price-Sensitive Newbie
Tests the sales conversation flow with a price-conscious photographer
"""

import requests
import json
import time
from typing import Dict, List, Any

BASE_URL = "http://localhost:5000"

# Jessica's persona data
JESSICA_PROFILE = {
    "shoots_per_week": 1,
    "hours_per_shoot": 6,
    "billable_rate": 50,  # $50/hour
    "annual_shoots": 44,  # 1 * 44 weeks
    "annual_waste_hours": 264,  # 44 * 6
    "annual_waste_cost": 13200,  # 264 * 50
    "price_threshold": 2500,  # Her max budget
}

SESSION_ID = f"jessica-test-{int(time.time())}"

def log(msg: str, level: str = "INFO"):
    """Simple logging"""
    timestamp = time.strftime("%H:%M:%S")
    print(f"[{timestamp}] [{level}] {msg}")

def test_welcome() -> str:
    """Test the welcome endpoint"""
    log("Testing POST /api/chat/welcome")

    payload = {
        "context": {
            "timeOnSite": 360000,
            "currentPath": "/",
            "device": "Desktop",
            "browser": "Chrome"
        },
        "history": [],
        "sessionId": SESSION_ID,
        "calculatorData": {
            "shootsPerWeek": JESSICA_PROFILE["shoots_per_week"],
            "hoursPerShoot": JESSICA_PROFILE["hours_per_shoot"],
            "billableRate": JESSICA_PROFILE["billable_rate"],
            "annualCost": JESSICA_PROFILE["annual_waste_cost"]
        },
        "sectionHistory": [
            {"section": "calculator", "timeSpent": 180000, "visited": True},
            {"section": "features", "timeSpent": 45000, "visited": True},
            {"section": "pricing", "timeSpent": 0, "visited": False}
        ],
        "currentTime": int(time.time() * 1000)
    }

    try:
        response = requests.post(f"{BASE_URL}/api/chat/welcome", json=payload, timeout=10)
        log(f"Welcome response status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            log(f"Welcome response: {json.dumps(data, indent=2)}")

            if data.get("skipped"):
                log(f"Welcome skipped: {data.get('reason')}", "WARN")
                return None

            if data.get("message"):
                return data["message"]

            return None
        else:
            log(f"Welcome failed: {response.text}", "ERROR")
            return None
    except Exception as e:
        log(f"Welcome error: {str(e)}", "ERROR")
        return None

def test_message(message: str, history: List[Dict[str, str]]) -> str:
    """Test the message endpoint"""
    log(f"Testing POST /api/chat/message")
    log(f"User message: {message[:100]}...")

    payload = {
        "message": message,
        "history": history,
        "sessionId": SESSION_ID,
        "userActivity": [
            {"type": "click", "element": "calculator"},
            {"type": "scroll", "section": "calculator", "time": 180000}
        ],
        "calculatorData": {
            "shootsPerWeek": JESSICA_PROFILE["shoots_per_week"],
            "hoursPerShoot": JESSICA_PROFILE["hours_per_shoot"],
            "billableRate": JESSICA_PROFILE["billable_rate"],
            "annualCost": JESSICA_PROFILE["annual_waste_cost"]
        },
        "sectionHistory": [
            {"section": "calculator", "timeSpent": 180000, "visited": True},
            {"section": "features", "timeSpent": 45000, "visited": True}
        ],
        "currentTime": int(time.time() * 1000),
        "timezone": "America/Los_Angeles",
        "currentPath": "/"
    }

    try:
        response = requests.post(f"{BASE_URL}/api/chat/message", json=payload, timeout=15, stream=True)
        log(f"Message response status: {response.status_code}")

        if response.status_code == 200:
            # Parse SSE stream
            full_response = ""
            chunks_received = 0

            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8') if isinstance(line, bytes) else line

                    if line_str.startswith('data: '):
                        chunks_received += 1
                        try:
                            chunk = json.loads(line_str[6:])

                            # Extract content from delta chunks
                            if chunk.get('type') == 'content_delta' or (chunk.get('choices') and chunk['choices'][0].get('delta', {}).get('content')):
                                content = chunk.get('content') or chunk['choices'][0]['delta'].get('content', '')
                                if content:
                                    full_response += content
                                    print(content, end='', flush=True)
                            elif chunk.get('type') == 'status':
                                log(f"Status: {chunk.get('message')}")
                        except json.JSONDecodeError:
                            pass

            print()  # Newline after streaming response
            log(f"Received {chunks_received} chunks")
            return full_response
        else:
            log(f"Message failed: {response.text}", "ERROR")
            return None
    except Exception as e:
        log(f"Message error: {str(e)}", "ERROR")
        return None

def main():
    """Run the full test"""
    log("="*60)
    log("E2E TEST: JESSICA - PRICE-SENSITIVE NEWBIE")
    log("="*60)
    log("")

    log(f"Session ID: {SESSION_ID}")
    log(f"Profile: 1 shoot/week, 6 hours per shoot, $50/hr")
    log(f"Annual waste: ${JESSICA_PROFILE['annual_waste_cost']} ({JESSICA_PROFILE['annual_waste_hours']} hours)")
    log(f"Price threshold: ${JESSICA_PROFILE['price_threshold']}/year")
    log("")

    # Track conversation
    conversation = []
    turns = 0
    current_step = 0

    # Test welcome
    log("TURN 0: Welcome Message")
    log("-" * 60)
    welcome_msg = test_welcome()
    if welcome_msg:
        conversation.append({"role": "assistant", "content": welcome_msg})
        turns += 1
        log(f"Welcome received, conversation started")
    else:
        log("Welcome failed or skipped", "WARN")
        welcome_msg = "Hi! I'm here to help you figure out if Kull is a good fit."
        conversation.append({"role": "assistant", "content": welcome_msg})

    log("")

    # Turn 1: Jessica asks about price (buying signal)
    log("TURN 1: User Response - Price Inquiry")
    log("-" * 60)
    user_msg_1 = "wait, before we get started - is this going to be expensive? i'm just starting out and my budget is really tight. i'm looking for something under $2,500 a year"
    log(f"User asks: {user_msg_1}")
    log("")

    conversation.append({"role": "user", "content": user_msg_1})
    response_1 = test_message(user_msg_1, conversation)

    if response_1:
        conversation.append({"role": "assistant", "content": response_1})
        turns += 1

    log("")
    log("")

    # Turn 2: Jessica confirms her numbers
    log("TURN 2: User Response - Confirms Calculator")
    log("-" * 60)
    user_msg_2 = "yeah, 44 shoots a year sounds about right. I'm doing about 1 shoot a week, spending 6 hours culling each one. It's eating up so much time"
    log(f"User says: {user_msg_2}")
    log("")

    conversation.append({"role": "user", "content": user_msg_2})
    response_2 = test_message(user_msg_2, conversation)

    if response_2:
        conversation.append({"role": "assistant", "content": response_2})
        turns += 1

    log("")
    log("")

    # Turn 3: Ask about goals (Step 2)
    log("TURN 3: User Response - Goals")
    log("-" * 60)
    user_msg_3 = "I want to take on more shoots, maybe double to 2 per week, but without working twice as many hours. I also want more time off"
    log(f"User answers: {user_msg_3}")
    log("")

    conversation.append({"role": "user", "content": user_msg_3})
    response_3 = test_message(user_msg_3, conversation)

    if response_3:
        conversation.append({"role": "assistant", "content": response_3})
        turns += 1

    log("")
    log("")

    # Report
    log("="*60)
    log("TEST REPORT")
    log("="*60)
    log(f"Persona: Jessica - Price-Sensitive Newbie")
    log(f"Profile:")
    log(f"  - Shoots: {JESSICA_PROFILE['annual_shoots']}/year (1/week)")
    log(f"  - Culling time: {JESSICA_PROFILE['annual_waste_hours']} hours/year")
    log(f"  - Current cost: ${JESSICA_PROFILE['annual_waste_cost']}/year")
    log(f"  - Budget threshold: ${JESSICA_PROFILE['price_threshold']}/year")
    log(f"  - Skepticism: 5/10 (Medium)")
    log("")
    log(f"Test Results:")
    log(f"  - Turns completed: {turns}")
    log(f"  - Session ID: {SESSION_ID}")
    log(f"  - Status: {'SUCCESS' if turns >= 2 else 'PARTIAL'}")
    log("")
    log("Analysis:")
    log("  - Jessica asked about pricing early (buying signal)")
    log("  - Should skip 'want the price?' step 13 and go straight to step 14")
    log("  - At $2,500 threshold, needs strong ROI case")
    log("  - Annual waste ($13,200) >> plan cost ($5,988), strong value prop")
    log("")

if __name__ == "__main__":
    main()
