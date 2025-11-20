# Section Timing Integration - Example AI Prompts

This document shows the exact markdown that will be added to AI prompts based on user section reading behavior.

---

## Example 1: Calculator Power User

**User Behavior:**
- Spent 3m 45s on Calculator section
- Spent 1m 20s on Pricing section
- Spent 50s on Features section
- Spent 25s on Hero section

**Generated Markdown Added to Prompt:**

```markdown
## ⏱️ Section Reading Time

User has spent time reading these sections (sorted by time spent):
1. **Calculator - ROI Savings** - 3m 45s (MOST INTERESTED)
2. **Pricing Plans** - 1m 20s
3. **Features Overview** - 50s
4. **Hero Section** - 25s

**🎯 Key Insight:** User is most interested in ROI calculation and cost savings

**💡 Recommendation:** Frame your questions around what they were reading. Examples:
- "i see you spent 3m 45s playing with the calculator - did you find your numbers?"
- "those calculator numbers accurate for your workflow?"

**⚠️ CRITICAL:** Reference the section they spent the most time on in your FIRST response. Show you're paying attention to what they're reading.
```

**Expected AI Opening Message:**
> "hey! saw you spent almost 4 minutes on the calculator - did those numbers look accurate for your workflow?"

---

## Example 2: Price-Conscious Buyer

**User Behavior:**
- Spent 2m 15s on Pricing section
- Spent 1m 30s on Calculator section
- Spent 45s on Testimonials section
- Spent 35s on Features section

**Generated Markdown Added to Prompt:**

```markdown
## ⏱️ Section Reading Time

User has spent time reading these sections (sorted by time spent):
1. **Pricing Plans** - 2m 15s (MOST INTERESTED)
2. **Calculator - ROI Savings** - 1m 30s
3. **Customer Testimonials** - 45s
4. **Features Overview** - 35s

**🎯 Key Insight:** User is most interested in pricing plans and costs

**💡 Recommendation:** Frame your questions around what they were reading. Examples:
- "noticed you were reading pricing for a while - have questions about the cost?"
- "you spent 2m 15s on pricing - want to see how it compares to what you're wasting now?"

**⚠️ CRITICAL:** Reference the section they spent the most time on in your FIRST response. Show you're paying attention to what they're reading.
```

**Expected AI Opening Message:**
> "noticed you were reading pricing for a while - have questions about the cost?"

---

## Example 3: Feature Explorer

**User Behavior:**
- Spent 2m 50s on Features section
- Spent 1m 10s on Problem section
- Spent 55s on Calculator section
- Spent 40s on Hero section

**Generated Markdown Added to Prompt:**

```markdown
## ⏱️ Section Reading Time

User has spent time reading these sections (sorted by time spent):
1. **Features Overview** - 2m 50s (MOST INTERESTED)
2. **Problem Section - Pain Points** - 1m 10s
3. **Calculator - ROI Savings** - 55s
4. **Hero Section** - 40s

**🎯 Key Insight:** User is most interested in product capabilities

**💡 Recommendation:** Frame your questions around what they were reading. Examples:
- "you were checking out features - which one caught your eye?"
- "spent 2m 50s reading features - what stood out?"

**⚠️ CRITICAL:** Reference the section they spent the most time on in your FIRST response. Show you're paying attention to what they're reading.
```

**Expected AI Opening Message:**
> "you spent almost 3 minutes checking out features - which one caught your eye?"

---

## Example 4: Social Proof Seeker

**User Behavior:**
- Spent 3m 20s on Testimonials section
- Spent 1m 5s on Features section
- Spent 40s on Pricing section
- Spent 30s on Calculator section

**Generated Markdown Added to Prompt:**

```markdown
## ⏱️ Section Reading Time

User has spent time reading these sections (sorted by time spent):
1. **Customer Success Stories** - 3m 20s (MOST INTERESTED)
2. **Features Overview** - 1m 5s
3. **Pricing Plans** - 40s
4. **Calculator - ROI Savings** - 30s

**🎯 Key Insight:** User is most interested in customer reviews and success stories

**💡 Recommendation:** Frame your questions around what they were reading. Examples:
- "saw you reading testimonials - any of those stories sound familiar?"
- "you spent 3m 20s on case studies - which one matched your situation?"

**⚠️ CRITICAL:** Reference the section they spent the most time on in your FIRST response. Show you're paying attention to what they're reading.
```

**Expected AI Opening Message:**
> "saw you reading testimonials for a while - any of those stories sound familiar to your situation?"

---

## Example 5: Problem-Aware User

**User Behavior:**
- Spent 2m 40s on Problem section
- Spent 1m 15s on Value Proposition section
- Spent 50s on Features section
- Spent 35s on Hero section

**Generated Markdown Added to Prompt:**

```markdown
## ⏱️ Section Reading Time

User has spent time reading these sections (sorted by time spent):
1. **Problem Section - Pain Points** - 2m 40s (MOST INTERESTED)
2. **Value Stack** - 1m 15s
3. **Features Overview** - 50s
4. **Hero Section** - 35s

**🎯 Key Insight:** User is most interested in pain points and challenges

**💡 Recommendation:** Frame your questions around what they were reading. Examples:
- "you spent time reading about pain points - which one hits hardest for you?"
- "those problems resonate with your workflow?"

**⚠️ CRITICAL:** Reference the section they spent the most time on in your FIRST response. Show you're paying attention to what they're reading.
```

**Expected AI Opening Message:**
> "you spent almost 3 minutes reading about pain points - which one hits hardest for you?"

---

## Example 6: FAQ Reader (Hesitant Buyer)

**User Behavior:**
- Spent 2m 10s on FAQ section
- Spent 1m 30s on Pricing section
- Spent 1m 0s on Testimonials section
- Spent 45s on Features section

**Generated Markdown Added to Prompt:**

```markdown
## ⏱️ Section Reading Time

User has spent time reading these sections (sorted by time spent):
1. **Frequently Asked Questions** - 2m 10s (MOST INTERESTED)
2. **Pricing Plans** - 1m 30s
3. **Customer Testimonials** - 1m 0s
4. **Features Overview** - 45s

**🎯 Key Insight:** User is most interested in frequently asked questions

**💡 Recommendation:** Frame your questions around what they were reading. Examples:
- "noticed you spent 2m 10s reading FAQ - what caught your attention?"

**⚠️ CRITICAL:** Reference the section they spent the most time on in your FIRST response. Show you're paying attention to what they're reading.
```

**Expected AI Opening Message:**
> "saw you reading the FAQ for a while - did you find what you were looking for, or still have questions?"

**AI Strategy:**
This user is hesitant and doing due diligence. The FAQ reading suggests they have specific concerns. The AI should probe for objections and address them directly.

---

## Example 7: Quick Visitor (Just Arrived)

**User Behavior:**
- Spent 30s on Hero section
- Spent 20s on Problem section
- Spent 15s on Features section

**Generated Markdown Added to Prompt:**

```markdown
## ⏱️ Section Reading Time

User has spent time reading these sections (sorted by time spent):
1. **Hero Section** - 30s (MOST INTERESTED)
2. **Problem Section - Pain Points** - 20s
3. **Features Overview** - 15s

**🎯 Key Insight:** User is most interested in the landing page (just arrived)

**💡 Recommendation:** Frame your questions around what they were reading. Examples:
- "noticed you spent 30s reading Hero Section - what caught your attention?"

**⚠️ CRITICAL:** Reference the section they spent the most time on in your FIRST response. Show you're paying attention to what they're reading.
```

**Expected AI Opening Message:**
> "hey! just noticed you looking around - what brought you here today?"

**AI Strategy:**
User is very new. Don't overwhelm them. Start with gentle discovery questions to understand their needs.

---

## Example 8: Deep Researcher (Multiple Sessions)

**User Behavior:**
- Spent 4m 20s on Features section (across 2 visits)
- Spent 3m 45s on Pricing section (across 3 visits)
- Spent 2m 30s on Calculator section
- Spent 2m 10s on Testimonials section
- Spent 1m 50s on FAQ section

**Generated Markdown Added to Prompt:**

```markdown
## ⏱️ Section Reading Time

User has spent time reading these sections (sorted by time spent):
1. **Features Overview** - 4m 20s (MOST INTERESTED)
2. **Pricing Plans** - 3m 45s
3. **Calculator - ROI Savings** - 2m 30s
4. **Customer Testimonials** - 2m 10s
5. **Frequently Asked Questions** - 1m 50s

**🎯 Key Insight:** User is most interested in product capabilities

**💡 Recommendation:** Frame your questions around what they were reading. Examples:
- "you were checking out features - which one caught your eye?"
- "spent 4m 20s reading features - what stood out?"

**⚠️ CRITICAL:** Reference the section they spent the most time on in your FIRST response. Show you're paying attention to what they're reading.
```

**Expected AI Opening Message:**
> "wow, you've really done your research - spent over 4 minutes on features. which one stood out to you?"

**AI Strategy:**
This is a serious buyer doing deep due diligence. They've seen pricing, calculator, testimonials, and FAQ. They're close to a decision. Be direct and ask for the sale.

---

## Topic Mapping Reference

The system maps section IDs/titles to topic insights:

| Section Keyword | Topic Insight |
|----------------|---------------|
| `calculator` | ROI calculation and cost savings |
| `pricing` | pricing plans and costs |
| `features` | product capabilities |
| `hero` | the landing page (just arrived) |
| `problem` | pain points and challenges |
| `value` | the value proposition |
| `testimonials` | customer reviews and success stories |
| `faq` | frequently asked questions |
| `cta` | taking action / getting started |

If no keyword matches, it uses the section title as-is.

---

## AI Instruction Summary

The AI receives these explicit instructions in the prompt:

1. **Check the "Section Reading Time" section** in the context
2. **Identify the top section** marked "(MOST INTERESTED)"
3. **Reference it in your FIRST response** to show you're paying attention
4. **Use the provided examples** as templates for your questions
5. **Make it conversational** - not robotic

The AI is told this data is "GOLD" because it reveals exactly what the user is interested in, allowing for highly targeted, personalized questions that feel natural and observant.

---

## Integration with Other Context

Section timing is added to the prompt AFTER calculator data and BEFORE user activity. This positioning ensures:

1. **Calculator context comes first** - AI knows their specific numbers
2. **Section timing next** - AI knows what topics they care about
3. **User activity last** - AI sees specific clicks/hovers/inputs

This creates a narrative: "Here's their business (calculator) → Here's what they're interested in (sections) → Here's what they just did (activity)"

---

## Validation Notes

✅ TypeScript compilation passes
✅ All string operations are safe (null checks, optional chaining)
✅ Time formatting handles edge cases (0s, 59s, 1m 0s, etc.)
✅ Topic mapping has fallback to section title
✅ Markdown escaping not needed (section titles are sanitized)
✅ No XSS risk (server-side processing only)

**Status: Production ready**
