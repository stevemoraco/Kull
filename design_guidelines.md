# Kull Sales Funnel Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing inspiration from high-converting SaaS landing pages (Linear's clarity, Stripe's trust-building, AppSumo's value-stacking) while incorporating Alex Hormozi's Grand Slam Offer framework principles: bold value propositions, strategic urgency, stacked benefits, and clear risk reversal.

**Core Principle**: Create a premium, photography-focused aesthetic that reflects the professional quality photographers demand while maintaining aggressive conversion optimization.

## Typography System

**Font Families**:
- **Headlines**: Inter (700-900 weight) - Bold, modern, authoritative
- **Body**: Inter (400-600 weight) - Excellent readability across devices
- **Accent/Numbers**: Inter (600-700 weight) - For pricing, stats, timers

**Hierarchy**:
- **Hero Headline**: text-5xl md:text-6xl lg:text-7xl, font-black, leading-tight
- **Section Headers**: text-3xl md:text-4xl lg:text-5xl, font-bold
- **Subheadings**: text-xl md:text-2xl, font-semibold
- **Body Copy**: text-base md:text-lg, font-normal, leading-relaxed
- **CTAs**: text-lg md:text-xl, font-semibold, uppercase tracking-wide
- **Fine Print**: text-sm, font-normal

## Layout System

**Spacing Primitives**: Consistent use of Tailwind units: 4, 8, 12, 16, 20, 24, 32 for padding/margins

**Section Padding**:
- Mobile: py-12 px-4
- Desktop: py-20 md:py-32 px-6 lg:px-8

**Container Strategy**:
- Full-width sections with inner max-w-7xl for content
- Text-heavy areas: max-w-4xl for optimal readability
- Form sections: max-w-2xl for focused conversion

## Page Structure & Sections

### 1. Hero Section (100vh on desktop, auto-height mobile)
- **Layout**: Full-bleed background image (photographers reviewing images in Lightroom workspace)
- **Content Overlay**: Centered, with subtle backdrop blur effect on CTA container
- **Elements**:
  - Navigation bar (fixed, transparent blur background): Logo left, "Sign In" + "Start Free Trial" buttons right
  - Hero headline emphasizing AI-powered rating + time savings
  - Subheadline with specific benefit (e.g., "Rate 1,000+ photos in minutes using 5 AI models")
  - Two-button CTA group: Primary "Start 1-Day Free Trial" + Secondary "Watch Demo"
  - Trust indicators below CTAs: "Used by 500+ pro photographers"
  - Subtle scroll indicator at bottom

### 2. Urgency Banner (Sticky, appears after scroll)
- **Timer Display**: Large countdown showing 24-hour special offer window
- **Layout**: Horizontal bar, max-w-6xl centered
- **Copy**: "Special Offer Expires In: [HH:MM:SS] - Save 40% on Annual Plans"

### 3. The Problem Section
- **Layout**: Two-column split (image left, text right on desktop; stacked mobile)
- **Image**: Photographer overwhelmed with thousands of unrated images
- **Content**: 
  - Headline addressing pain point
  - 3-4 bullet points of photographer frustrations
  - Stat highlighting time wasted on manual rating

### 4. The Solution (Product Showcase)
- **Layout**: Centered content, max-w-5xl
- **Components**:
  - Bold headline introducing Kull
  - Animated product demo mockup (Lightroom interface with AI ratings appearing)
  - Feature grid (2 columns mobile, 4 columns desktop):
    - "5 AI Models" with icons (Gemini, Grok, Kimi k2, Claude, GPT-5)
    - "Real-Time Rating"
    - "Live Preview"
    - "Instant Sync"

### 5. Value Stack Section (Grand Slam Offer Framework)
- **Layout**: Single column, max-w-4xl centered
- **Headline**: "Everything You Get With Kull"
- **Visual Treatment**: Stacked cards with checkmarks, each revealing value
- **Components**:
  - Core features list (8-10 items)
  - Bonus features highlighted differently
  - Total value calculation shown
  - Risk reversal statement (1-day free trial, cancel anytime)

### 6. Pricing Section
- **Layout**: Two-column pricing cards (side-by-side desktop, stacked mobile)
- **Card Design**: 
  - Professional tier ($99/mo): Clean card with feature list
  - Studio tier ($499/mo): Elevated design with "Most Popular" badge
  - Annual pricing emphasized, monthly option shown smaller
- **Special Offer Badge**: "24-Hour Bonus: +3 months free" positioned top-right
- **CTA Buttons**: Full-width within cards, "Start Free Trial" text

### 7. Social Proof Section
- **Layout**: Masonry grid (1 col mobile, 2 cols tablet, 3 cols desktop)
- **Components**:
  - Photographer testimonials with headshots
  - Before/after stats ("Rated 5,000 images in 2 hours")
  - Featured publication logos (if available)
  - Video testimonial embed (centered, max-w-3xl)

### 8. Referral Program Highlight
- **Layout**: Centered content with illustration
- **Visual**: Network diagram showing referral growth
- **Copy**: "Refer Photographers, Unlock Bonuses"
- **Bonus Tier Display**: Progress bar showing 1, 3, 5, 10 referral milestones
- **CTA**: "Start Your Free Trial & Invite Colleagues"

### 9. FAQ Section
- **Layout**: Single column, max-w-3xl
- **Component**: Accordion-style expandable questions
- **Questions**: 6-8 common objections/questions about trial, pricing, compatibility

### 10. Final CTA Section
- **Layout**: Full-width, dramatic
- **Background**: Subtle gradient or blurred photography background
- **Content**:
  - Urgent headline: "Start Your Free Trial Now"
  - Recap of offer (1-day trial + 24-hour bonus)
  - Large CTA button
  - Risk reversal reminder
  - Secondary link to "Compare Plans"

### 11. Footer
- **Layout**: Three-column grid (single col mobile)
- **Sections**:
  - Column 1: Product links (Features, Pricing, Download, iOS App)
  - Column 2: Company (About, Contact, Support)
  - Column 3: Legal (Privacy, Terms, Refunds)
- **Bottom Bar**: "© 2025 Lander Media, 31 N Tejon St Colorado Springs CO 80903 | Powered by heydata.org"

## Component Library

**Buttons**:
- Primary CTA: Large (h-14 md:h-16), rounded-lg, bold text, full shadow, backdrop-blur when on images
- Secondary: Outlined style, same size as primary
- Text Links: Underline on hover, semibold

**Cards**:
- Pricing: Rounded-2xl, shadow-xl, p-8 md:p-12, border treatment
- Testimonial: Rounded-xl, shadow-lg, p-6
- Feature: Rounded-lg, p-6, hover lift effect

**Forms** (Sign-in/Sign-up modals):
- Input fields: h-12, rounded-lg, border focus state
- Labels: text-sm, font-medium, mb-2
- Form container: max-w-md, rounded-2xl, p-8

**Timer Component**:
- Large digit display (text-4xl md:text-5xl, font-bold, tabular-nums)
- Segments: Hours : Minutes : Seconds
- Container: Rounded-xl, p-6, backdrop-blur

## Images

**Hero Background**: Full-bleed image of professional photographer's workspace with Lightroom open showing gallery of stunning photos. Image should be high-quality, slightly desaturated to allow text overlay readability.

**Problem Section**: Image showing cluttered Lightroom catalog with thousands of unrated images, photographer looking stressed.

**Solution/Demo**: Animated mockup or screenshot of Lightroom interface with Kull rating panel showing real-time 1-5 star ratings appearing.

**Testimonial Photos**: Professional headshots of photographers (circular crop, 80px diameter).

**Referral Section**: Custom illustration or icon-based visual showing network growth/connection concept.

## Mobile Optimization

- Stack all multi-column layouts to single column
- Reduce padding (py-12 instead of py-20)
- Hero text: Smaller but still bold (text-4xl instead of text-6xl)
- Touch targets: Minimum 44px height for all interactive elements
- Sticky urgency timer: Collapses to compact version on scroll
- Navigation: Hamburger menu with slide-out drawer

## Conversion Optimization Elements

- **Multiple CTAs**: Every section has path to trial signup
- **Exit Intent**: Modal trigger offering special discount
- **Social Proof**: Scattered throughout, not isolated
- **Scarcity**: 24-hour timer, limited trial spots messaging
- **Clarity**: No jargon, clear benefit statements
- **Risk Reversal**: Free trial emphasized, easy cancellation highlighted