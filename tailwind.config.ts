import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f8fbff",
        navy: "#07111f",
        panel: "#0c1a2d",
        cyan: "#22d3ee",
        teal: "#2dd4bf",
        lime: "#a3e635",
      },
      boxShadow: {
        glow: "0 0 50px rgba(34, 211, 238, .16)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
