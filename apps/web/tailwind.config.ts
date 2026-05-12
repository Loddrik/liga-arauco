import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Sistema editorial broadcast: tinta casi negra, papel cálido, cancha roja.
        ink: {
          DEFAULT: '#0A0A0A',
          900: '#0A0A0A',
          800: '#1A1A1A',
          700: '#2A2A2A',
          500: '#6B6B6B',
          300: '#B5B5B5',
          100: '#E8E8E5',
        },
        paper: {
          DEFAULT: '#FAFAF7',
          50: '#FFFFFF',
          100: '#FAFAF7',
          200: '#F2F1EC',
          300: '#E5E3DC',
        },
        court: {
          DEFAULT: '#C8102E',
          50: '#FDECEE',
          500: '#C8102E',
          600: '#A30C25',
          700: '#7E091C',
        },
        gold: {
          DEFAULT: '#FFB81C',
        },
        // Legacy aliases para que el admin no se rompa.
        brand: {
          DEFAULT: '#0A0A0A',
          50: '#E8E8E5',
          500: '#0A0A0A',
          900: '#0A0A0A',
        },
        accent: {
          DEFAULT: '#FFB81C',
        },
      },
      letterSpacing: {
        widest: '0.2em',
      },
      boxShadow: {
        card: '0 1px 0 rgba(10,10,10,0.04), 0 8px 24px -16px rgba(10,10,10,0.18)',
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'ticker': 'ticker 60s linear infinite',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'ticker': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
