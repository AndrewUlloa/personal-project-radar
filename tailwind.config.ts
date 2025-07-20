import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 1. Color Palette Tokens (Updated to Light Theme)
      colors: {
        'pb-background': '#F8F9FA', // Very light grey for the main background
        'pb-surface': '#FFFFFF',    // White for cards, modals, sidebars
        'pb-border': '#E9ECEF',      // Subtle light grey border color
        'pb-ring': '#6F42C1',        // Interactive purple/blue for focus rings

        'pb-foreground': '#212529',  // Dark charcoal for primary text
        'pb-muted': '#6C757D',      // Muted grey for secondary text

        // Semantic & Accent Colors (Retained for App Logic)
        'pb-primary': {
          DEFAULT: '#D4AF37', // Gold for primary CTAs and high scores
          foreground: '#212529', // Dark text for contrast on gold
        },
        'pb-success': {
          DEFAULT: '#10B981', // Emerald for success states
          foreground: '#FFFFFF',
        },
        'pb-danger': {
          DEFAULT: '#EF4444', // Red for low scores and errors
          foreground: '#FFFFFF',
        },
        'pb-warning': {
          DEFAULT: '#F97316', // Orange for mid-tier scores
          foreground: '#FFFFFF',
        },
      },

      // 2. Typography Tokens
      fontSize: {
        'display-lg': ['3rem', { lineHeight: '3.5rem' }],   // 48px / 56px
        'title-md': ['1.5rem', { lineHeight: '2rem' }],     // 24px / 32px
        'body-base': ['1rem', { lineHeight: '1.5rem' }],     // 16px / 24px
        'body-sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px / 20px
      },
      fontFamily: {
        sans: ['Figtree', ...fontFamily.sans],
      },

      // 3. Spacing, Sizing & Radius Tokens
      spacing: {
        'pb-space-1': '0.25rem', // 4px
        'pb-space-2': '0.5rem',  // 8px
        'pb-space-3': '0.75rem', // 12px
        'pb-space-4': '1rem',    // 16px
        'pb-space-5': '1.25rem', // 20px
        'pb-space-6': '1.5rem',  // 24px
        'sidebar': '18rem',      // For the fixed sidebar width
      },
      borderRadius: {
        lg: '0.5rem',
        md: 'calc(0.5rem - 2px)',
        sm: 'calc(0.5rem - 4px)',
      },

      // 4. Animation & Transition Tokens (Revised for Tactical Variation)
      keyframes: {
        // --- For Layered Modals (e.g., Lead-Detail Modal) ---
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up-and-fade-in': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },

        // --- For Multi-Step Flows (e.g., Scan Now Modal) ---
        'cross-fade-and-scale-enter': {
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'cross-fade-and-scale-exit': {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(1.02)' },
        },

        // --- For Delight & Feedback ---
        'bounce-in': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        'wiggle-once': {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        // Backwards compatibility for existing fade-up animations
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        // --- Modal Layer Animations ---
        'modal-backdrop': 'fade-in 200ms ease-out',
        'modal-content': 'slide-up-and-fade-in 300ms ease-out',

        // --- Multi-Step Flow Animations ---
        'step-enter': 'cross-fade-and-scale-enter 250ms ease-out',
        'step-exit': 'cross-fade-and-scale-exit 250ms ease-out',
        
        // --- Delight & Micro-interaction Animations ---
        'delight-bounce': 'bounce-in 400ms ease-out',
        'wiggle-once': 'wiggle-once 200ms ease-in-out',

        // Backwards compatibility animation
        'fade-up': 'fade-up 0.5s ease-out forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;