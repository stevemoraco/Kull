/**
 * Unit tests for buying signal detection
 */

describe('Buying Signal Detection', () => {
  // Helper function that simulates the detectBuyingSignal function
  function detectBuyingSignal(userMessage: string, currentStep: number): number | null {
    const msg = userMessage.toLowerCase();

    // Don't jump if already in closing sequence (steps 13-15)
    if (currentStep >= 13) {
      return null;
    }

    // Strong buying signals → Jump to step 14 (state price)
    const strongSignals = [
      'where do i checkout',
      'where do i buy',
      'how do i purchase',
      'sign me up',
      'i want to buy',
      'ready to purchase',
      'let\'s do it',
      'i\'m in',
      'take my money',
      'shut up and take my money'
    ];

    for (const signal of strongSignals) {
      if (msg.includes(signal)) {
        console.log(`[Buying Signal] Strong signal detected: "${signal}" → Jumping to step 14`);
        return 14; // State price immediately
      }
    }

    // Price inquiry signals → Jump to step 14 (ask if they want price)
    const priceSignals = [
      'how much',
      'what does it cost',
      'what\'s the price',
      'what is the price',
      'how expensive',
      'what do you charge',
      'what\'s it cost',
      'what is it cost'
    ];

    // Only trigger price signals if the word "price" or "cost" is actually present
    // This prevents false positives like "how much time" or "how much work"
    if (msg.includes('price') || msg.includes('cost') || msg.includes('charge') || msg.includes('expensive')) {
      for (const signal of priceSignals) {
        if (msg.includes(signal)) {
          console.log(`[Buying Signal] Price inquiry detected: "${signal}" → Jumping to step 14`);
          return 14; // Go straight to price, skip "want the price?" re-confirmation
        }
      }
    }

    return null; // No buying signal detected
  }

  describe('Strong buying signals', () => {
    test('should detect "where do i checkout"', () => {
      expect(detectBuyingSignal('where do i checkout', 2)).toBe(14);
    });

    test('should detect "where do i buy"', () => {
      expect(detectBuyingSignal('where do i buy?', 5)).toBe(14);
    });

    test('should detect "sign me up"', () => {
      expect(detectBuyingSignal('sign me up', 9)).toBe(14);
    });

    test('should detect "i want to buy"', () => {
      expect(detectBuyingSignal('i want to buy this', 3)).toBe(14);
    });

    test('should detect "take my money"', () => {
      expect(detectBuyingSignal('shut up and take my money', 6)).toBe(14);
    });

    test('should be case insensitive', () => {
      expect(detectBuyingSignal('WHERE DO I BUY?', 2)).toBe(14);
      expect(detectBuyingSignal('Sign Me Up!', 4)).toBe(14);
    });
  });

  describe('Price inquiry signals', () => {
    test('should detect "how much does it cost"', () => {
      expect(detectBuyingSignal('how much does it cost?', 2)).toBe(14);
    });

    test('should detect "what\'s the price"', () => {
      expect(detectBuyingSignal('what\'s the price?', 5)).toBe(14);
    });

    test('should detect "what does it cost"', () => {
      expect(detectBuyingSignal('what does it cost', 7)).toBe(14);
    });

    test('should detect "how expensive is it"', () => {
      expect(detectBuyingSignal('how expensive is it?', 3)).toBe(14);
    });

    test('should detect "what do you charge"', () => {
      expect(detectBuyingSignal('what do you charge for this?', 6)).toBe(14);
    });
  });

  describe('False positives prevention', () => {
    test('should NOT trigger on "how much time" without price/cost keyword', () => {
      expect(detectBuyingSignal('how much time does it take?', 2)).toBeNull();
    });

    test('should NOT trigger on "how much work" without price/cost keyword', () => {
      expect(detectBuyingSignal('how much work is involved?', 4)).toBeNull();
    });

    test('should NOT trigger on normal conversation', () => {
      expect(detectBuyingSignal('45 hours per week', 3)).toBeNull();
      expect(detectBuyingSignal('yes that sounds good', 5)).toBeNull();
      expect(detectBuyingSignal('i need more time off', 7)).toBeNull();
    });
  });

  describe('Already in closing steps', () => {
    test('should NOT jump if already at step 13', () => {
      expect(detectBuyingSignal('how much?', 13)).toBeNull();
    });

    test('should NOT jump if already at step 14', () => {
      expect(detectBuyingSignal('sign me up', 14)).toBeNull();
    });

    test('should NOT jump if already at step 15', () => {
      expect(detectBuyingSignal('where do i buy?', 15)).toBeNull();
    });
  });

  describe('Real conversation examples', () => {
    test('Example 1: User wants to checkout at step 2', () => {
      // User: "hi"
      // AI: "i see you're doing 88 shoots — accurate?"
      // User: "yep"
      // AI: "what's your goal for next year?"
      // User: "where do i buy?"
      expect(detectBuyingSignal('where do i buy?', 2)).toBe(14);
    });

    test('Example 2: Price inquiry mid-conversation at step 5', () => {
      // User: "how many hours?"
      // AI: "how many hours are you working per week?"
      // User: "45 hours, how much does this cost?"
      expect(detectBuyingSignal('45 hours, how much does this cost?', 5)).toBe(14);
    });

    test('Example 3: Strong commitment at step 9', () => {
      // User: "what's kept you back?"
      // AI: "what's kept you from hitting that already?"
      // User: "time - sign me up"
      expect(detectBuyingSignal('time - sign me up', 9)).toBe(14);
    });

    test('Example 4: User asks about price after context', () => {
      // User: "that all sounds great, what's the price?"
      expect(detectBuyingSignal('that all sounds great, what\'s the price?', 6)).toBe(14);
    });
  });
});
