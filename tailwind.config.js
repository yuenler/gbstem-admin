/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      spacing: {
        // dynamic
        'd/2': 'calc((100vw + 5rem) / 21 / 2)',
        d: 'calc((100vw + 5rem) / 21)',
        '2d': 'calc(2 * (100vw + 5rem) / 21)',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
}
