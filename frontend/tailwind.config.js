/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#334155',
          600: '#1e293b',
          700: '#0f172a',
          800: '#090d16',
          900: '#020617',
          950: '#000000',
        },
        vitrine: {
          bg: '#fafafa',
          surface: '#ffffff',
          border: '#e5e5e5',
          dark: '#171717',
          muted: '#737373',
          accent: '#262626',
        }
      },
      fontFamily: {
        sans: ['"Times New Roman"', 'Times', 'Georgia', 'serif'],
        serif: ['"Times New Roman"', 'Times', 'Georgia', 'serif'],
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.05)',
        'vitrine': '0 10px 30px -10px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
