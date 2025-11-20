# Section Timing Tracking Implementation

## Overview
This implementation adds frontend section timing tracking to measure how much time users spend viewing each section of the landing page. The data is automatically collected and sent to the backend with every chat message.

## Files Created/Modified

### Created Files
1. **`/home/runner/workspace/client/src/hooks/useSectionTiming.ts`**
   - Custom React hook to track section timing
   - Uses IntersectionObserver API to detect section visibility
   - Persists data in sessionStorage for cross-page navigation
   - Updates timing every 500ms for accurate tracking

2. **`/home/runner/workspace/client/src/__tests__/useSectionTiming.test.tsx`**
   - Comprehensive test suite (7 tests, all passing)
   - Tests initialization, persistence, reset, and formatting
   - Mocks IntersectionObserver for jsdom compatibility

### Modified Files
1. **`/home/runner/workspace/client/src/pages/Landing.tsx`**
   - Imported `useSectionTiming` hook and `SupportChat` component
   - Added timing tracking for 6 sections: hero, problem, solution, value-stack, referrals, final-cta
   - Wrapped each section component with `<div data-section="...">` for tracking
   - Passed `timingData` to SupportChat component

2. **`/home/runner/workspace/client/src/components/SupportChat.tsx`**
   - Added `SupportChatProps` interface with optional `sectionTiming` prop
   - Updated all 3 API call locations to include `sectionTiming` in payload:
     - `/api/chat/welcome` (initial greeting)
     - `/api/chat/message` (user messages)
     - `/api/chat/message` (automated messages)
   - Added console logging to show section timing data being sent

## How It Works

### 1. Section Visibility Detection
The `useSectionTiming` hook uses the IntersectionObserver API to monitor when sections enter/exit the viewport:

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        visibleSectionsRef.current.add(sectionId);
      } else {
        visibleSectionsRef.current.delete(sectionId);
      }
    });
  },
  {
    threshold: 0.5, // Section is "visible" when 50% is in viewport
  }
);
```

### 2. Time Accumulation
Every 500ms, the hook updates the accumulated time for all currently visible sections:

```typescript
setInterval(() => {
  const deltaTime = now - lastUpdateTimeRef.current;

  if (visibleSectionsRef.current.size > 0) {
    // Split time equally if multiple sections visible
    const timePerSection = deltaTime / visibleSectionsRef.current.size;

    visibleSectionsRef.current.forEach(sectionId => {
      newData[sectionId] = (newData[sectionId] || 0) + timePerSection;
    });
  }
}, 500);
```

### 3. SessionStorage Persistence
Timing data is saved to sessionStorage on every update:

```typescript
sessionStorage.setItem('kull_section_timing', JSON.stringify(timingData));
```

This ensures data survives:
- Page scrolling
- Page refresh
- Navigation within the same session

### 4. Data Structure

**Tracked Sections:**
- `hero` - Hero section with headline and CTA
- `problem` - Problem statement section
- `solution` - Solution/features section
- `value-stack` - Value proposition stack
- `referrals` - Referral program section
- `final-cta` - Final call-to-action section

**Example Payload:**
```json
{
  "message": "How does Kull work?",
  "history": [...],
  "calculatorData": {...},
  "currentSection": {...},
  "sectionHistory": [...],
  "sectionTiming": {
    "hero": 45000,
    "problem": 12000,
    "solution": 78000,
    "value-stack": 23000,
    "referrals": 5000,
    "final-cta": 8000
  }
}
```

**Interpretation:**
- User spent 45 seconds viewing the hero section
- 78 seconds viewing the solution/features section
- 12 seconds on the problem section
- etc.

### 5. Backend Integration
The `sectionTiming` data is now included in all chat API requests:

- **POST `/api/chat/welcome`** - Sent when chat is first opened
- **POST `/api/chat/message`** - Sent with every user message
- **POST `/api/chat/message`** - Sent with automated/proactive messages

Backend can use this data to:
- Understand which sections resonate with users
- Personalize chat responses based on section engagement
- A/B test different section ordering
- Identify sections users skip or spend little time on

## Edge Cases Handled

1. **Multiple Sections Visible Simultaneously**
   - Time is split proportionally across all visible sections
   - Example: If hero and problem are both 50% visible, each gets 50% of the delta time

2. **Missing Section Elements**
   - Console warning logged if section element not found
   - Hook continues to work with remaining sections

3. **SessionStorage Failures**
   - Try/catch blocks prevent crashes
   - Errors logged to console for debugging

4. **No Sections Visible**
   - No time accumulated when user is idle or scrolled away

5. **Page Navigation**
   - Data persists across page changes within same session
   - Resets when session ends (new tab/window)

## Testing

All tests pass (7/7):

```bash
✓ client/src/__tests__/useSectionTiming.test.tsx (7 tests) 63ms
  ✓ useSectionTiming > should initialize timing data for all sections
  ✓ useSectionTiming > should load timing data from sessionStorage
  ✓ useSectionTiming > should provide a reset function
  ✓ useSectionTiming > should warn when section elements are not found
  ✓ formatTimingData > should format milliseconds to seconds
  ✓ formatTimingData > should round to nearest second
  ✓ formatTimingData > should handle zero values
```

## Console Output Example

When a user sends a chat message, you'll see:

```
[DEEP RESEARCH] Sending to /api/chat/message:
  - message length: 25
  - history: 4 messages (FRESH - captured at millisecond precision)
  - currentSection: Solution
  - sectionHistory: 5 sections visited
  - sectionTiming: {
      hero: 45231,
      problem: 12567,
      solution: 78901,
      value-stack: 23456,
      referrals: 5123,
      final-cta: 8234
    }
```

## Usage in Other Pages

To add section timing to other pages:

```tsx
import { useSectionTiming } from '@/hooks/useSectionTiming';
import { SupportChat } from '@/components/SupportChat';

export default function MyPage() {
  const { timingData } = useSectionTiming([
    'intro',
    'features',
    'pricing',
  ]);

  return (
    <div>
      <div data-section="intro">
        {/* Intro content */}
      </div>
      <div data-section="features">
        {/* Features content */}
      </div>
      <div data-section="pricing">
        {/* Pricing content */}
      </div>

      <SupportChat sectionTiming={timingData} />
    </div>
  );
}
```

## Performance Considerations

- **Minimal overhead**: Only runs every 500ms, not on every scroll event
- **Efficient storage**: Data stored as simple JSON object in sessionStorage
- **No render blocking**: Uses `useRef` and `setInterval` to avoid unnecessary re-renders
- **Automatic cleanup**: Observer disconnected and interval cleared on unmount

## Future Enhancements

Potential improvements:
1. **Heatmap visualization** - Show which sections get most engagement
2. **A/B testing integration** - Track timing per variant
3. **User segment analysis** - Compare timing across user cohorts
4. **Export to analytics** - Send to Amplitude, Mixpanel, etc.
5. **Configurable thresholds** - Adjust visibility threshold per section
6. **Mobile optimization** - Different tracking strategy for mobile (viewport height)

## Verification Steps

To test the implementation:

1. **Open landing page** (http://localhost:5000)
2. **Open browser console**
3. **Scroll through sections** - Watch console logs showing sections becoming visible
4. **Open chat** - Click the chat button
5. **Send a message** - Look for `[DEEP RESEARCH] Sending to /api/chat/message:` log
6. **Verify timing data** - Check `sectionTiming` object in console output
7. **Refresh page** - Verify timing data persists (sessionStorage)
8. **Check sessionStorage** - Run `sessionStorage.getItem('kull_section_timing')` in console

## TypeScript Compliance

✅ All TypeScript checks pass:
```bash
npm run check
# No errors
```

## Summary

This implementation provides robust, accurate section timing tracking with:
- ✅ Automatic visibility detection via IntersectionObserver
- ✅ SessionStorage persistence
- ✅ Integration with SupportChat component
- ✅ Backend payload inclusion
- ✅ Comprehensive test coverage (7/7 passing)
- ✅ TypeScript type safety
- ✅ Edge case handling
- ✅ Performance optimization
- ✅ Clear console logging for debugging

The backend now receives detailed engagement metrics with every chat interaction, enabling personalized responses and data-driven UX improvements.
