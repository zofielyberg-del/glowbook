
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
          50: '#F9F9F8',
          100: '#F5E2C1',
          200: '#EAE8E2',
          300: '#D9CFAB',
          400: '#CCBF8D',
          500: '#C2A26A', // Core gold color
          600: '#A38652',
          700: '#856C3D',
          800: '#69552E',
          900: '#4D3E1F',
        },
        gold: {
          solid: '#C2A26A',
        },
        premium: {
          black: '#0B0B0C',
          dark: '#141416',
          white: '#FFFFFF',
          cream: '#F9F9F8',
        }
      },
      fontFamily: {
        heading: ['var(--font-cormorant)', '"Cormorant Garamond"', '"Didot"', '"Bodoni MT"', '"Playfair Display"', 'Georgia', 'serif'],
        serif: ['var(--font-cormorant)', '"Cormorant Garamond"', '"Didot"', '"Bodoni MT"', '"Playfair Display"', 'Georgia', 'serif'],
        cormorant: ['var(--font-cormorant)', '"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
export default config;
