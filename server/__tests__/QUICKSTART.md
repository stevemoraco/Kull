# Quick Start Guide - Sales Conversation E2E Testing

## TL;DR

This framework simulates 20 different photographer personas having sales conversations with your AI to test if it can achieve an 80-90% close rate.

## 5-Minute Setup

### 1. Set Your API Key
```bash
export OPENAI_API_KEY="sk-..."
```

### 2. Run the Tests
```bash
# Test first 5 personas (faster)
npm test -- salesConversationE2E --run

# Test all 20 personas (comprehensive)
npm test -- salesConversationE2E --run --timeout=3600000
```

### 3. Review Results
Look for:
- ✅ **Close Rate:** Should be 80-90%
- ✅ **Issues:** Should be 0 or minimal
- ❌ **Failed Personas:** Review transcripts to understand why

## What You Get

### Instant Feedback on:
1. **Sales Script Quality** - Does it guide conversations effectively?
2. **Persona Handling** - Can it adapt to different personality types?
3. **Issue Detection** - Are there loops, repetitions, or breakdowns?
4. **Close Rate** - What % of conversations end with trial signup?

### Sample Output:
```
================================================================================
FINAL RESULTS
================================================================================
Close Rate: 85.0% (17/20)
Average Turns: 24.3
Average Time: 45.2s
================================================================================

FAILURE ANALYSIS:

1. Mike - Skeptical Portrait Photographer
   Final Step: 9/16
   Issues: Repeated question: "how many hours..."
   Sentiment: frustrated

2. Chris - Tire Kicker
   Final Step: 6/16
   Issues: Infinite loop detected
   Sentiment: neutral
```

## The 20 Test Personas

### Easy to Close (Skepticism <5)
1. **Sarah** - Hot lead, ready to buy
2. **David** - High-volume commercial, needs speed
3. **Lisa** - ROI-focused optimizer
4. **Jason** - Impulsive early adopter
5. **Kevin** - Time-starved studio owner

### Moderate (Skepticism 5-7)
6. **Jessica** - Price-sensitive newbie
7. **Emily** - Part-time weekend warrior
8. **Amanda** - Detail-oriented perfectionist
9. **Eric** - Corporate event photographer
10. **Natalie** - Multi-niche hustler
11. **Brandon** - Tech-savvy power user
12. **Alicia** - Destination wedding specialist

### Difficult to Close (Skepticism >7)
13. **Mike** - Skeptical, burned by AI before
14. **Chris** - Tire kicker, just browsing
15. **Tom** - Burned by software before
16. **Rachel** - Overthinking analyst
17. **Greg** - Old-school, resistant to change
18. **Melissa** - Budget-conscious mom
19. **Stephanie** - Lifestyle influencer
20. **Ryan** - Niche sports photographer

## Common Issues & Fixes

### Issue: Low Close Rate (<80%)
**Symptoms:** Many personas don't reach step 14-15  
**Fix:** Review sales script prompts, check if too aggressive or passive

### Issue: Repeated Questions
**Symptoms:** Same question asked 2+ times  
**Fix:** Check conversation state management

### Issue: Infinite Loops
**Symptoms:** Stuck on same step for 5+ turns  
**Fix:** Review step validation logic

### Issue: Customer Frustration
**Symptoms:** Sentiment tracking shows frustrated customers  
**Fix:** Analyze transcripts, adjust tone and pacing

## File Structure

```
server/__tests__/
├── salesConversationE2E.test.ts       # Main test (1,063 lines)
├── salesConversationE2E.README.md    # Full documentation
└── QUICKSTART.md                      # This file
```

## Next Steps After First Run

1. **Review Transcripts** - Read conversations that failed
2. **Identify Patterns** - What persona types struggle most?
3. **Adjust Prompts** - Optimize based on failure analysis
4. **Re-run Tests** - Verify improvements
5. **Track Trends** - Monitor close rate over time

## Pro Tips

- Start with first 5 personas to iterate quickly
- Run full suite before major releases
- Track close rate trends in CI/CD
- Use transcripts to train new sales team members
- Add new personas based on real customer data

## Need Help?

1. Read `/server/__tests__/salesConversationE2E.README.md`
2. Review conversation transcripts in test output
3. Check issue detection logs
4. Examine persona traits vs outcomes

---

**Time to first test:** 2 minutes  
**Time for full suite:** 10-15 minutes  
**Value:** Confidence your sales AI actually works
