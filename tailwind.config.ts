import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        felt: {
          DEFAULT: 'hsl(var(--felt))',
          light: 'hsl(var(--felt-light))',
        },
        gold: {
          DEFAULT: 'hsl(var(--gold))',
          muted: 'hsl(var(--gold-muted))',
        },
        'playing-face': 'hsl(var(--playing-card-face))',
        'playing-face-border': 'hsl(var(--playing-card-face-border))',
        'playing-face-hearts': 'hsl(var(--playing-card-face-hearts))',
        'playing-face-clubs': 'hsl(var(--playing-card-face-clubs))',
        'playing-face-diamonds': 'hsl(var(--playing-card-face-diamonds))',
        'playing-face-spades': 'hsl(var(--playing-card-face-spades))',
        'playing-face-border-hearts': 'hsl(var(--playing-card-face-border-hearts))',
        'playing-face-border-clubs': 'hsl(var(--playing-card-face-border-clubs))',
        'playing-face-border-diamonds':
          'hsl(var(--playing-card-face-border-diamonds))',
        'playing-face-border-spades': 'hsl(var(--playing-card-face-border-spades))',
        'playing-back-from': 'hsl(var(--playing-card-back-from))',
        'playing-back-to': 'hsl(var(--playing-card-back-to))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config
