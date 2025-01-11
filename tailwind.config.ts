import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "background-paper": "var(--background-paper)",
        "primary-main": "var(--primary-main)",
        "primary-light": "var(--primary-light)",
        "primary-dark": "var(--primary-dark)",
        "text-secondary": "var(--text-secondary)",
      },
    },
  },
  plugins: [],
} satisfies Config;
