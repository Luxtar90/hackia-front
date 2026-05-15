/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#f0f9f9',
          100: '#d9f2f2',
          200: '#b8e4e5',
          300: '#8cd0d3',
          400: '#5ab3b9',
          500: '#3f979d',
          600: '#347a81',
          700: '#2e6369',
          800: '#2a5156',
          900: '#274549',
          950: '#162b2e',
        },
      },
      animation: {
        'in': 'in 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-from-bottom-2': 'slide-in-from-bottom-2 0.3s ease-out',
      },
      keyframes: {
        'in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-from-bottom-2': {
          '0%': { transform: 'translateY(0.5rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
