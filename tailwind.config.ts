import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        void: {
          950: '#0b121d',
          900: '#111b29',
          850: '#152234',
          800: '#1a283b',
          700: '#26384e',
          600: '#354b66',
        },
        neon: {
          DEFAULT: '#62dce7',
          cyan: '#62dce7',
          blue: '#6b9fea',
          purple: '#9b8cf3',
          pink: '#ee7898',
          lime: '#abd78a',
          amber: '#fbbf24',
          green: '#5cc69b',
          red: '#ef4444',
        },
        surface: {
          DEFAULT: 'rgba(24, 38, 56, 0.82)',
          strong: 'rgba(28, 44, 64, 0.94)',
          light: 'rgba(255, 255, 255, 0.055)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'hero-radial':
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(98, 220, 231, 0.16), transparent 60%), radial-gradient(ellipse 60% 50% at 85% 20%, rgba(155, 140, 243, 0.12), transparent 55%)',
        'card-shine':
          'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0) 55%, rgba(255,255,255,0.04) 100%)',
        'neon-text':
          'linear-gradient(120deg, #62dce7 0%, #9b8cf3 50%, #ee7898 100%)',
        'grid-fade':
          'linear-gradient(to bottom, rgba(98,220,231,0.05), transparent 40%)',
        'bracket-line': 'linear-gradient(to right, #26384e, #354b66)',
      },
      boxShadow: {
        'neon-sm': '0 0 12px rgba(98, 220, 231, 0.15)',
        neon: '0 0 24px rgba(98, 220, 231, 0.22), 0 0 60px rgba(155, 140, 243, 0.12)',
        'neon-lg': '0 0 40px rgba(98, 220, 231, 0.3), 0 0 100px rgba(155, 140, 243, 0.18)',
        card: '0 8px 32px rgba(0, 0, 0, 0.45)',
        'inner-glass': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out both',
        'fade-up': 'fadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in': 'slideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.8s linear infinite',
        pulseGlow: 'pulseGlow 2.6s ease-in-out infinite',
        float: 'float 7s ease-in-out infinite',
        ticker: 'ticker 30s linear infinite',
        marquee: 'marquee 40s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(98,220,231,0.25)' },
          '50%': { boxShadow: '0 0 28px rgba(98,220,231,0.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      screens: {
        xs: '420px',
      },
    },
  },
  plugins: [],
};

export default config;
