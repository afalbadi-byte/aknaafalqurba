import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-cairo)', 'Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
        display: ['var(--font-tajawal)', 'Tajawal', 'Cairo', 'sans-serif'],
        arabic: ['var(--font-amiri)', 'Amiri', 'serif'],
      },
      colors: {
        // الكحلي المؤسسي #0B2135 — اللون الأساسي
        brand: {
          50:  '#f1f4f8',
          100: '#dde4ec',
          200: '#bbc9d8',
          300: '#8ea4bc',
          400: '#5d7a99',
          500: '#3c5a7d',
          600: '#2b4364',
          700: '#1f3450',
          800: '#152740',
          900: '#0e1e34',
          950: '#0b2135',
        },
        // الذهبي الفاخر #B8934B
        gold: {
          50:  '#fbf7ed',
          100: '#f5ead0',
          200: '#ead29c',
          300: '#dcb568',
          400: '#cea049',
          500: '#b8934b',
          600: '#9a7838',
          700: '#7c5e2e',
          800: '#634a27',
          900: '#523d22',
        },
        // أخضر النماء (تيل) #84A59D
        teal: {
          50:  '#f3f7f6',
          100: '#dde8e5',
          200: '#bcd1cb',
          300: '#94b5ad',
          400: '#84a59d',
          500: '#5e8881',
          600: '#496e68',
          700: '#3c5854',
          800: '#324946',
          900: '#2b3e3b',
        },
        // بيج الأصالة #A68B5A
        sand: {
          50:  '#faf7f0',
          100: '#f1ead6',
          200: '#e2d3ab',
          300: '#ceb579',
          400: '#bd9e5e',
          500: '#a68b5a',
          600: '#8b7045',
          700: '#6f5839',
          800: '#5b4831',
          900: '#4c3d2c',
        },
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 4px 16px -2px rgb(0 0 0 / 0.06)',
        card: '0 2px 8px -1px rgb(0 0 0 / 0.06), 0 6px 24px -8px rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
}

export default config
