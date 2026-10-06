import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090a0f",
        foreground: "#e2e8f0",
        card: {
          DEFAULT: "#0f111a",
          foreground: "#e2e8f0",
        },
        primary: {
          DEFAULT: "#00e5ff",
          foreground: "#002233",
        },
        secondary: {
          DEFAULT: "#161b22",
          foreground: "#e2e8f0",
        },
        accent: {
          DEFAULT: "rgba(0, 229, 255, 0.15)",
          foreground: "#00e5ff",
        },
        muted: {
          DEFAULT: "#1e2230",
          foreground: "#8a96a8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
