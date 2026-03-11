import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: './tests',
	testMatch: '**/*.e2e.test.ts',
	use: {
		baseURL: 'http://localhost:3000'
	},
	webServer: {
		// In local dev, use the same dev server you run manually.
		// In CI, fall back to a production-like preview build.
		command: process.env.CI
			? 'yarn build && yarn preview -- --port 3000'
			: 'yarn dev -- --port 3000',
		env: {
			...process.env,
			E2E_BYPASS_RECAPTCHA: 'true',
			E2E_BRAINTREE_UNIQUE_ORDER_ID: 'true'
		},
		url: 'http://localhost:3000',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
})
