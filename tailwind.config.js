/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1e9e6e', dark: '#167a55', light: '#e6f6ef' },
        ink: { DEFAULT: '#15181d', soft: '#232830' },
        bolt: '#e33d2d',
      },
    },
  },
  plugins: [],
}
