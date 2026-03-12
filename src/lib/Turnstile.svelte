<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public'

	interface Props {
		token: string
		theme?: 'light' | 'dark' | 'auto'
	}

	// eslint-disable-next-line no-useless-assignment
	let { token = $bindable(''), theme = 'auto' }: Props = $props()

	let container: HTMLDivElement | undefined = $state()
	let widgetId: string | undefined

	/** Resets the Turnstile widget and clears the token. Call this after a failed submission. */
	export function reset() {
		if (widgetId !== undefined && typeof window !== 'undefined' && window.turnstile) {
			window.turnstile.reset(widgetId)
			token = ''
		}
	}

	onMount(() => {
		const tryRender = () => {
			if (!container || !window.turnstile) {
				setTimeout(tryRender, 50)
				return
			}
			widgetId = window.turnstile.render(container, {
				sitekey: PUBLIC_TURNSTILE_SITE_KEY,
				theme,
				callback: (t: string) => {
					token = t
				},
				'expired-callback': () => {
					token = ''
				},
				'error-callback': () => {
					token = ''
				}
			})
		}
		tryRender()
	})

	onDestroy(() => {
		if (widgetId !== undefined && window.turnstile) {
			window.turnstile.remove(widgetId)
		}
	})
</script>

<div bind:this={container}></div>
