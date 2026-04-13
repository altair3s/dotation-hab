/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          50:  '#EEF2F7',
          100: '#C8D6E5',
          200: '#8FA8C0',
          400: '#5C7A94',
          500: '#3D5268',
          600: '#243344',
          700: '#1C2B3A',
          800: '#111E29',
        },
        brand: {
          DEFAULT: '#C85A14',
          light:   '#E07030',
          dark:    '#A0460E',
        },
        gold: {
          50:  '#FAEEDA',
          100: '#FAC775',
          200: '#EF9F27',
          400: '#BA7517',
          600: '#854F0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
}
