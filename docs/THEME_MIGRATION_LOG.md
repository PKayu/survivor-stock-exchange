# Theme Migration Log: Jungle Trader → Survivor Stock Exchange

**Date:** 2025-02-03
**Objective:** Migrate the immersive Survivor theme, styling, images, and copy from `jungle-trader` to the main `survivor-stock-exchange` project while preserving the robust Next.js architecture.

---

## Overview

This document details the complete theme migration from a separate `jungle-trader` reference project to the main `survivor-stock-exchange` codebase. The migration transforms a generic stock exchange application into an immersive Survivor-themed experience.

---

## Phase 1: Font Setup

### File: `app/layout.tsx`

**Changes Made:**
- Replaced `Inter` font with three Google Fonts:
  - **Bebas Neue** (`--font-display`) - For main headings, letter-spacing: 0.05em
  - **Oswald** (`--font-heading`) - For secondary headings, uppercase, weights: 400-700
  - **Open Sans** (`--font-body`) - For body text, weights: 400-700

**Before:**
```typescript
import { Inter } from "next/font/google"
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
```

**After:**
```typescript
import { Bebas_Neue, Oswald, Open_Sans } from "next/font/google"

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400"],
})

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
})

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
})
```

**Updated metadata:**
- Title: "Survivor Stock Exchange - Outwit. Outplay. Out-invest."
- Description: "Trade stocks of your favorite Survivor contestants. Build your portfolio. Outwit. Outplay. Out-invest."

**Body class:** Changed from `font-sans` to `font-body`

---

## Phase 2: CSS Theme Variables

### File: `app/globals.css`

Complete replacement of the color system from oklch to hsl-based jungle theme.

### Color Palette

**Core Colors:**
```css
--background: 180 15% 8%;    /* Dark jungle night */
--foreground: 40 30% 95%;    /* Light text */
--primary: 25 95% 53%;       /* Survivor Orange (buff color) */
--secondary: 200 85% 45%;    /* Ocean Blue (tribe buff) */
--accent: 145 60% 35%;       /* Jungle Green */
--card: 180 12% 12%;         /* Card surfaces */
--muted: 180 10% 18%;        /* Muted backgrounds */
--destructive: 0 75% 50%;    /* Tribal Council Fire */
--border: 35 25% 25%;        /* Border color */
--input: 35 20% 20%;         /* Input fields */
--ring: 25 95% 53%;          /* Focus ring (torch glow) */
```

**Tribe Colors:**
```css
--tribe-orange: 25 95% 53%;
--tribe-blue: 200 85% 45%;
--tribe-green: 145 60% 40%;
--tribe-yellow: 45 100% 55%;
--tribe-purple: 280 70% 55%;
--tribe-red: 0 80% 55%;
```

**Special Effects:**
```css
--torch-glow: 25 100% 50%;
--ocean-shimmer: 195 85% 50%;
--sand: 40 50% 75%;
--jungle-dark: 150 40% 12%;
--fire-orange: 20 100% 55%;
--fire-yellow: 45 100% 60%;
```

### Animations

**Flicker Animation:** Simulates torch flames with opacity, scale, and rotation changes
**Float Animation:** Gentle up/down motion for fireflies
**Pulse Glow:** Breathing glow effect for torch elements
**Gradient Shift:** Animated gradient background movement

### Utility Classes Added

**Text Gradients:**
- `.text-gradient-fire` - Orange/yellow fire gradient
- `.text-gradient-sunset` - Orange to blue sunset gradient
- `.text-gradient-ocean` - Blue ocean gradient

**Effects:**
- `.jungle-overlay` - Dark gradient overlay for backgrounds
- `.card-tribal` - Tribal styled cards with hover effects
- `.glow-fire` - Orange glow shadow
- `.glow-ocean` - Blue glow shadow

**Background Gradients:**
- `.bg-gradient-fire`
- `.bg-gradient-ocean`
- `.bg-gradient-jungle`
- `.bg-gradient-sunset`
- `.bg-gradient-tribal`

**Tribe Badges:**
- `.badge-tribe-orange`
- `.badge-tribe-blue`
- `.badge-tribe-green`
- `.badge-tribe-yellow`
- `.badge-tribe-purple`
- `.badge-tribe-red`

**Important Note:** Tribe badge classes use plain CSS instead of `@apply` directives due to Tailwind CSS v4 compatibility issues with custom utility classes in `@layer utilities`.

### Base Styles

```css
@layer base {
  body {
    font-family: var(--font-body), sans-serif;
  }

  h1, h2, h3, h4, h5, h6, .font-display {
    font-family: var(--font-display), sans-serif;
    letter-spacing: 0.05em;
  }

  .font-heading {
    font-family: var(--font-heading), sans-serif;
    text-transform: uppercase;
  }
}
```

---

## Phase 3: Image Assets

### Files Copied

| Source | Destination | Purpose |
|--------|-------------|---------|
| `jungle-trader/src/assets/hero-island-bg.jpg` | `public/hero-island-bg.jpg` | Hero section background |
| `jungle-trader/src/assets/bamboo-texture.jpg` | `public/bamboo-texture.jpg` | Texture for future use |

---

## Phase 4: TorchIcon Component

### File: `components/icons/torch-icon.tsx` (NEW)

**Purpose:** Animated torch icon component representing the Survivor torch ceremony

**Props:**
- `className?: string` - Additional CSS classes
- `size?: "sm" | "md" | "lg"` - Torch size (default: "md")
- `animated?: boolean` - Enable/disable flicker animation (default: true)

**Size Classes:**
- `sm`: w-6 h-10 (24x40px)
- `md`: w-8 h-14 (32x56px)
- `lg`: w-12 h-20 (48x80px)

**Visual Structure:**
- Flame: Multi-layered gradient with blur effects
- Handle: Brown/amber gradient rounded handle

**Animation:** Uses `.animate-flicker` class for realistic flame movement

---

## Phase 5: Button Component Updates

### File: `components/ui/button.tsx`

**New Variants Added:**

**torch:**
```css
bg-gradient-to-r from-primary via-amber-300 to-primary
text-primary-foreground
shadow-[0_0_20px_hsl(25,100%,50%/0.3)]
hover:shadow-[0_0_30px_hsl(25,100%,50%/0.5)]
hover:scale-105
```

**ocean:**
```css
bg-secondary text-secondary-foreground
shadow-lg
hover:shadow-[0_0_20px_hsl(200,85%,45%/0.4)]
hover:scale-105
```

**tribal:**
```css
bg-card border-2 border-primary/50
text-foreground
hover:border-primary hover:bg-primary/10
```

**New Size:** `xl` - h-14 rounded-lg px-10 text-lg

**Base Class Update:** Added `font-heading uppercase tracking-wide` to all buttons

---

## Phase 6: Navigation Header

### File: `components/nav-header.tsx`

**Changes:**

1. **Import Change:**
   - Removed: `import { SurvivorIcon } from "./icons/survivor-icon"`
   - Added: `import { TorchIcon } from "./icons/torch-icon"`

2. **Logo Redesign:**
```tsx
<Link href="/" className="flex items-center gap-3 group">
  <TorchIcon size="sm" animated />
  <div className="flex flex-col">
    <span className="font-display text-xl tracking-wider text-gradient-fire leading-none">
      SURVIVOR
    </span>
    <span className="font-heading text-xs text-muted-foreground tracking-widest">
      STOCK EXCHANGE
    </span>
  </div>
</Link>
```

3. **CTA Button Updates:**
   - "Log in" → "Sign In"
   - "Sign up" → "Enter the Exchange" with `variant="torch"`

---

## Phase 7: Landing Page

### File: `app/page.tsx`

Complete redesign with immersive jungle theme.

### Hero Section

**Background:** Island image (`/hero-island-bg.jpg`) with jungle overlay

**Animated Elements:**
- Two animated torches
- 20 floating firefly particles with random positions and animation delays

**Typography:**
- "SURVIVOR" - `text-gradient-fire`, sizes: text-6xl to text-9xl
- "STOCK EXCHANGE" - `text-gradient-ocean`, sizes: text-3xl to text-6xl
- Tagline: "Outwit. Outplay. Out-invest."

**CTA Buttons:**
- Primary: "Enter the Exchange" (torch variant, xl size)
- Secondary: "View Contestants" (outline variant, xl size)

### How It Works Section

**Heading:** "HOW IT WORKS" with `text-gradient-fire`

**Feature Cards (updated copy and styling):**
1. **Trade Stocks** (was "Join a Season")
   - Icon: TrendingUp with `glow-fire` effect
   - Description: "Buy and sell contestant stocks through silent auctions..."

2. **Build Your Portfolio** (was "Trade Stock")
   - Icon: DollarSign with `glow-ocean` effect
   - Description: "Strategically invest your $100 starting balance..."

3. **Outlast Everyone** (was "Win Big")
   - Icon: Trophy
   - Description: "Earn dividends when your contestants win immunity..."

**Card Styling:** `.card-tribal` class with tribal hover effects

### Trading Rules Section

**Heading:** "TRADING RULES" with `text-gradient-sunset`

**Rule Cards:**
- Starting Balance - with DollarSign icon (primary color)
- Stock Prices - with TrendingUp icon (secondary color)
- Dividends - with fire gradient badge
- Winning - with Trophy icon (accent color)

### Trading Phases Section

**Heading:** "TRADING PHASES" with `text-gradient-ocean`

**Phase List with Tribe Badges:**
1. Initial Offering - `badge-tribe-orange`
2. Second Offering - `badge-tribe-blue`
3. First Listing - `badge-tribe-green`
4. Second Listing - `badge-tribe-yellow`
5. Game Day - `badge-tribe-red`

Each phase has:
- Numbered circle with `glow-fire` effect
- Phase name (heading style)
- Tribe badge
- Description text

### CTA Section

**Heading:** "READY TO PLAY?" with `text-gradient-fire`

**Content:**
- Animated torch icon (lg size)
- Description paragraph
- Button: "Start Trading Now" (torch variant, xl size)

**Background:** Gradient overlay from primary to secondary

---

## Additional Changes

### File: `tsconfig.json`

**Added to exclude:**
```json
"exclude": ["node_modules", "jungle-trader"]
```

**Reason:** Prevents TypeScript from attempting to compile the reference `jungle-trader` project.

---

## Copy/Text Changes Summary

| Original Copy | New Jungle-Themed Copy |
|--------------|------------------------|
| "Get Started" | "Enter the Exchange" |
| "Log In" | "Sign In" |
| "Sign up" | "Enter the Exchange" |
| "Create Your Account" | "Start Trading Now" |
| "Join a Season" | "Trade Stocks" |
| "Trade Stock" | "Build Your Portfolio" |
| "Win Big" | "Outlast Everyone" |
| "Game Rules" | "Trading Rules" |
| "How It Works" | "HOW IT WORKS" (all caps) |
| "Ready to Play?" | "READY TO PLAY?" (all caps) |
| Generic description | "Outwit. Outplay. Out-invest." |

---

## Verification Checklist

To verify the migration was successful, check the following:

### 1. Build Verification
```bash
npm run build
```
**Expected:** Successful build (note: pre-existing auth type error in lib/auth.ts is unrelated)

### 2. Dev Server Verification
```bash
npm run dev
```
**Expected:** Server starts successfully on a port (may be 3000, 3002, etc.)

### 3. Visual Verification (http://localhost:PORT)

**Landing Page:**
- [ ] Hero section displays island background image
- [ ] Two torches visible with flicker animation
- [ ] Firefly particles floating
- [ ] "SURVIVOR" has orange/yellow fire gradient
- [ ] "STOCK EXCHANGE" has blue ocean gradient
- [ ] Tagline includes "Outwit. Outplay. Out-invest."
- [ ] "Enter the Exchange" button has torch gradient with glow
- [ ] "View Contestants" button is outlined

**Navigation:**
- [ ] Torch icon visible in header with animation
- [ ] "SURVIVOR" text has fire gradient
- [ ] "STOCK EXCHANGE" subtitle below
- [ ] "Sign In" and "Enter the Exchange" buttons present

**How It Works Section:**
- [ ] "HOW IT WORKS" heading with fire gradient
- [ ] Three feature cards with tribal styling
- [ ] Icons have glow effects
- [ ] Cards lift and glow on hover

**Trading Rules Section:**
- [ ] "TRADING RULES" heading with sunset gradient
- [ ] Four rule cards with tribal styling
- [ ] Colored icons match theme

**Trading Phases Section:**
- [ ] "TRADING PHASES" heading with ocean gradient
- [ ] Five phase cards with numbered circles
- [ ] Tribe badges display with correct colors

**CTA Section:**
- [ ] "READY TO PLAY?" with fire gradient
- [ ] Torch icon visible
- [ ] "Start Trading Now" button with torch variant

### 4. Responsive Design
- [ ] Test on mobile viewport (375px)
- [ ] Test on tablet viewport (768px)
- [ ] Test on desktop viewport (1920px)

### 5. Font Rendering
- [ ] Bebas Neue loads for display headings
- [ ] Oswald loads for secondary headings
- [ ] Open Sans loads for body text
- [ ] No font console errors

### 6. Animation Performance
- [ ] Torch flicker animation is smooth
- [ ] Firefly float animation is smooth
- [ ] No layout shift from animations
- [ ] Hover effects on cards work smoothly

---

## Known Issues

### Pre-existing (unrelated to theme migration):
1. **TypeScript Error in lib/auth.ts** - PrismaAdapter type mismatch with NextAuth
   - Error: Conversion of type 'Adapter' may be a mistake
   - Impact: Build fails on type checking, but app runs in dev mode
   - Status: Existed before theme migration

### Build-time Warnings:
1. **Middleware deprecation warning** - Next.js 16 recommends using "proxy" instead of "middleware"
   - Impact: None (informational only)
   - Status: Standard Next.js 16 warning

---

## File Summary

### Files Modified:
1. `app/layout.tsx` - Font setup and metadata
2. `app/globals.css` - Complete theme replacement
3. `components/ui/button.tsx` - New variants and size
4. `components/nav-header.tsx` - Logo and CTA updates
5. `app/page.tsx` - Landing page redesign
6. `tsconfig.json` - Exclude jungle-trader folder

### Files Created:
1. `components/icons/torch-icon.tsx` - Animated torch component

### Files Copied:
1. `public/hero-island-bg.jpg` - Hero background
2. `public/bamboo-texture.jpg` - Texture asset

---

## Architecture Preservation

**Important:** The Next.js application architecture remains unchanged:
- ✅ Next.js 16 with App Router
- ✅ Prisma ORM
- ✅ NextAuth.js authentication
- ✅ All existing routes and functionality
- ✅ Database schema
- ✅ API routes
- ✅ Server components
- ✅ Client components

Only visual/styling layers were modified.

---

## Future Enhancement Opportunities

1. **Dark Mode Toggle** - Currently uses dark-first jungle theme; could add light mode option
2. **Tribe Badge Component** - Could extract badge classes into a reusable component
3. **Animation Controls** - Could add user preference to disable animations (accessibility)
4. **Additional Images** - More jungle textures and backgrounds from bamboo-texture.jpg
5. **Loading States** - Torch animation could be used for loading states

---

## Handoff Notes for Next Developer/AI

1. **Font Variables:** All fonts use CSS custom properties (`--font-display`, `--font-heading`, `--font-body`)
2. **Color System:** All colors use HSL format for easy manipulation
3. **Tribe Badges:** Use plain CSS, not Tailwind `@apply` (compatibility issue)
4. **Torch Icon:** Can be used anywhere - import from `@/components/icons/torch-icon`
5. **Button Variants:** Use `variant="torch"` for primary CTAs, `variant="ocean"` for secondary
6. **Card Styling:** Add `card-tribal` class to any Card for tribal styling
7. **Text Gradients:** Use `text-gradient-fire`, `text-gradient-sunset`, or `text-gradient-ocean` for headings
8. **Glow Effects:** Use `glow-fire` or `glow-ocean` on containers with icon circles

---

## Testing Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type checking (note: pre-existing auth error)
npx tsc --noEmit

# Linting
npm run lint
```

---

## Related Documentation

- `docs/THEME_REFERENCE.md` - Original theme reference from jungle-trader
- `docs/reality_tv_rules.txt` - Game rules reference
- `docs/Survivor Fantasy Rules.pdf` - Fantasy rules reference

---

**End of Migration Log**

For questions or issues, refer to the live application at http://localhost:3002 (or port 3000 if available).
