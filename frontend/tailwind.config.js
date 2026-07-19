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
        darkBg: '#0B0F19',
        electricIndigo: '#6366F1',
        routeTeal: '#0D9488',
        routeCoral: '#F97316',
        routePurple: '#A855F7',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}

