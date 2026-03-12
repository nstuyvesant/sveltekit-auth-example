import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

const production = process.env.NODE_ENV === 'production'

const baseCsp = [
	'self',
	'https://www.gstatic.com/recaptcha/', // recaptcha
	'https://accounts.google.com/gsi/', // sign-in w/google
	'https://www.google.com/recaptcha/', // recapatcha
	'https://fonts.gstatic.com/', // recaptcha fonts
	'https://challenges.cloudflare.com/' // turnstile
]

if (!production) baseCsp.push('ws://localhost:3000')

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		vitePreprocess(),
		{
			name: 'announcer-styles-to-tailwind',
			markup: ({ content: code }) => {
				code = code.replace(
					/(<div id="svelte-announcer"[^>]*?)\s+style="[^"]*"/,
					'$1 class="tw:absolute tw:left-0 tw:top-0 tw:[clip:rect(0,0,0,0)] tw:[clip-path:inset(50%)] tw:overflow-hidden tw:whitespace-nowrap tw:w-px tw:h-px"'
				)
				return { code }
			}
		}
	],

	kit: {
		adapter: adapter({
			out: 'build'
		}),
		csp: {
			mode: 'auto',
			directives: {
				'default-src': [...baseCsp],
				'script-src': [...baseCsp],
				'img-src': ['data:', 'blob:', ...baseCsp],
				'style-src': ['unsafe-inline', ...baseCsp],
				'object-src': ['none'],
				'base-uri': ['self'],
				'frame-src': ['https://challenges.cloudflare.com/', 'https://accounts.google.com/']
			}
		},
		files: {
			serviceWorker: 'src/service-worker.ts'
		}
	}
}

export default config
