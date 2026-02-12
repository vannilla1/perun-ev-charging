import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'perun-blue': {
          DEFAULT: '#0099D8',
          dark: '#0077B5',
          light: '#33B5E5',
        },
        'perun-green': {
          DEFAULT: '#8DC63F',
          dark: '#7AB932',
          light: '#A8D86F',
        },
        'perun-orange': {
          DEFAULT: '#F7941D',
          dark: '#E8791C',
          light: '#FFB04D',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '16px',
        sm: '10px',
        lg: '24px',
        xl: '32px',
      },
      boxShadow: {
        'glow': '0 0 20px rgb(0 153 216 / 0.15)',
        'glow-green': '0 0 20px rgb(141 198 63 / 0.2)',
        'glow-orange': '0 0 20px rgb(247 148 29 / 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
