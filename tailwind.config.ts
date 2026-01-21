
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          dark: '#3B82F6',
        },
        bg: {
          main: '#FFFFFF',
          sub: '#F8FAFC',
          darkMain: '#020617',
          darkSub: '#0F172A',
        },
        text: {
          main: '#0F172A',
          sub: '#475569',
          darkMain: '#E5E7EB',
          darkSub: '#CBD5E1',
        },
        status: {
          draft: '#64748B',
          submitted: '#2563EB',
          reviewing: '#F59E0B',
          needs_fix: '#DC2626',
          approved: '#16A34A',
          rejected: '#991B1B',
          active: '#0D9488',
        }
      }
    }
  },
  plugins: [],
};
export default config;
