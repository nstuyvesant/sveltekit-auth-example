import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		sourcemap: true
	},
	plugins: [sveltekit()],
	server: {
		host: 'localhost',
		port: 3000,
		open: 'http://localhost:3000'
	}
})
