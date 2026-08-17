/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  corePlugins: {
    preflight: false, // avoid clashing with PrimeNG's own base styles
  },
  theme: {
    extend: {},
  },
  plugins: [],
}

