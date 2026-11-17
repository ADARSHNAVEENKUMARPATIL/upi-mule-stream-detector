/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'streaming-red': '#E50914',
        'streaming-red-dark': '#B80710',
        'cinema-black': '#000000',
        'cinema-card': '#141414',
        'cinema-border': '#262626',
        'dark-grey': '#222222',
        'light-grey': '#CCCCCC',
        'cinema-gold': '#FFD700',
        'cinema-purple': '#800080',
        'cinema-blue': '#0000FF',
      },
      fontFamily: {
        sans: ['Helvetica', 'Arial', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'cinema-glow': '0 0 25px rgba(229, 9, 20, 0.35)',
        'cinema-glow-lg': '0 0 45px rgba(229, 9, 20, 0.55)',
        'cinema-card': '0 8px 24px rgba(0, 0, 0, 0.7)',
        'inset-dark': 'inset 0 0 20px rgba(0, 0, 0, 0.8)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'cinematic-glow': 'glow 4s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { opacity: '0.4' },
          '100%': { opacity: '0.8' },
        }
      }
    },
  },
  plugins: [],
}
