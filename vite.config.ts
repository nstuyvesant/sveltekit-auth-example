import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	build: {
		sourcemap: true
	},
	plugins: [sveltekit(), tailwindcss()],
	test: {
		include: ['src/**/*.unit.test.ts', 'tests/**/*.unit.test.ts']
	},
	server: {
		host: 'localhost',
		port: 3000,
		open: 'http://localhost:3000'
	}
})
