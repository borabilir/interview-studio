import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--subtle) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        background: 'rgb(var(--canvas) / <alpha-value>)',
        card: 'rgb(var(--panel) / <alpha-value>)',
        foreground: 'rgb(var(--ink) / <alpha-value>)',
        border: 'rgb(var(--line) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(255 255 255 / <alpha-value>)',
        },
        ring: 'rgb(var(--accent) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui'],
        mono: ['DM Mono', 'ui-monospace', 'SFMono-Regular'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(17 24 39 / 0.03), 0 12px 30px rgb(17 24 39 / 0.05)',
        float: '0 12px 40px rgb(17 24 39 / 0.12)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      keyframes: {
        'soft-pulse': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '.55' } },
      },
      animation: { 'soft-pulse': 'soft-pulse 2.2s ease-in-out infinite' },
    },
  },
  plugins: [],
} satisfies Config
