/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0f0f23',
          800: '#1a1a2e',
          700: '#16213e',
          600: '#1e2a4a',
          500: '#2a2a4a',
        },
        primary: {
          DEFAULT: '#4361ee',
          hover: '#3a56d4',
          light: '#4361ee20',
        },
        accent: {
          purple: '#7209b7',
          success: '#06d6a0',
          error: '#ef476f',
          warning: '#ffd166',
        },
        text: {
          primary: '#e8e8e8',
          secondary: '#a0a0b8',
          muted: '#6c6c80',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
