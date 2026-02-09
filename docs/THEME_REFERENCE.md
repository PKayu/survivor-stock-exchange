# Survivor Stock Exchange - Theme Reference Guide

This document provides a comprehensive reference for the Survivor jungle theme used in the application. Use this guide when implementing new features or styling components.

---

## Table of Contents

1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Animations](#animations)
4. [Component Patterns](#component-patterns)
5. [Visual Effects](#visual-effects)
6. [Copy & Tone](#copy--tone)

---

## Color Palette

The theme is built on the iconic Survivor "buff" colors - orange and blue - with jungle accents.

### Core Colors (HSL Format)

| Variable | Color | Usage |
|----------|-------|-------|
| `--primary` | `hsl(25, 95%, 53%)` | Survivor Orange - main brand color, CTAs |
| `--secondary` | `hsl(200, 85%, 45%)` | Ocean Blue - secondary accent |
| `--accent` | `hsl(145, 60%, 35%)` | Jungle Green - tertiary accent |
| `--background` | `hsl(180, 15%, 8%)` | Dark jungle night - page background |
| `--foreground` | `hsl(40, 30%, 95%)` | Off-white - primary text |
| `--card` | `hsl(180, 12%, 12%)` | Card background |
| `--muted` | `hsl(180, 10%, 18%)` | Muted backgrounds |
| `--muted-foreground` | `hsl(40, 15%, 65%)` | Secondary text |
| `--border` | `hsl(35, 25%, 25%)` | Border color |

### Tribe Colors

Use these for tribe indicators, contestant badges, and team differentiation.

| Tribe | Color | CSS Class |
|-------|-------|-----------|
| Orange | `hsl(25, 95%, 53%)` | `.badge-tribe-orange` |
| Blue | `hsl(200, 85%, 45%)` | `.badge-tribe-blue` |
| Green | `hsl(145, 60%, 40%)` | `.badge-tribe-green` |
| Yellow | `hsl(45, 100%, 55%)` | `.badge-tribe-yellow` |
| Purple | `hsl(280, 70%, 55%)` | `.badge-tribe-purple` |
| Red | `hsl(0, 80%, 55%)` | `.badge-tribe-red` |

### Special Effect Colors

| Variable | Color | Usage |
|----------|-------|-------|
| `--torch-glow` | `hsl(25, 100%, 50%)` | Torch glow effects |
| `--ocean-shimmer` | `hsl(195, 85%, 50%)` | Ocean/water effects |
| `--sand` | `hsl(40, 50%, 75%)` | Sand/beach elements |
| `--jungle-dark` | `hsl(150, 40%, 12%)` | Deep jungle shadows |
| `--fire-orange` | `hsl(20, 100%, 55%)` | Fire effects |
| `--fire-yellow` | `hsl(45, 100%, 60%)` | Flame highlights |

### Stock Movement Indicators

| Status | Color | Usage |
|--------|-------|-------|
| Up | `hsl(145, 70%, 50%)` | Stock price increased |
| Down | `hsl(0, 70%, 55%)` | Stock price decreased |

---

## Typography

The theme uses three typefaces to create the Survivor aesthetic.

### Font Families

| Font | Usage | Variable |
|------|-------|----------|
| **Bebas Neue** | Main headings (h1-h6), display text | `--font-display` |
| **Oswald** | Secondary headings, labels, navigation | `--font-heading` |
| **Open Sans** | Body text, paragraphs | `--font-body` |

### Typography Guidelines

```tsx
// Main headings - Large, dramatic, fire gradient
<h1 className="font-display text-6xl tracking-wider text-gradient-fire">
  SURVIVOR
</h1>

// Secondary headings - All caps, blue accent
<h2 className="font-display text-4xl tracking-widest text-secondary">
  STOCK EXCHANGE
</h2>

// Section headings - Uppercase with Oswald
<h3 className="font-heading text-xl tracking-wide">
  HOW IT WORKS
</h3>

// Body text - Open Sans, readable
<p className="font-body text-muted-foreground">
  Your description here
</p>
```

### Typography Utilities

| Class | Effect |
|-------|--------|
| `.font-display` | Bebas Neue, letter-spacing 0.05em |
| `.font-heading` | Oswald, uppercase |
| `.font-body` | Open Sans |
| `.text-gradient-fire` | Fire gradient text effect |
| `.text-gradient-sunset` | Sunset gradient (orange → yellow → blue) |
| `.text-gradient-ocean` | Ocean gradient (blue) text effect |

---

## Animations

### Available Animation Classes

| Class | Effect | Duration |
|-------|--------|----------|
| `.animate-flicker` | Torch flame flicker | 2s |
| `.animate-float` | Gentle floating up/down | 3s |
| `.animate-pulse-glow` | Pulsing glow effect | 2s |
| `.animate-gradient` | Shifting gradient background | 3s |
| `.animate-bounce` | Bounce (Tailwind built-in) | 1s |

### Animation Examples

```tsx
// Animated torch icon
<TorchIcon size="lg" animated />

// Floating particle (firefly)
<div className="w-1 h-1 rounded-full bg-primary/50 animate-float" />

// Glowing button on hover
<Button variant="torch" className="animate-pulse-glow">
  Enter the Exchange
</Button>
```

---

## Component Patterns

### Button Variants

The theme includes three Survivor-themed button variants:

| Variant | Appearance | Use For |
|---------|------------|---------|
| `torch` | Orange fire gradient with glow | Primary CTAs, "Enter the Exchange" |
| `ocean` | Blue with shimmer hover | Secondary actions |
| `tribal` | Dark with orange border | Tertiary actions, subtle CTAs |

```tsx
// Primary CTA
<Button variant="torch" size="xl">
  Start Trading Now
</Button>

// Secondary action
<Button variant="outline" size="xl">
  View Contestants
</Button>

// Subtle action
<Button variant="tribal" size="md">
  Learn More
</Button>
```

### Card Styling

Use the tribal card style for feature cards and content sections:

```tsx
<div className="card-tribal p-6">
  {/* Card content */}
</div>
```

The `.card-tribal` class includes:
- Dark jungle background
- Border with subtle glow on hover
- Elevated shadow on hover
- Subtle lift animation

### Navigation Links

```tsx
<Link
  href="/dashboard"
  className="px-4 py-2 font-heading text-sm tracking-wider transition-colors rounded-md hover:bg-primary/10"
>
  Dashboard
</Link>
```

---

## Visual Effects

### Gradient Definitions

| Gradient | CSS Variable | Usage |
|----------|--------------|-------|
| Fire | `--gradient-fire` | Primary CTAs, main headings |
| Ocean | `--gradient-ocean` | Water-themed sections |
| Jungle | `--gradient-jungle` | Background overlays |
| Sunset | `--gradient-sunset` | Accent gradients, text |
| Tribal | `--gradient-tribal` | Section backgrounds |

### Text Gradients

```tsx
<h1 className="text-gradient-fire">SURVIVOR</h1>
<h2 className="text-gradient-sunset">Stock Exchange</h2>
```

### Background Effects

#### Jungle Overlay
Use for hero sections to create depth over background images:

```tsx
<div className="jungle-overlay" />
```

#### Particle Effects (Fireflies)
Add floating particles for atmosphere:

```tsx
{[...Array(20)].map((_, i) => (
  <div
    key={i}
    className="absolute w-1 h-1 rounded-full bg-primary/50 animate-float"
    style={{
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${3 + Math.random() * 2}s`,
    }}
  />
))}
```

### Torch Glow Effect

Apply torch glow to important elements:

```tsx
<div className="torch-glow">
  {/* Content with orange glow shadow */}
</div>
```

---

## Copy & Tone

The writing style should be immersive, energetic, and themed around Survivor.

### Taglines & Headlines

| Current | Survivor-Themed |
|---------|-----------------|
| "Get Started" | "Enter the Exchange" |
| "Sign Up" | "Join the Tribe" |
| "Create Account" | "Start Your Journey" |
| "Ready to Play?" | "READY TO PLAY?" |

### Section Copy Guidelines

1. **Be Dramatic**: Use uppercase for headings
2. **Use Survivor Language**: Words like "tribe," "outlast," "outwit," "immunity"
3. **Be Energetic**: Exciting, action-oriented descriptions
4. **Create Immersion**: Make users feel like they're on the island

### Example Copy

```tsx
// Hero section
<p className="font-body text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
  Trade stocks of your favorite Survivor contestants. Build your portfolio.
  <span className="text-primary font-semibold"> Outwit. Outplay. Out-invest.</span>
</p>

// Features section
<h3 className="font-display text-4xl tracking-wider text-gradient-fire mb-4">
  HOW IT WORKS
</h3>
<p className="font-body text-muted-foreground max-w-xl mx-auto">
  Your strategic investment game for Survivor fans. Track your favorites and compete for glory.
</p>

// CTA section
<p className="font-body text-lg text-muted-foreground max-w-lg mx-auto mb-8">
  Join the ultimate Survivor fantasy game. Trade stocks, earn dividends, and prove you have what it takes to outlast everyone.
</p>
```

### Button Labels

| Context | Label |
|---------|-------|
| Primary signup | "Enter the Exchange" |
| Viewing contestants | "View Contestants" |
| Main CTA | "Start Trading Now" |
| Secondary CTA | "Join Game" |
| Returning users | "Sign In" |

---

## Component Quick Reference

### TorchIcon

```tsx
import { TorchIcon } from "@/components/icons/torch-icon"

// Sizes: sm, md, lg
<TorchIcon size="lg" animated={true} />
```

### Hero Section Template

```tsx
<section className="relative min-h-screen flex items-center justify-center overflow-hidden">
  {/* Background */}
  <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/hero-island-bg.jpg')" }} />
  <div className="absolute inset-0 jungle-overlay" />

  {/* Particles */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Firefly particles here */}
  </div>

  {/* Content */}
  <div className="relative z-10 container mx-auto px-4 text-center">
    <TorchIcon size="lg" animated className="mx-auto mb-8" />
    <h1 className="font-display text-8xl tracking-wider text-gradient-fire">SURVIVOR</h1>
    <h2 className="font-display text-5xl tracking-widest text-secondary">STOCK EXCHANGE</h2>
  </div>
</section>
```

---

## Tips for Maintaining the Theme

1. **Always use tribe colors** for contestant-related badges and indicators
2. **Apply torch glow** to primary CTAs and important actions
3. **Use gradient text** for main headings to create visual impact
4. **Add tribal card styling** to feature cards for consistency
5. **Include particle effects** in hero sections for atmosphere
6. **Use Bebas Neue** for any Survivor-related headings
7. **Keep uppercase** for navigation and secondary headings
8. **Test dark mode** - the theme is dark-first, ensure all text is readable
9. **Add hover animations** - lift, glow, and scale effects add polish
10. **Use the torch icon** as the primary brand element

---

## Tailwind Config Notes

This project uses **Tailwind CSS v3** with custom configuration defined in `tailwind.config.ts`.

### Key Configuration Details

```ts
// tailwind.config.ts
export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-fire': 'linear-gradient(135deg, hsl(25, 100%, 55%) 0%, hsl(45, 100%, 55%) 50%, hsl(25, 100%, 55%) 100%)',
        'gradient-ocean': 'linear-gradient(180deg, hsl(200, 85%, 45%) 0%, hsl(210, 80%, 35%) 100%)',
        'gradient-jungle': 'linear-gradient(180deg, hsl(145, 50%, 25%) 0%, hsl(160, 40%, 15%) 100%)',
        'gradient-sunset': 'linear-gradient(135deg, hsl(25, 95%, 53%) 0%, hsl(35, 100%, 60%) 50%, hsl(195, 85%, 50%) 100%)',
        'gradient-tribal': 'linear-gradient(180deg, hsl(180, 15%, 8%) 0%, hsl(25, 30%, 12%) 100%)',
      },
      keyframes: {
        flicker: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "25%": { opacity: "0.9", transform: "scale(1.02) rotate(1deg)" },
          "50%": { opacity: "1", transform: "scale(0.98) rotate(-1deg)" },
          "75%": { opacity: "0.95", transform: "scale(1.01) rotate(0.5deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(25, 100%, 50% / 0.3)" },
          "50%": { boxShadow: "0 0 40px hsl(25, 100%, 50% / 0.6)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        flicker: "flicker 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        gradient: "gradient-shift 3s ease infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

### PostCSS Configuration

The project uses PostCSS with Tailwind v3 and Autoprefixer. See `postcss.config.mjs`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```
