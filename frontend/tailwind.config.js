/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        lavender: {
          50: '#F7F5FC',
          100: '#EDE9F7',
          200: '#D9D1EE',
          300: '#C0B4E4',
          400: '#A597D8',
          500: '#8B7BC8',
          600: '#7C6BAE',
          700: '#6B5A97',
          800: '#5A4A7F',
          900: '#3D3558',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 15px rgba(124, 107, 174, 0.1)',
        card: '0 4px 24px rgba(124, 107, 174, 0.12)',
        hover: '0 8px 32px rgba(124, 107, 174, 0.2)',
      },
    },
  },
  plugins: [],
};
