import adapter from '@sveltejs/adapter-node'
import preprocess from 'svelte-preprocess'

const production = process.env.NODE_ENV === 'production'

const baseCsp = [
	'self',
	// 'strict-dynamic', // issues with datepicker on classes, add to calendar scripts
	'https://www.gstatic.com/recaptcha/', // recaptcha
	'https://accounts.google.com/gsi/', // sign-in w/google
	'https://www.google.com/recaptcha/', // recapatcha
	'https://fonts.gstatic.com/' // recaptcha fonts
]

if (!production) baseCsp.push('ws://localhost:3000')

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: preprocess(),

	kit: {
		adapter: adapter({
			out: 'build'
		}),
		csp: {
			mode: 'auto',
			directives: {
				'default-src': [...baseCsp],
				'script-src': ['unsafe-inline', ...baseCsp],
				'img-src': ['data:', 'blob:', ...baseCsp],
				'style-src': ['unsafe-inline', ...baseCsp],
				'object-src': ['none'],
				'base-uri': ['self'],
				// 'require-trusted-types-for': ["'script'"] // will require effort to get this working
			}
		},
		vite: {
			serviceWorker: {
				files: (filepath) => !/\.DS_Store/.test(filepath)
			}
		}
	}
}

export default config
