/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand tokens — kept minimal and semantic so the UI stays cohesive.
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#b5d4ff',
          300: '#84b6ff',
          400: '#5290ff',
          500: '#2f6ef7',
          600: '#1e54db',
          700: '#1a43b0',
          800: '#1a3a8a',
          900: '#1b3470',
        },
        surface: {
          DEFAULT: '#ffffff',
          subtle: '#f7f8fb',
          muted: '#eef0f5',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        focus: '0 0 0 3px rgba(47, 110, 247, 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 220ms ease-out',
        shimmer: 'shimmer 1.4s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(2px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
    },
  },
  plugins: [],
};
