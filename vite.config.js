import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit(), tailwindcss()],
  server: {
    watch: {
      ignored: ['**/__tests__/**', '**/cypress/**'],
    },
  },
}

export default config
