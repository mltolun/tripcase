/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['Inter', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#F8FAFC',
          900: '#F1F5F9',
          800: '#FFFFFF',
          700: '#E2E8F0',
          600: '#CBD5E1',
        },
        slate: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
          500: '#64748B',
          400: '#94A3B8',
          300: '#CBD5E1',
        },
        amber: {
          400: '#FBBF24',
          300: '#FCD34D',
        },
        sky: {
          400: '#38BDF8',
          500: '#0EA5E9',
        },
        emerald: {
          400: '#34D399',
        },
        rose: {
          400: '#FB7185',
        },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(0,0,0,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
}
