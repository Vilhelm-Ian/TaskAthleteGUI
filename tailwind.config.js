// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Adjust if your source files are elsewhere
  ],
  theme: {
    extend: {
      colors: {
      },
      boxShadow: {
        'themed-sm': '0 1px 2px 0 var(--color-shadow)',
        'themed-md': '0 4px 6px -1px var(--color-shadow), 0 2px 4px -2px var(--color-shadow)',
        'themed-lg': '0 10px 15px -3px var(--color-shadow), 0 4px 6px -4px var(--color-shadow)',
        'themed-xl': '0 20px 25px -5px var(--color-shadow), 0 8px 10px -6px var(--color-shadow)',
        'themed-2xl': '0 25px 50px -12px var(--color-shadow)',
        'themed-inner': 'inset 0 2px 4px 0 var(--color-shadow)',
      }
    },
  },
  plugins: [
    // require('@tailwindcss/forms'), // Uncomment if you use this plugin for form styling
  ],
}

