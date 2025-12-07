/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- THIS ENABLES DARK MODE
  theme: {
    extend: {
      colors: {
        pastel: {
          bg: '#EBD4F4',
          card: '#FFFFFF',
          pink: '#FFB7B2',
          red: '#FF6961',
          dark: '#4A4A4A',
        },
        // Custom Dark Mode Colors
        midnight: {
          bg: '#2D1B36',      // Deep Purple Background
          card: '#452755',    // Card Background
          text: '#E9D5FF'     // Light Lavender Text
        }
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
      },
      animation: {
        blob: "blob 7s infinite",
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
      },
    },
  },
  plugins: [],
}