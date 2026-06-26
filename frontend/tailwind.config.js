/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: "#6C3FC8",
          "purple-hover": "#7D52D8",
          "purple-glow": "#8B5DE8",
          "purple-dim": "#4A2B9A",
          gold: "#E8A930",
          "gold-hover": "#F0B840",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
