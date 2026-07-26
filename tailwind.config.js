/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Category colors (emoji-based)
        'cat-car': '#dc2626',      // red
        'cat-subscriptions': '#a855f7', // purple
        'cat-groceries': '#16a34a', // green
        'cat-entertainment': '#eab308', // yellow
        'cat-going-out': '#ea580c', // orange
        'cat-utilities': '#0284c7', // blue
        'cat-home': '#14b8a6',     // teal
        'cat-other': '#6b7280',    // grey
        // Cozy spring palette
        'warm-cream': '#faf8f3',
        'warm-beige': '#f5ede3',
        'spring-sage': '#c4d4d0',
        'spring-mint': '#d4e8e4',
        'spring-peach': '#f5c2a0',
        'spring-lavender': '#d9c9e8',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
