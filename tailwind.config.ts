import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#121212",
        panel: "#1A1A1A",
        "panel-2": "#202020",
        ink: "#F4F4F5",
        muted: "#A1A1AA",
        neon: {
          pink: "#FF007F",
          cyan: "#00FFFF",
          lime: "#BFFF00",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        display: ["var(--font-display)", "sans-serif"],
      },
      boxShadow: {
        "neon-pink":
          "0 0 0 1px rgba(255,0,127,0.35), 0 0 24px rgba(255,0,127,0.14)",
        "neon-cyan":
          "0 0 0 1px rgba(0,255,255,0.35), 0 0 24px rgba(0,255,255,0.14)",
        "neon-lime":
          "0 0 0 1px rgba(191,255,0,0.35), 0 0 24px rgba(191,255,0,0.14)",
        panel:
          "0 20px 60px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.03)",
      },
      keyframes: {
        "pulse-neon": {
          "0%, 100%": { boxShadow: "0 0 0 1px rgba(0,255,255,.22)" },
          "50%": {
            boxShadow:
              "0 0 0 1px rgba(0,255,255,.45), 0 0 28px rgba(0,255,255,.16)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "pulse-neon": "pulse-neon 2.8s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
