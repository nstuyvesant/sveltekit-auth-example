import devtoolsJson from 'vite-plugin-devtools-json'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vitest/config'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	build: { sourcemap: process.env.NODE_ENV !== 'production' },
	plugins: [sveltekit(), tailwindcss(), devtoolsJson()],
	test: {
		include: ['src/**/*.unit.test.ts', 'tests/**/*.unit.test.ts']
	},
	server: { host: 'localhost', port: 3000, open: 'http://localhost:3000' }
})
