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
        primary: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c7ff',
          400: '#7c94f5',
          500: '#667eea',
          600: '#5568d3',
          700: '#4655b8',
          800: '#3a4694',
          900: '#333d75',
        },
        secondary: {
          500: '#764ba2',
          600: '#6a4391',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 10px 40px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
}
