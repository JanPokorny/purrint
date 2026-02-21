/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        ibm: ['"IBM VGA 9x16"', '"Courier New"', "Courier", "monospace"],
      },
    },
  },
  plugins: [],
}
