/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pulse: {
          dark: "#0f172a",
          darker: "#020617",
          accent: "#38bdf8",
          positive: "#22c55e",
          negative: "#ef4444",
          warning: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};
