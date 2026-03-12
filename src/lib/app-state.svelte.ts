interface Toast {
	title: string
	body: string
	isOpen: boolean
}

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
