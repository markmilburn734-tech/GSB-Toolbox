/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': '#573960',
        'brand2': '#573960',
        'brand3': '#ff3154',
        'brand4': '#ff3154',
        'brand5': '#ff3154',
        'brand6': '#816a88',
      },
    },
  },
  plugins: [],
}