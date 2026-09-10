/** @type {import('tailwindcss').Config} */
export default {
  important: true,
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'base': ['17px', '1.5'],
        'heading': ['30px', '1.2'],
      },
      colors: {
        brand: {
          green: '#01312d',
          lime: '#b5e853',
          mid: '#2e7d4f',
        },
        surface: {
          panel: '#f5f7f5',
          card: '#ffffff',
          soft: '#eef5ef',
        },
        border: {
          card: '#dfe7e1',
        },
        text: {
          muted: '#6b8478',
        },
        state: {
          disabled: '#c6d4ca',
        },
      },
      borderRadius: {
        card: '16px',
        btn: '14px',
      },
      spacing: {
        rail: '250px',
        summary: '340px',
      },
      screens: {
        tablet: '900px',
        desktop: '1180px',
      },
      maxWidth: {
        content: '760px',
      },
    },
  },
  plugins: [],
};
