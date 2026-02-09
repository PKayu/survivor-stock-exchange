import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        heading: ["var(--font-heading)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Tribe colors for stocks
        tribe: {
          orange: "hsl(var(--tribe-orange))",
          blue: "hsl(var(--tribe-blue))",
          green: "hsl(var(--tribe-green))",
          yellow: "hsl(var(--tribe-yellow))",
          purple: "hsl(var(--tribe-purple))",
          red: "hsl(var(--tribe-red))",
        },
        // Special colors
        torch: "hsl(var(--torch-glow))",
        ocean: "hsl(var(--ocean-shimmer))",
        sand: "hsl(var(--sand))",
        jungle: "hsl(var(--jungle-dark))",
        fire: {
          orange: "hsl(var(--fire-orange))",
          yellow: "hsl(var(--fire-yellow))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
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
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        flicker: "flicker 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-up": "slide-up 0.6s ease-out forwards",
        gradient: "gradient-shift 3s ease infinite",
      },
      backgroundImage: {
        "gradient-fire": "linear-gradient(135deg, hsl(25, 100%, 55%) 0%, hsl(45, 100%, 55%) 50%, hsl(25, 100%, 55%) 100%)",
        "gradient-ocean": "linear-gradient(180deg, hsl(200, 85%, 45%) 0%, hsl(210, 80%, 35%) 100%)",
        "gradient-jungle": "linear-gradient(180deg, hsl(145, 50%, 25%) 0%, hsl(160, 40%, 15%) 100%)",
        "gradient-sunset": "linear-gradient(135deg, hsl(25, 95%, 53%) 0%, hsl(35, 100%, 60%) 50%, hsl(195, 85%, 50%) 100%)",
        "gradient-tribal": "linear-gradient(180deg, hsl(180, 15%, 8%) 0%, hsl(25, 30%, 12%) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
