/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#fafaf7',
          dark: '#0e0d12',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#17161d',
        },
        elevated: {
          DEFAULT: '#f3f1ec',
          dark: '#1f1d27',
        },
        line: {
          DEFAULT: '#e5e2da',
          dark: '#2a2833',
        },
        ink: {
          DEFAULT: '#1a1a1a',
          muted: '#6b6b6b',
          dark: '#ececec',
          'dark-muted': '#9a98a3',
        },
        accent: {
          DEFAULT: '#e94560',
          hover: '#d33850',
        },
        success: '#3aa365',
        warning: '#e0a82e',
        danger: '#d04545',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
        'card-dark': '0 1px 2px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
};
