import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        jakarta: ["var(--font-jakarta)", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#1D9E75",
          light: "#E1F5EE",
          dark: "#0F6E56",
          darker: "#085041",
        },
      },
    },
  },
  plugins: [],
};

export default config;
