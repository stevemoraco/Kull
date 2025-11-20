# Section Timing Data Flow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Landing Page                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ <div data-section="hero">                              │    │
│  │   <Hero />                                             │    │
│  │ </div>                                                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                          │                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ <div data-section="problem">                           │    │
│  │   <ProblemSection />                                   │    │
│  │ </div>                                                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                          │                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ <div data-section="solution">                          │    │
│  │   <SolutionSection />                                  │    │
│  │ </div>                                                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                       (more sections...)                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ useSectionTiming Hook                                  │    │
│  │                                                        │    │
│  │  ┌──────────────────────────────────────────────┐     │    │
│  │  │ IntersectionObserver                         │     │    │
│  │  │ - Monitors [data-section] elements           │     │    │
│  │  │ - Detects when 50%+ visible                  │     │    │
│  │  │ - Triggers visibility callbacks               │     │    │
│  │  └──────────────────────────────────────────────┘     │    │
│  │           │                                            │    │
│  │           ▼                                            │    │
│  │  ┌──────────────────────────────────────────────┐     │    │
│  │  │ setInterval (500ms)                          │     │    │
│  │  │ - Calculates time delta                      │     │    │
│  │  │ - Updates timing for visible sections         │     │    │
│  │  │ - Splits time if multiple visible            │     │    │
│  │  └──────────────────────────────────────────────┘     │    │
│  │           │                                            │    │
│  │           ▼                                            │    │
│  │  ┌──────────────────────────────────────────────┐     │    │
│  │  │ timingData State                             │     │    │
│  │  │ {                                            │     │    │
│  │  │   hero: 45000,    // 45 seconds              │     │    │
│  │  │   problem: 12000, // 12 seconds              │     │    │
│  │  │   solution: 78000 // 78 seconds              │     │    │
│  │  │ }                                            │     │    │
│  │  └──────────────────────────────────────────────┘     │    │
│  │           │                                            │    │
│  │           ▼                                            │    │
│  │  ┌──────────────────────────────────────────────┐     │    │
│  │  │ sessionStorage                               │     │    │
│  │  │ key: "kull_section_timing"                   │     │    │
│  │  │ - Persists across page navigation            │     │    │
│  │  │ - Survives refresh                           │     │    │
│  │  └──────────────────────────────────────────────┘     │    │
│  └────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ <SupportChat sectionTiming={timingData} />             │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ User sends chat message
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend API Request                          │
│                                                                  │
│  POST /api/chat/message                                          │
│  POST /api/chat/welcome                                          │
│                                                                  │
│  {                                                              │
│    "message": "How does Kull work?",                            │
│    "history": [...],                                            │
│    "calculatorData": {...},                                     │
│    "currentSection": {...},                                     │
│    "sectionHistory": [...],                                     │
│    "sectionTiming": {           ← NEW!                          │
│      "hero": 45000,                                             │
│      "problem": 12000,                                          │
│      "solution": 78000,                                         │
│      "value-stack": 23000,                                      │
│      "referrals": 5000,                                         │
│      "final-cta": 8000                                          │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Processing                            │
│                                                                  │
│  - Analyze user engagement patterns                              │
│  - Personalize chat responses                                    │
│  - Track which sections users find valuable                      │
│  - Identify sections users skip                                  │
│  - A/B test section effectiveness                                │
│  - Store for analytics/reporting                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Format Examples

### Raw Timing Data (milliseconds)
```typescript
{
  hero: 45231,
  problem: 12567,
  solution: 78901,
  value-stack: 23456,
  referrals: 5123,
  final-cta: 8234
}
```

### Formatted for Display (seconds)
```typescript
{
  hero: "45s",
  problem: "13s",
  solution: "79s",
  value-stack: "23s",
  referrals: "5s",
  final-cta: "8s"
}
```

### Console Output
```
[SectionTiming] Section visible: hero
[SectionTiming] Section visible: problem
[SectionTiming] Section hidden: hero
[DEEP RESEARCH] Sending to /api/chat/message:
  - message length: 25
  - history: 4 messages
  - currentSection: Solution
  - sectionHistory: 5 sections visited
  - sectionTiming: { hero: 45231, problem: 12567, solution: 78901, ... }
```

## Key Features

1. **Automatic Tracking**
   - No manual start/stop required
   - Works immediately on page load
   - Tracks all specified sections simultaneously

2. **Accurate Time Measurement**
   - Uses high-precision timestamps
   - Updates every 500ms for accuracy
   - Handles multiple sections visible at once

3. **Persistent Data**
   - Survives page refresh
   - Persists during navigation
   - Resets on new session

4. **Seamless Integration**
   - Automatically included in chat payloads
   - No backend changes required initially
   - Backward compatible (optional prop)

5. **Performance Optimized**
   - Minimal CPU usage
   - No scroll event listeners
   - Efficient storage
   - Automatic cleanup

## Use Cases

### 1. Personalized Chat Responses
```
User spent 78s on "solution" section
→ AI knows user is interested in features
→ Response: "Great question! Since you spent time exploring our features..."
```

### 2. User Segmentation
```
Segment A: High "pricing" time → Price-conscious
Segment B: High "solution" time → Feature-focused
Segment C: High "referrals" time → Growth-minded
```

### 3. Content Optimization
```
Average Times:
  hero: 45s ✅ Good engagement
  problem: 12s ⚠️ Users skipping
  solution: 78s ✅ Strong interest
  value-stack: 23s ✅ Good
  referrals: 5s ❌ Low engagement - needs improvement
  final-cta: 8s ⚠️ Quick exit
```

### 4. A/B Testing
```
Variant A: Hero at top
  → hero: 60s avg

Variant B: Solution at top
  → solution: 90s avg

Winner: Variant B (higher engagement on key section)
```

## Integration Points

The `sectionTiming` data is sent to backend at these moments:

1. **Chat Opened** → `POST /api/chat/welcome`
2. **User Message** → `POST /api/chat/message`
3. **Automated Message** → `POST /api/chat/message`

All three endpoints now receive the complete timing data automatically.
