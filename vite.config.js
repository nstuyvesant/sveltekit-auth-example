import { sveltekit } from '@sveltejs/kit/vite'

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],
	serviceWorker: {
		files: (filepath) => !/\.DS_Store/.test(filepath)
	},
	server: {
		host: 'localhost',
		port: 3000,
		open: 'http://localhost:3000'
	}
}

export default config
