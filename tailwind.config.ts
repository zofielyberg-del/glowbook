
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        border: "var(--border)",
        champagne: {
          50: '#F9F7F2',
          100: '#F2EFE8',
          200: '#E6DFC9',
          300: '#D9CFAB',
          400: '#CCBF8D',
          500: '#C5B358', // Base gold
          600: '#A69542',
          700: '#877833',
          800: '#695C26',
          900: '#4A411B',
        },
        premium: {
          black: '#1A1A1A',
          dark: '#0A0A0A',
          white: '#FFFFFF',
          cream: '#FFFBF5',
        }
      },
      fontFamily: {
        heading: ['var(--font-comfortaa)'],
        body: ['var(--font-outfit)'],
      }
    },
  },
  plugins: [],
};
export default config;
