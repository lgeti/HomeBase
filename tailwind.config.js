/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme colors, defined per light/dark mode in src/index.css
        hb: {
          'bg': 'rgb(var(--hb-bg) / <alpha-value>)',
          'surface': 'rgb(var(--hb-surface) / <alpha-value>)',
          'surface2': 'rgb(var(--hb-surface2) / <alpha-value>)',
          'border': 'rgb(var(--hb-border) / <alpha-value>)',
          'input': 'rgb(var(--hb-input) / <alpha-value>)',
          'text': 'rgb(var(--hb-text) / <alpha-value>)',
          'text2': 'rgb(var(--hb-text2) / <alpha-value>)',
          'text3': 'rgb(var(--hb-text3) / <alpha-value>)',
          'primary': 'rgb(var(--hb-primary) / <alpha-value>)',
          'on-primary': 'rgb(var(--hb-on-primary) / <alpha-value>)',
          'primary-tint': 'rgb(var(--hb-primary-tint) / <alpha-value>)',
          'track': 'rgb(var(--hb-track) / <alpha-value>)',
          'handle': 'rgb(var(--hb-handle) / <alpha-value>)',
          'person-b': 'rgb(var(--hb-person-b) / <alpha-value>)',
          'on-cat': 'rgb(var(--hb-on-cat) / <alpha-value>)',
          'danger': 'rgb(var(--hb-danger) / <alpha-value>)',
          'danger-bg': 'rgb(var(--hb-danger-bg) / <alpha-value>)',
          'danger-solid': 'rgb(var(--hb-danger-solid) / <alpha-value>)',
          'on-danger': 'rgb(var(--hb-on-danger) / <alpha-value>)',
          'success': 'rgb(var(--hb-success) / <alpha-value>)',
          'success-bg': 'rgb(var(--hb-success-bg) / <alpha-value>)',
          'warning': 'rgb(var(--hb-warning) / <alpha-value>)',
          'warning-bg': 'rgb(var(--hb-warning-bg) / <alpha-value>)',
          'hero': 'rgb(var(--hb-hero) / <alpha-value>)',
          'on-hero': 'rgb(var(--hb-on-hero) / <alpha-value>)',
          'seg-on': 'rgb(var(--hb-seg-on) / <alpha-value>)',
          'sheet': 'rgb(var(--hb-sheet) / <alpha-value>)',
          'field': 'rgb(var(--hb-field) / <alpha-value>)',
          'on-person-b': 'rgb(var(--hb-on-person-b) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
