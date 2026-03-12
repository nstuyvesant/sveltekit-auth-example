/** Represents a toast notification shown to the user. */
interface Toast {
	/** Short heading displayed at the top of the toast. */
	title: string
	/** Main message content of the toast. */
	body: string
	/** Whether the toast is currently visible. */
	isOpen: boolean
}

/**
 * Reactive singleton holding global application state.
 * Access via the exported {@link appState} instance.
 */
class AppState {
	/** Currently logged-in user, undefined when not authenticated */
	user = $state<User | undefined>(undefined)

	/** Toast notification displayed at the top-right of the screen */
	toast = $state<Toast>({ title: '', body: '', isOpen: false })

	/** Whether the Google Identity Services SDK has been initialized */
	googleInitialized = $state(false)
}

/** Singleton application state — import this throughout the app */
export const appState = new AppState()
