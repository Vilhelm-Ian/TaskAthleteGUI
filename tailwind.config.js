/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Adjust if needed
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

# Configure PostCSS (postcss.config.js - usually generated correctly)
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
